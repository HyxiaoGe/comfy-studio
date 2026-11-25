#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Comfy Studio 本地 Web 工作台与 HTTP API 服务
启动：
    D:\ComfyUI\python_embeded\python.exe server.py
"""

import argparse
import json
import mimetypes
import os
import queue
import sys
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from core.comfy_client import (  # noqa: E402
    DEFAULT_SERVER,
    check_comfyui_health,
    download_outputs,
    load_json,
    queue_prompt,
    wait_history,
)
from core.image_runner import (  # noqa: E402
    DEFAULT_SEED,
    DEFAULT_TIMEOUT,
    build_image_workflow,
    pick_prompt_nodes,
)

COMFYUI = DEFAULT_SERVER
WORKFLOW_PATH = os.path.join(BASE_DIR, "workflows", "sdxl_image_api.json")
WEB_INDEX_PATH = os.path.join(BASE_DIR, "web", "index.html")
OUT_DIR = os.path.join(BASE_DIR, "outputs", "images")
CLIENT_ID = str(uuid.uuid4())

jobs = {}
jobs_lock = threading.Lock()
job_queue = queue.Queue()


def public_job(job):
    return {
        "id": job["id"],
        "status": job["status"],
        "done": job["done"],
        "total": job["total"],
        "current_index": job["current_index"],
        "results": list(job["results"]),
        "items": list(job["items"]),
        "out_dir": os.path.abspath(OUT_DIR),
        "error": job["error"],
    }


def merge_prompt(prefix, prompt):
    p = (prefix or "").strip()
    s = (prompt or "").strip()
    if not p:
        return s
    if not s:
        return p
    sep = " " if p.endswith((",", ".", "!", "?", "，", "。", "！", "？")) else ", "
    return p + sep + s


def new_job(prompts, negative_prompt, seed, prefix=""):
    job_id = uuid.uuid4().hex[:12]
    full_prompts = [merge_prompt(prefix, p) for p in prompts]
    job = {
        "id": job_id,
        "prompts": full_prompts,
        "negative_prompt": negative_prompt,
        "seed": seed,
        "status": "queued",
        "done": 0,
        "total": len(full_prompts),
        "current_index": 0,
        "results": [],
        "items": [],
        "error": "",
    }
    with jobs_lock:
        jobs[job_id] = job
    job_queue.put(job_id)
    return job


def run_job(job_id):
    with jobs_lock:
        job = jobs[job_id]
        job["status"] = "running"
    template = load_json(WORKFLOW_PATH)
    (pos_id, _pos_node), neg = pick_prompt_nodes(template)
    neg_id = neg[0] if neg is not None else None
    for i, prompt in enumerate(job["prompts"]):
        with jobs_lock:
            job["current_index"] = i + 1
        image_id = "%s_%02d" % (job_id, i + 1)
        image = {"id": image_id, "prompt": prompt}
        wf = build_image_workflow(
            template, image, pos_id, neg_id, job["seed"], job["negative_prompt"]
        )
        prompt_id = queue_prompt(COMFYUI, wf, CLIENT_ID)
        entry = wait_history(COMFYUI, prompt_id, DEFAULT_TIMEOUT)
        saved = download_outputs(
            COMFYUI, entry, OUT_DIR, image_id, media_keys=("images",), overwrite=True
        )
        with jobs_lock:
            for p in saved:
                fname = os.path.basename(p)
                job["results"].append(fname)
                job["items"].append({
                    "filename": fname,
                    "path": os.path.abspath(p),
                    "prompt": prompt,
                    "seed": job["seed"],
                })
            job["done"] = i + 1
    with jobs_lock:
        job["status"] = "done"


def worker():
    while True:
        job_id = job_queue.get()
        try:
            run_job(job_id)
        except Exception as e:  # noqa: BLE001
            with jobs_lock:
                job = jobs.get(job_id)
                if job is not None:
                    job["status"] = "failed"
                    job["error"] = str(e)
        finally:
            job_queue.task_done()


def health():
    return {
        "workflow_loaded": os.path.exists(WORKFLOW_PATH),
        "comfyui": "ok" if check_comfyui_health(COMFYUI) else "unreachable",
        "queued": job_queue.qsize(),
        "jobs": len(jobs),
    }


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _file(self, path, ctype):
        try:
            with open(path, "rb") as f:
                body = f.read()
        except FileNotFoundError:
            self._json({"error": "找不到文件"}, 404)
            return
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):  # noqa: N802
        if self.path in ("/", "/index.html"):
            self._file(WEB_INDEX_PATH, "text/html; charset=utf-8")
        elif self.path == "/api/health":
            self._json(health())
        elif self.path.startswith("/api/status/"):
            job_id = self.path[len("/api/status/"):]
            with jobs_lock:
                job = jobs.get(job_id)
            if job is None:
                self._json({"error": "没有这个任务"}, 404)
            else:
                self._json(public_job(job))
        elif self.path.startswith("/results/"):
            name = self.path[len("/results/"):]
            if "/" in name or "\\" in name or ".." in name:
                self._json({"error": "文件名不对"}, 400)
                return
            ctype, _enc = mimetypes.guess_type(name)
            self._file(os.path.join(OUT_DIR, name), ctype or "application/octet-stream")
        else:
            self._json({"error": "没有这个地址"}, 404)

    def do_POST(self):  # noqa: N802
        if self.path != "/api/generate":
            self._json({"error": "没有这个地址"}, 404)
            return
        length = int(self.headers.get("Content-Length") or 0)
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        except Exception:  # noqa: BLE001
            self._json({"error": "JSON 解析失败"}, 400)
            return
        prompts = [
            p.strip()
            for p in (data.get("prompts") or [])
            if isinstance(p, str) and p.strip()
        ]
        if not prompts:
            self._json({"error": "prompts 为空，至少给一段提示词"}, 400)
            return
        if len(prompts) > 20:
            self._json({"error": "一次最多 20 张"}, 400)
            return
        seed = data.get("seed")
        if not isinstance(seed, int) or isinstance(seed, bool):
            seed = DEFAULT_SEED
        prefix = data.get("prefix") if isinstance(data.get("prefix"), str) else ""
        job = new_job(prompts, data.get("negative_prompt") or "", seed, prefix=prefix)
        self._json({"job_id": job["id"]}, 202)


def main(argv=None):
    global COMFYUI, WORKFLOW_PATH, OUT_DIR  # noqa: PLW0603
    ap = argparse.ArgumentParser(description="Comfy Studio 本地生图工作台")
    ap.add_argument("--host", default="0.0.0.0", help="监听地址（默认 0.0.0.0）")
    ap.add_argument("--port", type=int, default=8899, help="端口（默认 8899）")
    ap.add_argument("--comfyui", default=DEFAULT_SERVER, help="ComfyUI 地址")
    ap.add_argument("--workflow", default=None, help="API 格式 workflow 路径")
    ap.add_argument("--out-dir", default=None, help="出图目录")
    args = ap.parse_args(argv)

    COMFYUI = args.comfyui
    WORKFLOW_PATH = args.workflow or os.path.join(BASE_DIR, "workflows", "sdxl_image_api.json")
    OUT_DIR = args.out_dir or os.path.join(BASE_DIR, "outputs", "images")
    os.makedirs(OUT_DIR, exist_ok=True)

    threading.Thread(target=worker, daemon=True).start()
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print("Comfy Studio 工作台运行在 http://%s:%d" % (args.host, args.port))
    print("本机访问：http://127.0.0.1:%d | ComfyUI：%s" % (args.port, COMFYUI))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
