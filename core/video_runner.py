#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ComfyUI 批量分镜出片流水线 —— MiniMax H3 + FFmpeg 无损拼接
用法：
    python -m core.video_runner --shots presets/kitchen_cat_shots.json
"""

import argparse
import copy
import os
import random
import subprocess
import sys
import uuid

from core.comfy_client import (
    DEFAULT_SERVER,
    download_outputs,
    ensure_api_workflow,
    list_workflow_nodes,
    load_json,
    queue_prompt,
    text_key,
    text_nodes,
    wait_history,
)

DEFAULT_TIMEOUT = 1800
POLL_INTERVAL = 10


def pick_prompt_node(workflow, pinned_id=None):
    ensure_api_workflow(workflow)
    candidates = text_nodes(workflow)
    if not candidates:
        raise RuntimeError("workflow 里找不到带 text/prompt 输入的节点")
    if pinned_id is not None:
        for node_id, node in candidates:
            if node_id == str(pinned_id):
                return node_id, node
        raise RuntimeError("prompt_node %r 不在 workflow 节点里" % (pinned_id,))
    text_encode = [
        (i, n) for i, n in candidates if "TextEncode" in (n.get("class_type") or "")
    ]
    pool = text_encode or candidates
    return max(pool, key=lambda kv: len(kv[1]["inputs"].get(text_key(kv[1])) or ""))


def build_shot_workflow(template, shot, prompt_node_id, seed):
    wf = copy.deepcopy(template)
    node = wf[prompt_node_id]
    node["inputs"][text_key(node) or "text"] = shot["prompt"]
    for n in wf.values():
        if not isinstance(n, dict):
            continue
        inputs = n.get("inputs") or {}
        if isinstance(inputs.get("seed"), int):
            inputs["seed"] = seed
        if isinstance(inputs.get("noise_seed"), int):
            inputs["noise_seed"] = seed
        if isinstance(inputs.get("filename_prefix"), str):
            inputs["filename_prefix"] = shot["id"]
    return wf


def _aspect_selector_label(width, height):
    """将画幅像素尺寸映射为 ComfyUI ResolutionSelector 支持的比例标签。"""
    try:
        w = int(width or 1344)
        h = int(height or 768)
    except (TypeError, ValueError):
        return "16:9 (Widescreen)"
    if w <= 0 or h <= 0:
        return "16:9 (Widescreen)"
    ratio = w / h
    choices = [
        (16 / 9, "16:9 (Widescreen)"),
        (9 / 16, "9:16 (Portrait Widescreen)"),
        (1.0, "1:1 (Square)"),
        (4 / 3, "4:3 (Standard)"),
        (3 / 4, "3:4 (Portrait Standard)"),
    ]
    return min(choices, key=lambda item: abs(item[0] - ratio))[1]


def build_video_workflow(
    template,
    prompt,
    seed=42,
    duration=5.0,
    width=1344,
    height=768,
    first_frame_name=None,
    filename_prefix="video/comfy_studio",
    megapixels=0.4,
):
    """基于 MiniMax H3 API 模板构建文生视频或图生视频（first_frame）工作流。"""
    wf = copy.deepcopy(template)
    prompt_node_id, prompt_node = pick_prompt_node(wf)
    prompt_node["inputs"][text_key(prompt_node) or "prompt"] = (prompt or "").strip()

    try:
        dur = max(3.0, min(10.0, float(duration or 5.0)))
    except (TypeError, ValueError):
        dur = 5.0
    try:
        seed_val = max(0, int(seed))
    except (TypeError, ValueError):
        seed_val = 42

    aspect_label = _aspect_selector_label(width, height)
    first_frame_node_id = "m2_first_frame"
    if first_frame_name:
        wf[first_frame_node_id] = {
            "inputs": {"image": first_frame_name},
            "class_type": "LoadImage",
            "_meta": {"title": "加载首帧图"},
        }

    for node_id, n in list(wf.items()):
        if not isinstance(n, dict):
            continue
        cls = n.get("class_type") or ""
        inputs = n.get("inputs") or {}
        title = ((n.get("_meta") or {}).get("title") or "").lower()
        if cls == "ResolutionSelector":
            inputs["aspect_ratio"] = aspect_label
            inputs["megapixels"] = float(megapixels or 0.4)
            inputs["multiple"] = 32
        elif cls == "PrimitiveFloat" and ("duration" in title or node_id == "140:133"):
            inputs["value"] = dur
        elif cls == "MiniMaxH3ImageToVideo":
            if first_frame_name:
                inputs["first_frame"] = [first_frame_node_id, 0]
            else:
                inputs.pop("first_frame", None)
        if isinstance(inputs.get("seed"), int):
            inputs["seed"] = seed_val
        if isinstance(inputs.get("noise_seed"), int):
            inputs["noise_seed"] = seed_val
        if isinstance(inputs.get("filename_prefix"), str):
            inputs["filename_prefix"] = filename_prefix

    return wf


def concat_with_ffmpeg(files, final_path):
    concat_list = os.path.join(os.path.dirname(final_path), "concat.txt")
    with open(concat_list, "w", encoding="utf-8") as f:
        for p in files:
            f.write("file '%s'\n" % os.path.basename(p))
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_list, "-c", "copy", final_path]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError("ffmpeg 拼接失败：%s" % (r.stderr or "")[-500:])
    return final_path


def main(argv=None):
    ap = argparse.ArgumentParser(description="ComfyUI 批量分镜出片流水线")
    ap.add_argument("--shots", default="presets/kitchen_cat_shots.json", help="分镜清单 JSON")
    ap.add_argument("--workflow", default=None, help="API 格式 workflow 路径")
    ap.add_argument("--list-nodes", action="store_true", help="只列出 workflow 节点")
    ap.add_argument("--dry-run", action="store_true", help="只校验配置不提交")
    ap.add_argument("--no-concat", action="store_true", help="不自动拼接 final.mp4")
    ap.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT, help="单分镜超时秒数")
    args = ap.parse_args(argv)

    cfg = load_json(args.shots)
    shots = cfg.get("shots") or []
    if not shots:
        print("清单里没有分镜（shots 为空）", file=sys.stderr)
        return 2

    server = cfg.get("server") or DEFAULT_SERVER
    workflow_path = args.workflow or cfg.get("workflow") or "workflows/minimax_h3_video.json"
    template = load_json(workflow_path)

    if args.list_nodes:
        list_workflow_nodes(template)
        return 0

    prompt_node_id, prompt_node = pick_prompt_node(template, cfg.get("prompt_node"))
    key = text_key(prompt_node)
    print("提示词填进节点 [%s] %s（字段：%s）" % (prompt_node_id, prompt_node.get("class_type"), key))

    # 默认按剧本文件名建立独立输出子目录，防止不同任务相互覆盖
    task_name = os.path.splitext(os.path.basename(args.shots))[0]
    out_dir = cfg.get("out_dir") or os.path.join("outputs", "videos", task_name)
    os.makedirs(out_dir, exist_ok=True)
    client_id = str(uuid.uuid4())
    rng = random.Random()
    done, failed = [], []

    for i, shot in enumerate(shots):
        seed = shot.get("seed")
        if not isinstance(seed, int) or isinstance(seed, bool):
            seed = rng.randrange(0, 2 ** 31)
        wf = build_shot_workflow(template, shot, prompt_node_id, seed)
        print("[%d/%d] %s：seed=%d" % (i + 1, len(shots), shot["id"], seed))
        if args.dry_run:
            done.append(shot["id"])
            continue
        try:
            prompt_id = queue_prompt(server, wf, client_id)
            print("  已提交，prompt_id=%s，等待生成…" % prompt_id)
            entry = wait_history(server, prompt_id, args.timeout, POLL_INTERVAL)
            saved = download_outputs(
                server,
                entry,
                out_dir,
                shot["id"],
                media_keys=("videos", "gifs", "images"),
                overwrite=True,
            )
            done.append(shot["id"])
            print("  %s 完成：%s" % (shot["id"], ", ".join(saved)))
        except Exception as e:  # noqa: BLE001
            failed.append((shot["id"], str(e)))
            print("  %s 失败：%s" % (shot["id"], e), file=sys.stderr)

    print("\n完成 %d/%d，失败 %d" % (len(done), len(shots), len(failed)))
    if failed or args.dry_run or args.no_concat:
        return 1 if failed else 0

    mp4s = [os.path.join(out_dir, s["id"] + ".mp4") for s in shots]
    mp4s = [p for p in mp4s if os.path.exists(p)]
    if len(mp4s) < 2:
        print("少于 2 个 mp4，跳过拼接。")
        return 0
    try:
        final_path = os.path.join(out_dir, "final.mp4")
        concat_with_ffmpeg(mp4s, final_path)
        print("已拼成 %s（%d 个片段）" % (final_path, len(mp4s)))
    except Exception as e:  # noqa: BLE001
        print("拼接失败：%s" % e)
    return 0


if __name__ == "__main__":
    sys.exit(main())
