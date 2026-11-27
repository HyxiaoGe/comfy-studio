#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Comfy Studio 轻量级存储层（基于 Python 标准库 sqlite3）
负责项目草稿、分镜生成任务与 FFmpeg 合成成片记录的持久化。
"""

import json
import os
import sqlite3
import threading
import time
import uuid


def _json_dumps(obj):
    return json.dumps(obj, ensure_ascii=False)


def _json_loads(raw, default):
    if not raw:
        return default
    try:
        return json.loads(raw)
    except Exception:  # noqa: BLE001
        return default


class StudioStorage:
    """线程安全的单文件 SQLite 存储层（WAL 模式）。"""

    def __init__(self, db_path):
        self.db_path = os.path.abspath(db_path)
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        with self._lock:
            self._conn.execute("PRAGMA journal_mode=WAL;")
            self._conn.execute("PRAGMA synchronous=NORMAL;")
            self._init_schema()

    def _init_schema(self):
        self._conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                mode TEXT NOT NULL DEFAULT 'storyboard',
                prefix TEXT NOT NULL DEFAULT '',
                negative_prompt TEXT NOT NULL DEFAULT '',
                seed INTEGER NOT NULL DEFAULT 42,
                width INTEGER NOT NULL DEFAULT 1344,
                height INTEGER NOT NULL DEFAULT 768,
                shots_json TEXT NOT NULL DEFAULT '[]',
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL DEFAULT '',
                mode TEXT NOT NULL DEFAULT 'image',
                status TEXT NOT NULL,
                done INTEGER NOT NULL DEFAULT 0,
                total INTEGER NOT NULL DEFAULT 0,
                current_index INTEGER NOT NULL DEFAULT 0,
                width INTEGER NOT NULL DEFAULT 1344,
                height INTEGER NOT NULL DEFAULT 768,
                seed INTEGER NOT NULL DEFAULT 42,
                negative_prompt TEXT NOT NULL DEFAULT '',
                prompts_json TEXT NOT NULL DEFAULT '[]',
                results_json TEXT NOT NULL DEFAULT '[]',
                items_json TEXT NOT NULL DEFAULT '[]',
                error TEXT NOT NULL DEFAULT '',
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS compositions (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL,
                done INTEGER NOT NULL DEFAULT 0,
                total INTEGER NOT NULL DEFAULT 0,
                stage TEXT NOT NULL DEFAULT '',
                filename TEXT NOT NULL DEFAULT '',
                encoder TEXT NOT NULL DEFAULT '',
                width INTEGER NOT NULL DEFAULT 1344,
                height INTEGER NOT NULL DEFAULT 768,
                fps INTEGER NOT NULL DEFAULT 30,
                duration REAL NOT NULL DEFAULT 0.0,
                shots_json TEXT NOT NULL DEFAULT '[]',
                error TEXT NOT NULL DEFAULT '',
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_comp_created ON compositions(created_at DESC);
            """
        )
        self._conn.commit()

    def close(self):
        with self._lock:
            self._conn.close()

    def mark_interrupted_on_startup(self):
        """服务重启后，将遗留的 queued/running 任务标记为 interrupted。"""
        now = time.time()
        with self._lock:
            self._conn.execute(
                """
                UPDATE jobs
                SET status = 'interrupted',
                    error = CASE WHEN error = '' THEN '服务重启，任务已中断' ELSE error END,
                    updated_at = ?
                WHERE status IN ('queued', 'running')
                """,
                (now,),
            )
            self._conn.execute(
                """
                UPDATE compositions
                SET status = 'interrupted',
                    stage = '服务重启，合成已中断',
                    error = CASE WHEN error = '' THEN '服务重启，合成已中断' ELSE error END,
                    updated_at = ?
                WHERE status IN ('queued', 'running')
                """,
                (now,),
            )
            self._conn.commit()

    # -------------------- Projects --------------------

    @staticmethod
    def _row_to_project(row):
        if row is None:
            return None
        shots = _json_loads(row["shots_json"], [])
        if not isinstance(shots, list):
            shots = []
        return {
            "id": row["id"],
            "title": row["title"],
            "mode": row["mode"],
            "prefix": row["prefix"],
            "negative_prompt": row["negative_prompt"],
            "seed": row["seed"],
            "width": row["width"],
            "height": row["height"],
            "shots": shots,
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def upsert_project(self, data):
        now = time.time()
        pid = (data.get("id") or "").strip() or f"proj_{uuid.uuid4().hex[:10]}"
        title = (data.get("title") or "").strip() or "未命名分镜项目"
        mode = (data.get("mode") or "storyboard").strip() or "storyboard"
        prefix = data.get("prefix") if isinstance(data.get("prefix"), str) else ""
        negative = data.get("negative_prompt") if isinstance(data.get("negative_prompt"), str) else ""
        seed = data.get("seed")
        if not isinstance(seed, int) or isinstance(seed, bool):
            seed = 42
        width = data.get("width")
        if not isinstance(width, int) or isinstance(width, bool):
            width = 1344
        height = data.get("height")
        if not isinstance(height, int) or isinstance(height, bool):
            height = 768
        shots = data.get("shots") if isinstance(data.get("shots"), list) else []

        with self._lock:
            existing = self._conn.execute(
                "SELECT created_at FROM projects WHERE id = ?", (pid,)
            ).fetchone()
            created_at = existing["created_at"] if existing else now
            self._conn.execute(
                """
                INSERT INTO projects (
                    id, title, mode, prefix, negative_prompt, seed,
                    width, height, shots_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    mode = excluded.mode,
                    prefix = excluded.prefix,
                    negative_prompt = excluded.negative_prompt,
                    seed = excluded.seed,
                    width = excluded.width,
                    height = excluded.height,
                    shots_json = excluded.shots_json,
                    updated_at = excluded.updated_at
                """,
                (
                    pid, title, mode, prefix, negative, seed,
                    width, height, _json_dumps(shots), created_at, now,
                ),
            )
            self._conn.commit()
            row = self._conn.execute("SELECT * FROM projects WHERE id = ?", (pid,)).fetchone()
        return self._row_to_project(row)

    def get_project(self, pid):
        with self._lock:
            row = self._conn.execute("SELECT * FROM projects WHERE id = ?", (pid,)).fetchone()
        return self._row_to_project(row)

    def get_latest_project(self):
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM projects ORDER BY updated_at DESC LIMIT 1"
            ).fetchone()
        return self._row_to_project(row)

    def list_projects(self, limit=50):
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM projects ORDER BY updated_at DESC LIMIT ?", (int(limit),)
            ).fetchall()
        out = []
        for row in rows:
            shots = _json_loads(row["shots_json"], [])
            ready_shots = [s for s in shots if isinstance(s, dict) and s.get("filename")]
            cover = ready_shots[0]["filename"] if ready_shots else ""
            out.append({
                "id": row["id"],
                "title": row["title"],
                "mode": row["mode"],
                "width": row["width"],
                "height": row["height"],
                "seed": row["seed"],
                "shot_count": len(shots),
                "ready_count": len(ready_shots),
                "cover_filename": cover,
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            })
        return out

    def delete_project(self, pid):
        with self._lock:
            cur = self._conn.execute("DELETE FROM projects WHERE id = ?", (pid,))
            self._conn.commit()
            return cur.rowcount > 0

    # -------------------- Jobs --------------------

    @staticmethod
    def _row_to_job(row):
        if row is None:
            return None
        return {
            "id": row["id"],
            "project_id": row["project_id"],
            "mode": row["mode"],
            "status": row["status"],
            "done": row["done"],
            "total": row["total"],
            "current_index": row["current_index"],
            "width": row["width"],
            "height": row["height"],
            "seed": row["seed"],
            "negative_prompt": row["negative_prompt"],
            "prompts": _json_loads(row["prompts_json"], []),
            "results": _json_loads(row["results_json"], []),
            "items": _json_loads(row["items_json"], []),
            "error": row["error"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def create_job(self, job):
        now = time.time()
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO jobs (
                    id, project_id, mode, status, done, total, current_index,
                    width, height, seed, negative_prompt, prompts_json,
                    results_json, items_json, error, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    job["id"],
                    job.get("project_id") or "",
                    job.get("mode") or "image",
                    job["status"],
                    job.get("done", 0),
                    job.get("total", 0),
                    job.get("current_index", 0),
                    job.get("width", 1344),
                    job.get("height", 768),
                    job.get("seed", 42),
                    job.get("negative_prompt") or "",
                    _json_dumps(job.get("prompts") or []),
                    _json_dumps(job.get("results") or []),
                    _json_dumps(job.get("items") or []),
                    job.get("error") or "",
                    now,
                    now,
                ),
            )
            self._conn.commit()

    def update_job(self, job_id, **fields):
        mapping = {
            "status": "status",
            "done": "done",
            "total": "total",
            "current_index": "current_index",
            "error": "error",
            "results": ("results_json", _json_dumps),
            "items": ("items_json", _json_dumps),
        }
        sets = ["updated_at = ?"]
        params = [time.time()]
        for key, val in fields.items():
            if key not in mapping:
                continue
            spec = mapping[key]
            if isinstance(spec, tuple):
                col, conv = spec
                sets.append(f"{col} = ?")
                params.append(conv(val))
            else:
                sets.append(f"{spec} = ?")
                params.append(val)
        params.append(job_id)
        with self._lock:
            self._conn.execute(
                f"UPDATE jobs SET {', '.join(sets)} WHERE id = ?",
                params,
            )
            self._conn.commit()

    def get_job(self, job_id):
        with self._lock:
            row = self._conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        return self._row_to_job(row)

    def list_jobs(self, limit=30):
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?", (int(limit),)
            ).fetchall()
        return [self._row_to_job(r) for r in rows]

    # -------------------- Compositions --------------------

    @staticmethod
    def _row_to_composition(row):
        if row is None:
            return None
        fname = row["filename"] or ""
        keys = row.keys()
        proj_title = row["project_title"] if "project_title" in keys and row["project_title"] else ""
        return {
            "id": row["id"],
            "project_id": row["project_id"],
            "project_title": proj_title,
            "status": row["status"],
            "done": row["done"],
            "total": row["total"],
            "stage": row["stage"],
            "filename": fname,
            "video_url": f"/composed/{fname}" if fname else "",
            "encoder": row["encoder"],
            "width": row["width"],
            "height": row["height"],
            "fps": row["fps"],
            "duration": row["duration"],
            "shots": _json_loads(row["shots_json"], []),
            "error": row["error"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def create_composition(self, cjob):
        now = time.time()
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO compositions (
                    id, project_id, status, done, total, stage, filename,
                    encoder, width, height, fps, duration, shots_json, error,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    cjob["id"],
                    cjob.get("project_id") or "",
                    cjob["status"],
                    cjob.get("done", 0),
                    cjob.get("total", 0),
                    cjob.get("stage") or "",
                    cjob.get("filename") or "",
                    cjob.get("encoder") or "",
                    cjob.get("width", 1344),
                    cjob.get("height", 768),
                    cjob.get("fps", 30),
                    cjob.get("duration", 0.0),
                    _json_dumps(cjob.get("shots_meta") or []),
                    cjob.get("error") or "",
                    now,
                    now,
                ),
            )
            self._conn.commit()

    def update_composition(self, cid, **fields):
        allowed = {"status", "done", "total", "stage", "filename", "encoder", "duration", "error"}
        sets = ["updated_at = ?"]
        params = [time.time()]
        for key, val in fields.items():
            if key in allowed:
                sets.append(f"{key} = ?")
                params.append(val)
        params.append(cid)
        with self._lock:
            self._conn.execute(
                f"UPDATE compositions SET {', '.join(sets)} WHERE id = ?",
                params,
            )
            self._conn.commit()

    def get_composition(self, cid):
        with self._lock:
            row = self._conn.execute(
                """
                SELECT c.*, COALESCE(p.title, '') AS project_title
                FROM compositions c
                LEFT JOIN projects p ON c.project_id = p.id
                WHERE c.id = ?
                """,
                (cid,),
            ).fetchone()
        return self._row_to_composition(row)

    def list_compositions(self, limit=40, composed_dir=None):
        with self._lock:
            rows = self._conn.execute(
                """
                SELECT c.*, COALESCE(p.title, '') AS project_title
                FROM compositions c
                LEFT JOIN projects p ON c.project_id = p.id
                ORDER BY c.created_at DESC
                LIMIT ?
                """,
                (int(limit),),
            ).fetchall()
        out = []
        for row in rows:
            item = self._row_to_composition(row)
            if composed_dir and item["filename"]:
                item["file_exists"] = os.path.exists(os.path.join(composed_dir, item["filename"]))
            else:
                item["file_exists"] = bool(item["filename"])
            out.append(item)
        return out

    def delete_composition(self, cid, composed_dir=None):
        with self._lock:
            row = self._conn.execute(
                "SELECT filename FROM compositions WHERE id = ?", (cid,)
            ).fetchone()
            if row is None:
                return False
            fname = row["filename"]
            self._conn.execute("DELETE FROM compositions WHERE id = ?", (cid,))
            self._conn.commit()
        if composed_dir and fname:
            fpath = os.path.join(composed_dir, fname)
            if os.path.exists(fpath):
                os.remove(fpath)
        return True
