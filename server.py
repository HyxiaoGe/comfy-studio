#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
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

from core.bgm_runner import build_bgm_workflow  # noqa: E402
from core.comfy_client import (  # noqa: E402
    DEFAULT_SERVER,
    check_comfyui_health,
    download_outputs,
    load_json,
    queue_prompt,
    wait_history,
)
from core.ffmpeg_composer import (  # noqa: E402
    DEFAULT_DURATION,
    DEFAULT_FPS,
    DEFAULT_TRANSITION,
    SUPPORTED_MOTIONS,
    SUPPORTED_TRANSITIONS,
    compose_storyboard_video,
    detect_nvenc,
    ensure_even,
    has_ffmpeg,
    has_subtitle_filter,
)
from core.image_runner import (  # noqa: E402
    DEFAULT_SEED,
    DEFAULT_TIMEOUT,
    build_image_workflow,
    pick_prompt_nodes,
)
from core.llm_client import (  # noqa: E402
    generate_narrations,
    generate_storyboard,
    get_llm_config,
    is_llm_configured,
    load_dotenv,
    suggest_bgm_tags,
)
from core.storage import StudioStorage  # noqa: E402
from core.tts_client import (  # noqa: E402
    get_tts_config,
    synthesize_speech,
)

load_dotenv(os.path.join(BASE_DIR, ".env"))

COMFYUI = DEFAULT_SERVER
WORKFLOW_PATH = os.path.join(BASE_DIR, "workflows", "sdxl_image_api.json")
BGM_WORKFLOW_PATH = os.path.join(BASE_DIR, "workflows", "ace_step_bgm_api.json")
WEB_DIST_DIR = os.path.join(BASE_DIR, "web", "dist")
WEB_INDEX_PATH = os.path.join(BASE_DIR, "web", "index.html")
OUT_DIR = os.path.join(BASE_DIR, "outputs", "images")
AUDIO_DIR = os.path.join(BASE_DIR, "outputs", "audio")
TTS_DIR = os.path.join(BASE_DIR, "outputs", "tts")

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")
COMPOSED_DIR = os.path.join(BASE_DIR, "outputs", "composed")
DB_PATH = os.path.join(BASE_DIR, "outputs", "studio.db")
CLIENT_ID = str(uuid.uuid4())

DEFAULT_WIDTH = 1344
DEFAULT_HEIGHT = 768

jobs = {}
jobs_lock = threading.Lock()
job_queue = queue.Queue()

compose_jobs = {}
compose_lock = threading.Lock()
compose_queue = queue.Queue()

store = None
store_lock = threading.Lock()


def get_store():
    global store  # noqa: PLW0603
    with store_lock:
        if store is None or store.db_path != os.path.abspath(DB_PATH):
            store = StudioStorage(DB_PATH)
        return store


def _safe_filename(name):
    return (
        isinstance(name, str)
        and bool(name)
        and "/" not in name
        and "\\" not in name
        and ".." not in name
    )


def _normalize_size(width, height):
    if isinstance(width, int) and not isinstance(width, bool) and isinstance(height, int) and not isinstance(height, bool):
        w = max(512, min(2048, width))
        h = max(512, min(2048, height))
        return w - (w % 8), h - (h % 8)
    return DEFAULT_WIDTH, DEFAULT_HEIGHT


def public_job(job):
    return {
        "id": job["id"],
        "project_id": job.get("project_id") or "",
        "mode": job.get("mode") or "image",
        "status": job["status"],
        "done": job["done"],
        "total": job["total"],
        "current_index": job["current_index"],
        "width": job["width"],
        "height": job["height"],
        "seed": job.get("seed", DEFAULT_SEED),
        "results": list(job["results"]),
        "items": list(job["items"]),
        "out_dir": os.path.abspath(OUT_DIR),
        "error": job["error"],
    }


def public_compose_job(cjob):
    fname = cjob.get("filename") or ""
    return {
        "id": cjob["id"],
        "project_id": cjob.get("project_id") or "",
        "status": cjob["status"],
        "done": cjob["done"],
        "total": cjob["total"],
        "stage": cjob["stage"],
        "filename": fname,
        "video_url": f"/composed/{fname}" if fname else "",
        "encoder": cjob["encoder"],
        "width": cjob["width"],
        "height": cjob["height"],
        "duration": cjob["duration"],
        "error": cjob["error"],
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


def new_job(
    prompts,
    negative_prompt,
    seed,
    prefix="",
    width=DEFAULT_WIDTH,
    height=DEFAULT_HEIGHT,
    project_id="",
):
    job_id = uuid.uuid4().hex[:12]
    full_prompts = [merge_prompt(prefix, p) for p in prompts]
    w, h = _normalize_size(width, height)
    job = {
        "id": job_id,
        "project_id": project_id or "",
        "mode": "image",
        "prompts": full_prompts,
        "negative_prompt": negative_prompt,
        "seed": seed,
        "width": w,
        "height": h,
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
    get_store().create_job(job)
    job_queue.put(job_id)
    return job


def new_bgm_job(
    tags,
    lyrics="[Instrumental]",
    duration=24.0,
    seed=42,
    bpm=96,
    file_id="",
    project_id="",
):
    job_id = uuid.uuid4().hex[:12]
    safe_fid = (file_id or "").strip() or f"ai_bgm_{job_id}"
    job = {
        "id": job_id,
        "project_id": project_id or "",
        "mode": "bgm",
        "prompts": [tags],
        "negative_prompt": "",
        "seed": seed,
        "width": 0,
        "height": 0,
        "tags": tags,
        "lyrics": lyrics,
        "duration": duration,
        "bpm": bpm,
        "file_id": safe_fid,
        "status": "queued",
        "done": 0,
        "total": 1,
        "current_index": 0,
        "results": [],
        "items": [],
        "error": "",
    }
    with jobs_lock:
        jobs[job_id] = job
    get_store().create_job(job)
    job_queue.put(job_id)
    return job


def new_compose_job(
    shots,
    shots_meta,
    width,
    height,
    fps,
    transition,
    transition_type="fade",
    burn_subtitles=True,
    auto_align_tts=True,
    bgm_path=None,
    bgm_volume=0.35,
    project_id="",
):
    cid = uuid.uuid4().hex[:12]
    cjob = {
        "id": cid,
        "project_id": project_id or "",
        "shots": shots,
        "shots_meta": shots_meta,
        "width": ensure_even(width, DEFAULT_WIDTH),
        "height": ensure_even(height, DEFAULT_HEIGHT),
        "fps": fps,
        "transition": transition,
        "transition_type": transition_type,
        "burn_subtitles": burn_subtitles,
        "auto_align_tts": auto_align_tts,
        "bgm_path": bgm_path,
        "bgm_volume": bgm_volume,
        "status": "queued",
        "done": 0,
        "total": len(shots) + 1,
        "stage": "排队等待合成…",
        "filename": "",
        "encoder": "",
        "duration": 0.0,
        "error": "",
    }
    with compose_lock:
        compose_jobs[cid] = cjob
    get_store().create_composition(cjob)
    compose_queue.put(cid)
    return cjob


def run_job(job_id):
    st = get_store()
    with jobs_lock:
        job = jobs[job_id]
        job["status"] = "running"
    st.update_job(job_id, status="running")

    if job.get("mode") == "bgm":
        with jobs_lock:
            job["current_index"] = 1
        st.update_job(job_id, current_index=1)
        template = load_json(BGM_WORKFLOW_PATH)
        fid = job.get("file_id") or f"ai_bgm_{job_id}"
        wf = build_bgm_workflow(
            template,
            tags=job.get("tags") or "",
            lyrics=job.get("lyrics") or "[Instrumental]",
            duration=job.get("duration") or 24.0,
            seed=job.get("seed", 42),
            bpm=job.get("bpm") or 96,
            filename_prefix=f"audio/{fid}",
        )
        prompt_id = queue_prompt(COMFYUI, wf, CLIENT_ID)
        entry = wait_history(COMFYUI, prompt_id, DEFAULT_TIMEOUT)
        saved = download_outputs(
            COMFYUI, entry, AUDIO_DIR, fid, media_keys=("audio",), overwrite=True
        )
        with jobs_lock:
            for p in saved:
                fname = os.path.basename(p)
                job["results"].append(fname)
                job["items"].append({
                    "filename": fname,
                    "url": f"/audio/{fname}",
                    "path": os.path.abspath(p),
                    "tags": job.get("tags") or "",
                    "duration": job.get("duration") or 24.0,
                    "bpm": job.get("bpm") or 96,
                    "seed": job.get("seed", 42),
                })
            job["done"] = 1
            results_copy = list(job["results"])
            items_copy = list(job["items"])
        st.update_job(job_id, done=1, results=results_copy, items=items_copy, status="done")
        with jobs_lock:
            job["status"] = "done"
        return

    template = load_json(WORKFLOW_PATH)
    (pos_id, _pos_node), neg = pick_prompt_nodes(template)
    neg_id = neg[0] if neg is not None else None
    for i, prompt in enumerate(job["prompts"]):
        with jobs_lock:
            job["current_index"] = i + 1
        st.update_job(job_id, current_index=i + 1)

        image_id = "%s_%02d" % (job_id, i + 1)
        image = {"id": image_id, "prompt": prompt}
        wf = build_image_workflow(
            template,
            image,
            pos_id,
            neg_id,
            job["seed"],
            job["negative_prompt"],
            width=job["width"],
            height=job["height"],
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
                    "width": job["width"],
                    "height": job["height"],
                })
            job["done"] = i + 1
            results_copy = list(job["results"])
            items_copy = list(job["items"])
        st.update_job(job_id, done=i + 1, results=results_copy, items=items_copy)

    with jobs_lock:
        job["status"] = "done"
    st.update_job(job_id, status="done")


def run_compose_job(cid):
    st = get_store()
    with compose_lock:
        cjob = compose_jobs[cid]
        cjob["status"] = "running"
        cjob["stage"] = "准备合成运镜成片…"
    st.update_composition(cid, status="running", stage="准备合成运镜成片…")

    os.makedirs(COMPOSED_DIR, exist_ok=True)
    out_name = f"story_{cid}.mp4"
    out_path = os.path.join(COMPOSED_DIR, out_name)

    def on_progress(done, total, stage):
        with compose_lock:
            cjob["done"] = done
            cjob["total"] = total
            cjob["stage"] = stage
        st.update_composition(cid, done=done, total=total, stage=stage)

    result = compose_storyboard_video(
        cjob["shots"],
        out_path,
        width=cjob["width"],
        height=cjob["height"],
        fps=cjob["fps"],
        transition=cjob["transition"],
        transition_type=cjob.get("transition_type", "fade"),
        burn_subtitles=cjob.get("burn_subtitles", True),
        auto_align_tts=cjob.get("auto_align_tts", True),
        bgm_path=cjob.get("bgm_path"),
        bgm_volume=cjob.get("bgm_volume", 0.35),
        progress_cb=on_progress,
    )
    with compose_lock:
        cjob["status"] = "done"
        cjob["done"] = cjob["total"]
        cjob["filename"] = out_name
        cjob["encoder"] = result["encoder"]
        cjob["duration"] = result["duration"]
        cjob["stage"] = "成片导出完成"
        tot = cjob["total"]
    st.update_composition(
        cid,
        status="done",
        done=tot,
        filename=out_name,
        encoder=result["encoder"],
        duration=result["duration"],
        stage="成片导出完成",
    )


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
            get_store().update_job(job_id, status="failed", error=str(e))
        finally:
            job_queue.task_done()


def compose_worker():
    while True:
        cid = compose_queue.get()
        try:
            run_compose_job(cid)
        except Exception as e:  # noqa: BLE001
            with compose_lock:
                cjob = compose_jobs.get(cid)
                if cjob is not None:
                    cjob["status"] = "failed"
                    cjob["error"] = str(e)
                    cjob["stage"] = "合成失败"
            get_store().update_composition(
                cid, status="failed", error=str(e), stage="合成失败"
            )
        finally:
            compose_queue.task_done()


def health():
    active_job = None
    with jobs_lock:
        for job in reversed(list(jobs.values())):
            if job["status"] == "running":
                active_job = {
                    "id": job["id"],
                    "status": job["status"],
                    "done": job["done"],
                    "total": job["total"],
                    "current_index": job["current_index"],
                }
                break
    tts_cfg = get_tts_config()
    return {
        "workflow_loaded": os.path.exists(WORKFLOW_PATH),
        "bgm_workflow_loaded": os.path.exists(BGM_WORKFLOW_PATH),
        "comfyui": "ok" if check_comfyui_health(COMFYUI) else "unreachable",
        "ffmpeg": has_ffmpeg(),
        "nvenc": detect_nvenc(),
        "subtitle_filter": has_subtitle_filter(),
        "llm_configured": is_llm_configured(),
        "llm_model": get_llm_config()["model"],
        "tts_configured": tts_cfg["configured"],
        "tts_provider": tts_cfg["active_provider"],
        "tts_default_voice": tts_cfg["default_voice"],
        "tts_voices": tts_cfg["voices"],
        "db_ready": get_store() is not None,
        "queued": job_queue.qsize(),
        "jobs": len(jobs),
        "active_job": active_job,
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

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        try:
            raw = self.rfile.read(length).decode("utf-8") if length else "{}"
            return json.loads(raw or "{}"), None
        except Exception:  # noqa: BLE001
            return None, "JSON 解析失败"

    def _file(self, path, ctype, support_range=False):
        try:
            file_size = os.path.getsize(path)
        except OSError:
            self._json({"error": "找不到文件"}, 404)
            return

        range_hdr = self.headers.get("Range") if support_range else None
        if range_hdr and range_hdr.startswith("bytes="):
            spec = range_hdr[len("bytes="):].split(",")[0].strip()
            parts = spec.split("-", 1)
            try:
                start = int(parts[0]) if parts[0] else 0
                end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
            except ValueError:
                self.send_error(416)
                return
            end = min(end, file_size - 1)
            if start < 0 or start > end or start >= file_size:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{file_size}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            length = end - start + 1
            with open(path, "rb") as f:
                f.seek(start)
                chunk = f.read(length)
            self.send_response(206)
            self.send_header("Content-Type", ctype)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
            self.send_header("Content-Length", str(len(chunk)))
            self.end_headers()
            self.wfile.write(chunk)
            return

        with open(path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        if support_range:
            self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_frontend_asset(self, rel_path):
        dist_root = os.path.realpath(WEB_DIST_DIR)
        clean_rel = rel_path.lstrip("/")
        if not clean_rel:
            return False
        candidate = os.path.realpath(os.path.join(dist_root, clean_rel))
        if not candidate.startswith(dist_root + os.sep) or not os.path.isfile(candidate):
            return False
        ctype, _enc = mimetypes.guess_type(candidate)
        if candidate.endswith((".js", ".mjs")):
            ctype = "application/javascript; charset=utf-8"
        elif candidate.endswith(".css"):
            ctype = "text/css; charset=utf-8"
        self._file(candidate, ctype or "application/octet-stream")
        return True

    def do_GET(self):  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path in ("/", "/index.html"):
            dist_index = os.path.join(WEB_DIST_DIR, "index.html")
            target = dist_index if os.path.isfile(dist_index) else WEB_INDEX_PATH
            self._file(target, "text/html; charset=utf-8")
        elif path == "/api/health":
            self._json(health())
        elif path == "/api/jobs":
            self._json({"jobs": [public_job(j) for j in get_store().list_jobs()]})
        elif path.startswith("/api/status/"):
            job_id = path[len("/api/status/"):]
            with jobs_lock:
                job = jobs.get(job_id)
            if job is None:
                job = get_store().get_job(job_id)
            if job is None:
                self._json({"error": "没有这个任务"}, 404)
            else:
                self._json(public_job(job))
        elif path == "/api/projects":
            self._json({"projects": get_store().list_projects()})
        elif path == "/api/projects/latest":
            self._json({"project": get_store().get_latest_project()})
        elif path.startswith("/api/projects/"):
            pid = path[len("/api/projects/"):]
            proj = get_store().get_project(pid)
            if proj is None:
                self._json({"error": "找不到该项目"}, 404)
            else:
                self._json({"project": proj})
        elif path == "/api/compositions":
            self._json({
                "compositions": get_store().list_compositions(composed_dir=COMPOSED_DIR)
            })
        elif path.startswith("/api/compose/"):
            cid = path[len("/api/compose/"):]
            with compose_lock:
                cjob = compose_jobs.get(cid)
            if cjob is None:
                cjob = get_store().get_composition(cid)
            if cjob is None:
                self._json({"error": "没有这个合成任务"}, 404)
            else:
                self._json(public_compose_job(cjob))
        elif path == "/api/audio":
            os.makedirs(AUDIO_DIR, exist_ok=True)
            files = []
            for fn in sorted(os.listdir(AUDIO_DIR)):
                fp = os.path.join(AUDIO_DIR, fn)
                if os.path.isfile(fp) and fn.lower().endswith((".mp3", ".wav", ".m4a", ".ogg", ".flac")):
                    files.append({
                        "filename": fn,
                        "url": f"/audio/{fn}",
                        "size": os.path.getsize(fp),
                    })
            self._json({"files": files})
        elif path.startswith("/audio/"):
            name = path[len("/audio/"):]
            if not _safe_filename(name):
                self._json({"error": "文件名不对"}, 400)
                return
            ctype, _enc = mimetypes.guess_type(name)
            self._file(os.path.join(AUDIO_DIR, name), ctype or "audio/mpeg", support_range=True)
        elif path.startswith("/tts/"):
            name = path[len("/tts/"):]
            if not _safe_filename(name):
                self._json({"error": "文件名不对"}, 400)
                return
            ctype, _enc = mimetypes.guess_type(name)
            self._file(os.path.join(TTS_DIR, name), ctype or "audio/wav", support_range=True)
        elif path.startswith("/results/"):
            name = path[len("/results/"):]
            if not _safe_filename(name):
                self._json({"error": "文件名不对"}, 400)
                return
            ctype, _enc = mimetypes.guess_type(name)
            self._file(os.path.join(OUT_DIR, name), ctype or "application/octet-stream")
        elif path.startswith("/composed/"):
            name = path[len("/composed/"):]
            if not _safe_filename(name):
                self._json({"error": "文件名不对"}, 400)
                return
            ctype, _enc = mimetypes.guess_type(name)
            self._file(
                os.path.join(COMPOSED_DIR, name),
                ctype or "video/mp4",
                support_range=True,
            )
        elif self._serve_frontend_asset(path):
            return
        elif (
            not path.startswith(("/api/", "/assets/", "/results/", "/tts/", "/audio/", "/composed/"))
            and "." not in os.path.basename(path)
        ):
            dist_index = os.path.join(WEB_DIST_DIR, "index.html")
            target = dist_index if os.path.isfile(dist_index) else WEB_INDEX_PATH
            self._file(target, "text/html; charset=utf-8")
        else:
            self._json({"error": "没有这个地址"}, 404)

    def do_POST(self):  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path == "/api/generate":
            self._handle_generate()
        elif path == "/api/compose":
            self._handle_compose()
        elif path == "/api/projects":
            self._handle_save_project()
        elif path == "/api/narration":
            self._handle_narration()
        elif path == "/api/storyboard":
            self._handle_storyboard()
        elif path == "/api/tts":
            self._handle_tts()
        elif path == "/api/bgm/generate":
            self._handle_bgm_generate()
        elif path == "/api/bgm/suggest":
            self._handle_bgm_suggest()
        elif path == "/api/upload-audio":
            self._handle_upload_binary(AUDIO_DIR, (".mp3", ".wav", ".m4a", ".ogg", ".flac"), 30 * 1024 * 1024, "/audio/")
        elif path == "/api/upload-image":
            self._handle_upload_binary(OUT_DIR, (".png", ".jpg", ".jpeg", ".webp"), 20 * 1024 * 1024, "/results/")
        else:
            self._json({"error": "没有这个地址"}, 404)

    def do_DELETE(self):  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path.startswith("/api/projects/"):
            pid = path[len("/api/projects/"):]
            if not get_store().delete_project(pid):
                self._json({"error": "找不到该项目"}, 404)
                return
            self._json({"ok": True})
        elif path.startswith("/api/compositions/"):
            cid = path[len("/api/compositions/"):]
            if not get_store().delete_composition(cid, composed_dir=COMPOSED_DIR):
                self._json({"error": "找不到该成片记录"}, 404)
                return
            self._json({"ok": True})
        else:
            self._json({"error": "没有这个地址"}, 404)

    def _handle_upload_binary(self, target_dir, allowed_exts, max_bytes, url_prefix):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > max_bytes:
            self._json({"error": f"文件大小不合法（最大 {max_bytes // (1024 * 1024)} MB）"}, 400)
            return
        raw_name = self.headers.get("X-Filename") or "upload"
        try:
            raw_name = os.path.basename(raw_name.strip())
        except Exception:  # noqa: BLE001
            raw_name = "upload"
        ext = os.path.splitext(raw_name)[1].lower()
        if ext not in allowed_exts:
            self._json({"error": f"不支持的文件格式：{ext or '未知'}"}, 400)
            return
        stem = "".join(ch for ch in os.path.splitext(raw_name)[0] if ch.isalnum() or ch in ("-", "_"))[:32] or "file"
        fname = f"{stem}_{uuid.uuid4().hex[:8]}{ext}"
        os.makedirs(target_dir, exist_ok=True)
        body = self.rfile.read(length)
        with open(os.path.join(target_dir, fname), "wb") as f:
            f.write(body)
        self._json({"filename": fname, "url": f"{url_prefix}{fname}", "size": len(body)})

    def _handle_narration(self):
        data, err = self._read_json_body()
        if err:
            self._json({"error": err}, 400)
            return
        shots = data.get("shots")
        if not isinstance(shots, list) or not shots:
            self._json({"error": "shots 不能为空"}, 400)
            return
        if len(shots) > 30:
            self._json({"error": "单次最多生成 30 条解说词"}, 400)
            return
        try:
            res = generate_narrations(
                title=data.get("title") or "",
                prefix=data.get("prefix") or "",
                shots=shots,
                style=data.get("style") or "绘本故事",
            )
            self._json(res)
        except Exception as e:  # noqa: BLE001
            code = 400 if "未配置" in str(e) else 502
            self._json({"error": str(e)}, code)

    def _handle_storyboard(self):
        data, err = self._read_json_body()
        if err:
            self._json({"error": err}, 400)
            return
        idea = (data.get("idea") or "").strip()
        if not idea:
            self._json({"error": "请先输入故事创意或主题"}, 400)
            return
        try:
            shot_count = max(2, min(30, int(data.get("shot_count") or 6)))
        except (TypeError, ValueError):
            shot_count = 6
        try:
            raw_dur = float(data.get("target_duration") or 0)
        except (TypeError, ValueError):
            raw_dur = 0.0
        target_duration = max(10, min(300, int(round(raw_dur)))) if raw_dur > 0 else 0
        try:
            res = generate_storyboard(
                idea=idea,
                shot_count=shot_count,
                target_duration=target_duration,
                visual_style=data.get("visual_style") or "",
                narration_style=data.get("narration_style") or "绘本故事",
            )
            self._json(res)
        except Exception as e:  # noqa: BLE001
            code = 400 if "未配置" in str(e) else 502
            self._json({"error": str(e)}, code)

    def _handle_tts(self):
        data, err = self._read_json_body()
        if err:
            self._json({"error": err}, 400)
            return
        items = data.get("items")
        if not isinstance(items, list) or not items:
            self._json({"error": "items 不能为空"}, 400)
            return
        if len(items) > 30:
            self._json({"error": "单次最多合成 30 条配音"}, 400)
            return
        voice = (data.get("voice") or "").strip() or None
        provider = (data.get("provider") or "").strip() or None
        results = []
        try:
            for item in items:
                if not isinstance(item, dict):
                    continue
                uid = str(item.get("uid") or "")
                text = (item.get("text") or "").strip()
                if not text:
                    continue
                res = synthesize_speech(text, TTS_DIR, voice=voice, provider=provider)
                results.append({
                    "uid": uid,
                    "filename": res["filename"],
                    "url": f"/tts/{res['filename']}",
                    "duration": res["duration"],
                    "provider": res["provider"],
                    "voice": res["voice"],
                })
            if not results:
                self._json({"error": "没有需要配音的非空旁白文本"}, 400)
                return
            self._json({"results": results})
        except Exception as e:  # noqa: BLE001
            code = 400 if "未配置" in str(e) else 502
            self._json({"error": str(e)}, code)

    def _handle_bgm_suggest(self):
        data, err = self._read_json_body()
        if err:
            self._json({"error": err}, 400)
            return
        try:
            res = suggest_bgm_tags(
                title=data.get("title") or "",
                prefix=data.get("prefix") or "",
                narrations=data.get("narrations") or [],
            )
            self._json(res)
        except Exception as e:  # noqa: BLE001
            code = 400 if "未配置" in str(e) else 502
            self._json({"error": str(e)}, code)

    def _handle_bgm_generate(self):
        if not os.path.isfile(BGM_WORKFLOW_PATH):
            self._json({"error": "服务端缺少 ACE-Step 1.5 配乐工作流模板"}, 500)
            return
        data, err = self._read_json_body()
        if err:
            self._json({"error": err}, 400)
            return
        tags = (data.get("tags") or "").strip()
        if not tags:
            self._json({"error": "请先输入配乐风格描述 (tags)"}, 400)
            return
        lyrics = (data.get("lyrics") or "").strip() or "[Instrumental]"
        try:
            duration = max(5.0, min(180.0, float(data.get("duration") or 24.0)))
        except (TypeError, ValueError):
            duration = 24.0
        try:
            bpm = max(40, min(220, int(round(float(data.get("bpm") or 96)))))
        except (TypeError, ValueError):
            bpm = 96
        seed = data.get("seed")
        if not isinstance(seed, int) or isinstance(seed, bool):
            seed = abs(hash(f"{tags}_{duration}")) % 2147483647 or 42
        project_id = data.get("project_id") if isinstance(data.get("project_id"), str) else ""
        job = new_bgm_job(
            tags=tags,
            lyrics=lyrics,
            duration=duration,
            seed=seed,
            bpm=bpm,
            project_id=project_id,
        )
        self._json({"job_id": job["id"]}, 202)

    def _handle_save_project(self):
        data, err = self._read_json_body()
        if err:
            self._json({"error": err}, 400)
            return
        if not isinstance(data, dict):
            self._json({"error": "项目数据必须是 JSON 对象"}, 400)
            return
        proj = get_store().upsert_project(data)
        self._json({"project": proj})

    def _handle_generate(self):
        data, err = self._read_json_body()
        if err:
            self._json({"error": err}, 400)
            return
        prompts = [
            p.strip()
            for p in (data.get("prompts") or [])
            if isinstance(p, str) and p.strip()
        ]
        if not prompts:
            self._json({"error": "prompts 为空，至少给一段提示词"}, 400)
            return
        if len(prompts) > 30:
            self._json({"error": "一次最多 30 张"}, 400)
            return
        seed = data.get("seed")
        if not isinstance(seed, int) or isinstance(seed, bool):
            seed = DEFAULT_SEED
        prefix = data.get("prefix") if isinstance(data.get("prefix"), str) else ""
        project_id = data.get("project_id") if isinstance(data.get("project_id"), str) else ""
        job = new_job(
            prompts,
            data.get("negative_prompt") or "",
            seed,
            prefix=prefix,
            width=data.get("width"),
            height=data.get("height"),
            project_id=project_id,
        )
        self._json({"job_id": job["id"]}, 202)

    def _handle_compose(self):
        if not has_ffmpeg():
            self._json({"error": "服务端未检测到 ffmpeg，无法合成视频"}, 500)
            return
        data, err = self._read_json_body()
        if err:
            self._json({"error": err}, 400)
            return
        raw_shots = data.get("shots")
        if not isinstance(raw_shots, list) or not raw_shots:
            self._json({"error": "shots 不能为空，请先生成分镜图片"}, 400)
            return
        if len(raw_shots) > 30:
            self._json({"error": "单次合成最多 30 个分镜"}, 400)
            return

        shots = []
        shots_meta = []
        for idx, item in enumerate(raw_shots):
            if not isinstance(item, dict):
                self._json({"error": f"第 {idx + 1} 个分镜参数格式不对"}, 400)
                return
            fname = item.get("filename")
            if not _safe_filename(fname):
                self._json({"error": f"第 {idx + 1} 个分镜文件名不合法"}, 400)
                return
            img_path = os.path.join(OUT_DIR, fname)
            if not os.path.exists(img_path):
                self._json({"error": f"找不到分镜图片：{fname}"}, 404)
                return
            motion = (item.get("motion") or "zoom_in").strip().lower()
            if motion not in SUPPORTED_MOTIONS:
                motion = "zoom_in"
            try:
                dur = float(item.get("duration") or DEFAULT_DURATION)
            except (TypeError, ValueError):
                dur = DEFAULT_DURATION
            dur = max(1.0, min(15.0, dur))
            narration = item.get("narration") if isinstance(item.get("narration"), str) else ""
            tts_fname = item.get("tts_filename")
            tts_path = None
            if isinstance(tts_fname, str) and tts_fname.strip():
                if not _safe_filename(tts_fname.strip()):
                    self._json({"error": f"第 {idx + 1} 个配音文件名不合法"}, 400)
                    return
                cand_tts = os.path.join(TTS_DIR, tts_fname.strip())
                if os.path.isfile(cand_tts):
                    tts_path = cand_tts
            shots.append({
                "path": img_path,
                "motion": motion,
                "duration": dur,
                "narration": narration,
                "tts_path": tts_path,
            })
            shots_meta.append({
                "filename": fname,
                "motion": motion,
                "duration": dur,
                "narration": narration,
                "tts_filename": tts_fname.strip() if tts_path else "",
            })

        width, height = _normalize_size(data.get("width"), data.get("height"))
        try:
            fps = int(data.get("fps") or DEFAULT_FPS)
        except (TypeError, ValueError):
            fps = DEFAULT_FPS
        try:
            transition = float(
                DEFAULT_TRANSITION if data.get("transition") is None else data.get("transition")
            )
        except (TypeError, ValueError):
            transition = DEFAULT_TRANSITION
        transition_type = (data.get("transition_type") or "fade").strip().lower()
        if transition_type not in SUPPORTED_TRANSITIONS:
            transition_type = "fade"
        burn_subtitles = bool(data.get("burn_subtitles", True))
        auto_align_tts = bool(data.get("auto_align_tts", True))
        bgm_filename = data.get("bgm_filename")
        bgm_path = None
        if isinstance(bgm_filename, str) and bgm_filename.strip():
            if not _safe_filename(bgm_filename.strip()):
                self._json({"error": "BGM 文件名不合法"}, 400)
                return
            candidate_bgm = os.path.join(AUDIO_DIR, bgm_filename.strip())
            if not os.path.isfile(candidate_bgm):
                self._json({"error": f"找不到背景音乐：{bgm_filename}"}, 404)
                return
            bgm_path = candidate_bgm
        try:
            bgm_volume = float(0.35 if data.get("bgm_volume") is None else data.get("bgm_volume"))
        except (TypeError, ValueError):
            bgm_volume = 0.35
        project_id = data.get("project_id") if isinstance(data.get("project_id"), str) else ""

        cjob = new_compose_job(
            shots,
            shots_meta,
            width,
            height,
            fps,
            transition,
            transition_type=transition_type,
            burn_subtitles=burn_subtitles,
            auto_align_tts=auto_align_tts,
            bgm_path=bgm_path,
            bgm_volume=bgm_volume,
            project_id=project_id,
        )
        self._json({"compose_id": cjob["id"]}, 202)


def main(argv=None):
    global COMFYUI, WORKFLOW_PATH, OUT_DIR, COMPOSED_DIR, AUDIO_DIR, TTS_DIR, DB_PATH, store  # noqa: PLW0603
    ap = argparse.ArgumentParser(description="Comfy Studio 本地生图工作台")
    ap.add_argument("--host", default="0.0.0.0", help="监听地址（默认 0.0.0.0）")
    ap.add_argument("--port", type=int, default=8899, help="端口（默认 8899）")
    ap.add_argument("--comfyui", default=DEFAULT_SERVER, help="ComfyUI 地址")
    ap.add_argument("--workflow", default=None, help="API 格式 workflow 路径")
    ap.add_argument("--out-dir", default=None, help="出图目录")
    ap.add_argument("--db", default=None, help="SQLite 数据库文件路径")
    args = ap.parse_args(argv)

    COMFYUI = args.comfyui
    WORKFLOW_PATH = args.workflow or os.path.join(BASE_DIR, "workflows", "sdxl_image_api.json")
    OUT_DIR = args.out_dir or os.path.join(BASE_DIR, "outputs", "images")
    COMPOSED_DIR = os.path.join(BASE_DIR, "outputs", "composed")
    AUDIO_DIR = os.path.join(BASE_DIR, "outputs", "audio")
    TTS_DIR = os.path.join(BASE_DIR, "outputs", "tts")
    DB_PATH = args.db or os.path.join(BASE_DIR, "outputs", "studio.db")
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(COMPOSED_DIR, exist_ok=True)
    os.makedirs(AUDIO_DIR, exist_ok=True)
    os.makedirs(TTS_DIR, exist_ok=True)

    store = StudioStorage(DB_PATH)
    store.mark_interrupted_on_startup()

    threading.Thread(target=worker, daemon=True).start()
    threading.Thread(target=compose_worker, daemon=True).start()
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print("Comfy Studio 工作台运行在 http://%s:%d" % (args.host, args.port))
    print("本机访问：http://127.0.0.1:%d | ComfyUI：%s" % (args.port, COMFYUI))
    print("存储数据库：%s" % DB_PATH)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
