#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ComfyUI 公共客户端（纯 Python 标准库）
封装 HTTP 请求、工作流节点自动识别、队列提交、历史轮询与产物下载。
"""

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

DEFAULT_SERVER = "http://127.0.0.1:8188"


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def http_json(method, url, payload=None, timeout=60):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise RuntimeError("HTTP %s %s 失败：%s" % (e.code, url, body[:500])) from e


def http_get_bytes(url, timeout=300):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return resp.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise RuntimeError("HTTP %s %s 失败：%s" % (e.code, url, body[:500])) from e


def check_comfyui_health(server=DEFAULT_SERVER, timeout=3):
    try:
        with urllib.request.urlopen(server.rstrip("/") + "/", timeout=timeout) as resp:
            return resp.status == 200
    except Exception:  # noqa: BLE001
        return False


def text_key(node):
    """返回节点里存放提示词的输入字段名：优先 text，其次 prompt。"""
    inputs = node.get("inputs") or {}
    if isinstance(inputs.get("text"), str):
        return "text"
    if isinstance(inputs.get("prompt"), str):
        return "prompt"
    return None


def text_nodes(workflow):
    """返回所有 inputs 里带 str 类型 text/prompt 的节点：[(node_id, node), ...]。"""
    found = []
    for node_id, node in workflow.items():
        if not isinstance(node, dict):
            continue
        if text_key(node) is not None:
            found.append((node_id, node))
    return found


def node_title(node):
    return (node.get("_meta") or {}).get("title") or ""


def ensure_api_workflow(workflow, label="workflow"):
    if isinstance(workflow, dict) and "nodes" in workflow and "links" in workflow:
        raise RuntimeError(
            "%s 是普通保存的 workflow 格式（带 nodes/links），不是 Workflow -> Export (API) "
            "导出的 API 格式——请在 ComfyUI 里点 Workflow -> Export (API) 重新导出" % label
        )


def list_workflow_nodes(workflow):
    ensure_api_workflow(workflow)
    print("workflow 里的节点（带 * 的是能填提示词的 text/prompt 节点）：")
    for node_id in sorted(workflow, key=lambda x: (len(x), x)):
        node = workflow[node_id]
        if not isinstance(node, dict):
            continue
        inputs = node.get("inputs") or {}
        marks = []
        title = node_title(node)
        if title:
            marks.append("标题=%r" % title)
        if isinstance(inputs.get("text"), str):
            marks.append("text=%r" % (inputs["text"][:40],))
        elif isinstance(inputs.get("prompt"), str):
            marks.append("prompt=%r" % (inputs["prompt"][:40],))
        if "seed" in inputs:
            marks.append("seed")
        if "noise_seed" in inputs:
            marks.append("noise_seed")
        if "filename_prefix" in inputs:
            marks.append("filename_prefix=%r" % (inputs.get("filename_prefix"),))
        star = "*" if text_key(node) else " "
        print("  %s [%s] %-28s %s" % (star, node_id, node.get("class_type"), " ".join(marks)))


def queue_prompt(server, workflow, client_id):
    resp = http_json(
        "POST",
        server.rstrip("/") + "/prompt",
        {"prompt": workflow, "client_id": client_id},
    )
    if resp.get("node_errors"):
        raise RuntimeError(
            "ComfyUI 拒收 workflow：%s"
            % json.dumps(resp["node_errors"], ensure_ascii=False)[:800]
        )
    prompt_id = resp.get("prompt_id")
    if not prompt_id:
        raise RuntimeError("ComfyUI 没返回 prompt_id：%s" % (resp,))
    return prompt_id


def wait_history(server, prompt_id, timeout=600, poll_interval=5):
    """轮询 /history 直到任务完成，返回 history 条目。"""
    deadline = time.time() + timeout
    while True:
        hist = http_json("GET", "%s/history/%s" % (server.rstrip("/"), prompt_id))
        entry = hist.get(prompt_id)
        if entry:
            status = entry.get("status") or {}
            status_str = status.get("status_str")
            if status_str == "success" and status.get("completed"):
                return entry
            if status_str == "error":
                msgs = status.get("messages") or []
                raise RuntimeError(
                    "ComfyUI 执行报错：%s" % json.dumps(msgs, ensure_ascii=False)[:800]
                )
        if time.time() > deadline:
            raise RuntimeError("等了 %s 秒还没跑完，已超时" % timeout)
        time.sleep(poll_interval)


def download_outputs(server, entry, out_dir, file_id, media_keys=("images",), overwrite=True):
    """从 history 条目下载生成的图片或视频文件，返回本地文件路径列表。"""
    os.makedirs(out_dir, exist_ok=True)
    if overwrite:
        for old_ext in (".mp4", ".webm", ".gif", ".png", ".jpg", ".webp", ".mp3", ".flac", ".wav"):
            old_path = os.path.join(out_dir, file_id + old_ext)
            if os.path.exists(old_path):
                os.remove(old_path)

    saved = []
    outputs = entry.get("outputs") or {}
    for node_id, node_out in outputs.items():
        for key in media_keys:
            for item in node_out.get(key) or []:
                filename = item.get("filename")
                if not filename:
                    continue
                subfolder = item.get("subfolder") or ""
                ftype = item.get("type") or "output"
                url = "%s/view?%s" % (
                    server.rstrip("/"),
                    urllib.parse.urlencode(
                        {"filename": filename, "subfolder": subfolder, "type": ftype}
                    ),
                )
                data = http_get_bytes(url)
                default_ext = (
                    ".mp3"
                    if key == "audio"
                    else (".mp4" if key in ("videos", "gifs") else ".png")
                )
                ext = os.path.splitext(filename)[1] or default_ext
                local = os.path.join(out_dir, file_id + ext)
                n = 2
                while os.path.exists(local):
                    local = os.path.join(out_dir, "%s_%d%s" % (file_id, n, ext))
                    n += 1
                with open(local, "wb") as f:
                    f.write(data)
                saved.append(local)
                print("  已保存 %s（来自节点 %s）" % (local, node_id))

    if not saved:
        raise RuntimeError("任务完成但 history 里没有输出文件——请检查 SaveImage/SaveVideo 节点")
    return saved
