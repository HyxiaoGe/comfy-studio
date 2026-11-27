#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI 语音合成（TTS）客户端（纯 Python 标准库）
支持：
1. 阿里云百炼 DashScope (qwen3-tts-flash) —— 单 Key 开箱即用
2. 火山引擎 / 豆包 TTS HTTP v1 API
"""

import base64
import json
import os
import subprocess
import urllib.error
import urllib.request
import uuid

BAILIAN_ENDPOINT = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
DOUBAO_ENDPOINT = "https://openspeech.bytedance.com/api/v1/tts"

BAILIAN_VOICES = [
    {"value": "Cherry", "label": "Cherry · 阳光自然女声", "provider": "bailian"},
    {"value": "Serena", "label": "Serena · 温柔知性女声", "provider": "bailian"},
    {"value": "Ethan", "label": "Ethan · 温暖活力男声", "provider": "bailian"},
    {"value": "Chelsie", "label": "Chelsie · 甜美灵动女声", "provider": "bailian"},
]


def get_tts_config():
    dashscope_key = (os.environ.get("DASHSCOPE_API_KEY") or "").strip()
    bailian_model = (os.environ.get("BAILIAN_TTS_MODEL") or "qwen3-tts-flash").strip()
    default_voice = (os.environ.get("TTS_DEFAULT_VOICE") or "Cherry").strip()

    doubao_appid = (os.environ.get("DOUBAO_APPID") or "").strip()
    doubao_token = (os.environ.get("DOUBAO_ACCESS_TOKEN") or "").strip()
    doubao_cluster = (os.environ.get("DOUBAO_CLUSTER") or "volcano_tts").strip()
    doubao_voice = (
        os.environ.get("DOUBAO_VOICE_TYPE") or "zh_male_M392_conversation_wvae_bigtts"
    ).strip()

    preferred = (os.environ.get("TTS_PROVIDER") or "").strip().lower()
    providers = []
    if dashscope_key:
        providers.append("bailian")
    if doubao_appid and doubao_token:
        providers.append("doubao")

    active = preferred if preferred in providers else (providers[0] if providers else "")
    voices = list(BAILIAN_VOICES)
    if "doubao" in providers:
        voices.append({
            "value": doubao_voice,
            "label": f"豆包音色 ({doubao_voice[:18]})",
            "provider": "doubao",
        })

    return {
        "configured": bool(providers),
        "active_provider": active,
        "providers": providers,
        "dashscope_key": dashscope_key,
        "bailian_model": bailian_model,
        "default_voice": default_voice if active == "bailian" else doubao_voice,
        "doubao_appid": doubao_appid,
        "doubao_token": doubao_token,
        "doubao_cluster": doubao_cluster,
        "doubao_voice": doubao_voice,
        "voices": voices,
    }


def is_tts_configured():
    return get_tts_config()["configured"]


def probe_audio_duration(audio_path):
    """使用 ffprobe 精确读取音频时长（秒）。"""
    try:
        r = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                audio_path,
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if r.returncode == 0 and (r.stdout or "").strip():
            return round(max(0.1, float(r.stdout.strip())), 2)
    except Exception:  # noqa: BLE001
        pass
    return 0.0


def _http_post_json(url, payload, headers, timeout=45):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"TTS API 返回 HTTP {e.code}：{body[:400]}") from e
    except Exception as e:  # noqa: BLE001
        raise RuntimeError(f"调用 TTS 接口失败：{e}") from e


def _download_bytes(url, timeout=45):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return resp.read()
    except Exception as e:  # noqa: BLE001
        raise RuntimeError(f"下载合成音频失败：{e}") from e


def _synth_bailian(text, voice, cfg):
    payload = {
        "model": cfg["bailian_model"],
        "input": {"text": text},
        "parameters": {
            "voice": voice or cfg["default_voice"] or "Cherry",
            "language_type": "Chinese",
        },
    }
    resp = _http_post_json(
        BAILIAN_ENDPOINT,
        payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {cfg['dashscope_key']}",
        },
    )
    audio_obj = (resp.get("output") or {}).get("audio") or {}
    audio_url = audio_obj.get("url")
    audio_b64 = audio_obj.get("data")
    if audio_url:
        raw = _download_bytes(audio_url)
        ext = ".mp3" if ".mp3" in audio_url.lower() else ".wav"
        return raw, ext
    if audio_b64:
        return base64.b64decode(audio_b64), ".wav"
    raise RuntimeError(f"百炼 TTS 未返回音频：{resp}")


def _synth_doubao(text, voice, cfg):
    voice_type = voice or cfg["doubao_voice"]
    payload = {
        "app": {
            "appid": cfg["doubao_appid"],
            "token": cfg["doubao_token"],
            "cluster": cfg["doubao_cluster"],
        },
        "user": {"uid": "comfy_studio"},
        "audio": {
            "voice_type": voice_type,
            "encoding": "mp3",
            "speed_ratio": 1.0,
            "volume_ratio": 1.0,
            "pitch_ratio": 1.0,
        },
        "request": {
            "reqid": str(uuid.uuid4()),
            "text": text,
            "text_type": "plain",
            "operation": "query",
        },
    }
    resp = _http_post_json(
        DOUBAO_ENDPOINT,
        payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer;{cfg['doubao_token']}",
        },
    )
    if resp.get("code") not in (None, 3000):
        raise RuntimeError(f"豆包 TTS 错误 {resp.get('code')}：{resp.get('message')}")
    b64 = resp.get("data")
    if not b64:
        raise RuntimeError(f"豆包 TTS 未返回音频数据：{resp}")
    return base64.b64decode(b64), ".mp3"


def synthesize_speech(text, out_dir, voice=None, provider=None):
    """
    将单段中文旁白合成为本地音频文件并测量精准时长。
    返回: {"filename": ..., "path": ..., "duration": float, "provider": ..., "voice": ...}
    """
    clean = (text or "").strip()
    if not clean:
        raise ValueError("旁白文本不能为空")

    cfg = get_tts_config()
    if not cfg["configured"]:
        raise RuntimeError(
            "未配置 TTS API Key，请在 .env 中配置 DASHSCOPE_API_KEY（百炼）或 DOUBAO_APPID / DOUBAO_ACCESS_TOKEN（豆包）"
        )

    chosen_provider = (provider or "").strip().lower()
    if chosen_provider not in cfg["providers"]:
        chosen_provider = cfg["active_provider"]

    if chosen_provider == "bailian":
        chosen_voice = voice or cfg["default_voice"] or "Cherry"
        raw, ext = _synth_bailian(clean, chosen_voice, cfg)
    else:
        chosen_voice = voice or cfg["doubao_voice"]
        raw, ext = _synth_doubao(clean, chosen_voice, cfg)

    os.makedirs(out_dir, exist_ok=True)
    fname = f"tts_{uuid.uuid4().hex[:12]}{ext}"
    fpath = os.path.join(out_dir, fname)
    with open(fpath, "wb") as f:
        f.write(raw)

    dur = probe_audio_duration(fpath)
    return {
        "filename": fname,
        "path": os.path.abspath(fpath),
        "duration": dur,
        "provider": chosen_provider,
        "voice": chosen_voice,
    }
