#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
大模型分镜解说词客户端（纯 Python 标准库，默认对接 DeepSeek / OpenAI 兼容接口）
"""

import json
import os
import re
import urllib.error
import urllib.request

DEFAULT_BASE_URL = "https://api.deepseek.com"
DEFAULT_MODEL = "deepseek-chat"


def load_dotenv(env_path):
    """轻量读取 .env 文件到 os.environ（不覆盖已存在的环境变量）。"""
    if not env_path or not os.path.isfile(env_path):
        return
    with open(env_path, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val


def get_llm_config():
    api_key = (
        os.environ.get("LLM_API_KEY")
        or os.environ.get("DEEPSEEK_API_KEY")
        or ""
    ).strip()
    base_url = (os.environ.get("LLM_BASE_URL") or DEFAULT_BASE_URL).strip().rstrip("/")
    model = (os.environ.get("LLM_MODEL") or DEFAULT_MODEL).strip()
    return {
        "api_key": api_key,
        "base_url": base_url,
        "model": model,
    }


def is_llm_configured():
    return bool(get_llm_config()["api_key"])


def _chat_endpoint(base_url):
    if base_url.endswith("/chat/completions"):
        return base_url
    if base_url.endswith("/v1"):
        return base_url + "/chat/completions"
    return base_url + "/v1/chat/completions"


def _extract_json_obj(text):
    cleaned = (text or "").strip()
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.S)
    if fence:
        cleaned = fence.group(1)
    else:
        brace = re.search(r"\{.*\}", cleaned, re.S)
        if brace:
            cleaned = brace.group(0)
    return json.loads(cleaned)


def generate_narrations(title, prefix, shots, style="绘本故事", timeout=60):
    """
    根据分镜列表调用 DeepSeek 生成连贯的中文旁白解说词列表。
    shots: [{"prompt": "...", "duration": 4}, ...]
    返回: {"narrations": [...], "model": "..."}
    """
    cfg = get_llm_config()
    if not cfg["api_key"]:
        raise RuntimeError(
            "未配置 DEEPSEEK_API_KEY（或 LLM_API_KEY），请先在项目根目录 .env 或环境变量中设置"
        )
    if not shots:
        raise ValueError("shots 不能为空")

    shot_lines = []
    for idx, s in enumerate(shots):
        dur = s.get("duration") or 4
        prompt = (s.get("prompt") or "").strip() or "空镜头"
        shot_lines.append(f"第 {idx + 1} 镜（约 {dur} 秒）：{prompt}")

    system_msg = (
        "你是一位擅长短视频与绘本叙事的中文分镜编剧。"
        "请根据提供的故事主题、公共画风与逐镜画面描述，为每一镜撰写一句自然、口语化、有画面感的中文旁白解说词。\n"
        "要求：\n"
        "1. 严格按顺序输出与输入分镜数量完全一致的数组；\n"
        "2. 每镜解说词贴合对应秒数节奏（3~5 秒大约 10~24 个汉字），避免长难句；\n"
        "3. 全片连贯有起承转合，不要在解说词正文里写“第一镜”“旁白：”等编号或舞台指示；\n"
        "4. 只输出严格 JSON 对象，格式为：{\"narrations\": [\"第1镜解说\", \"第2镜解说\", ...]}。"
    )

    user_msg = (
        f"项目名称：{title or '未命名故事'}\n"
        f"旁白风格：{style or '绘本故事'}\n"
        f"公共画风与主角设定：{prefix or '无'}\n\n"
        f"分镜列表（共 {len(shots)} 镜）：\n" + "\n".join(shot_lines)
    )

    payload = {
        "model": cfg["model"],
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.7,
        "response_format": {"type": "json_object"},
    }

    url = _chat_endpoint(cfg["base_url"])
    req = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {cfg['api_key']}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"DeepSeek API 返回 HTTP {e.code}：{err_body[:400]}") from e
    except Exception as e:  # noqa: BLE001
        raise RuntimeError(f"调用大模型接口失败：{e}") from e

    choices = raw.get("choices") or []
    if not choices:
        raise RuntimeError(f"大模型返回为空：{raw}")
    content = (choices[0].get("message") or {}).get("content") or ""
    try:
        parsed = _extract_json_obj(content)
    except Exception as e:  # noqa: BLE001
        raise RuntimeError(f"大模型输出 JSON 解析失败：{content[:300]}") from e

    arr = parsed.get("narrations")
    if not isinstance(arr, list):
        raise RuntimeError(f"大模型未返回 narrations 数组：{parsed}")

    cleaned = [str(x).strip() for x in arr[: len(shots)]]
    while len(cleaned) < len(shots):
        cleaned.append("")

    return {
        "narrations": cleaned,
        "model": raw.get("model") or cfg["model"],
    }
