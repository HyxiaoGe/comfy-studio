#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ComfyUI 批量生图流水线 —— SDXL
用法：
    python -m core.image_runner --images presets/kitchen_cat_images.json
"""

import argparse
import copy
import os
import sys
import uuid

from core.comfy_client import (
    DEFAULT_SERVER,
    download_outputs,
    ensure_api_workflow,
    list_workflow_nodes,
    load_json,
    node_title,
    queue_prompt,
    text_key,
    text_nodes,
    wait_history,
)

DEFAULT_TIMEOUT = 600
POLL_INTERVAL = 5
DEFAULT_SEED = 42


def pick_prompt_nodes(workflow, pinned_pos=None, pinned_neg=None):
    """自动识别正/负提示词节点。"""
    ensure_api_workflow(workflow)
    candidates = text_nodes(workflow)
    if not candidates:
        raise RuntimeError("workflow 里找不到带 text/prompt 输入的节点")

    def find(pinned, word, key_name):
        if pinned is not None:
            for node_id, node in candidates:
                if node_id == str(pinned):
                    return node_id, node
            raise RuntimeError(
                "配置里的 %s %r 不在 workflow 的 text 节点里，可用 --list-nodes 查看"
                % (key_name, pinned)
            )
        for node_id, node in candidates:
            if word in node_title(node).lower():
                return node_id, node
        return None

    pos = find(pinned_pos, "positive", "prompt_node")
    neg = find(pinned_neg, "negative", "negative_node")
    if pos is None:
        text_encode = [
            (i, n) for i, n in candidates if "TextEncode" in (n.get("class_type") or "")
        ]
        pool = text_encode or candidates
        pos = max(pool, key=lambda kv: len(kv[1]["inputs"].get(text_key(kv[1])) or ""))
    if neg is None:
        rest = [(i, n) for i, n in candidates if i != pos[0]]
        if len(candidates) == 2 and rest:
            neg = rest[0]
    return pos, neg


def build_image_workflow(template, image, pos_id, neg_id, seed, negative_prompt):
    wf = copy.deepcopy(template)
    node = wf[pos_id]
    node["inputs"][text_key(node) or "text"] = image["prompt"]
    if neg_id is not None and negative_prompt:
        nnode = wf[neg_id]
        nnode["inputs"][text_key(nnode) or "text"] = negative_prompt
    for n in wf.values():
        if not isinstance(n, dict):
            continue
        inputs = n.get("inputs") or {}
        if isinstance(inputs.get("seed"), int):
            inputs["seed"] = seed
        if isinstance(inputs.get("noise_seed"), int):
            inputs["noise_seed"] = seed
        if isinstance(inputs.get("filename_prefix"), str):
            inputs["filename_prefix"] = image["id"]
    return wf


def main(argv=None):
    ap = argparse.ArgumentParser(description="ComfyUI 批量生图流水线 —— SDXL")
    ap.add_argument("--images", default="presets/kitchen_cat_images.json", help="图片清单 JSON")
    ap.add_argument("--workflow", default=None, help="API 格式 workflow 路径")
    ap.add_argument("--list-nodes", action="store_true", help="只列出 workflow 节点")
    ap.add_argument("--dry-run", action="store_true", help="只校验配置不提交")
    ap.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT, help="单张超时秒数")
    args = ap.parse_args(argv)

    cfg = load_json(args.images)
    images = cfg.get("images") or []
    if not images:
        print("清单里没有图片（images 为空）", file=sys.stderr)
        return 2

    server = cfg.get("server") or DEFAULT_SERVER
    workflow_path = args.workflow or cfg.get("workflow") or "workflows/sdxl_image_api.json"
    template = load_json(workflow_path)

    if args.list_nodes:
        list_workflow_nodes(template)
        return 0

    (pos_id, pos_node), neg = pick_prompt_nodes(
        template, cfg.get("prompt_node"), cfg.get("negative_node")
    )
    neg_id = neg[0] if neg is not None else None
    negative_prompt = cfg.get("negative_prompt") or ""

    out_dir = cfg.get("out_dir") or os.path.join("outputs", "images")
    os.makedirs(out_dir, exist_ok=True)
    client_id = str(uuid.uuid4())
    done, failed = [], []

    for i, image in enumerate(images):
        seed = image.get("seed")
        if not isinstance(seed, int) or isinstance(seed, bool):
            seed = DEFAULT_SEED
        wf = build_image_workflow(
            template, image, pos_id, neg_id, seed,
            image.get("negative_prompt") or negative_prompt,
        )
        print("[%d/%d] %s：seed=%d" % (i + 1, len(images), image["id"], seed))
        if args.dry_run:
            done.append(image["id"])
            continue
        try:
            prompt_id = queue_prompt(server, wf, client_id)
            entry = wait_history(server, prompt_id, args.timeout, POLL_INTERVAL)
            saved = download_outputs(
                server, entry, out_dir, image["id"], media_keys=("images",), overwrite=True
            )
            done.append(image["id"])
            print("  %s 完成：%s" % (image["id"], ", ".join(saved)))
        except Exception as e:  # noqa: BLE001
            failed.append((image["id"], str(e)))
            print("  %s 失败：%s" % (image["id"], e), file=sys.stderr)

    print("\n完成 %d/%d，失败 %d" % (len(done), len(images), len(failed)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
