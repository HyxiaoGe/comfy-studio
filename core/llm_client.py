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


VALID_MOTIONS = {"zoom_in", "zoom_out", "pan_left", "pan_right", "static"}
DEFAULT_MOTION_CYCLE = ["zoom_in", "pan_right", "zoom_out", "pan_left"]


def generate_storyboard(
    idea,
    shot_count=6,
    visual_style="",
    narration_style="绘本故事",
    timeout=90,
):
    """
    根据用户一句话故事创意，调用大模型一次性生成完整分镜剧本：
    标题、公共英文画风/角色前缀、负提示词、每镜英文画面词、中文旁白、运镜与时长。
    """
    cfg = get_llm_config()
    if not cfg["api_key"]:
        raise RuntimeError(
            "未配置 DEEPSEEK_API_KEY（或 LLM_API_KEY），请先在项目根目录 .env 或环境变量中设置"
        )
    clean_idea = (idea or "").strip()
    if not clean_idea:
        raise ValueError("请输入故事创意或主题描述")

    count = max(2, min(12, int(shot_count or 6)))
    style_hint = (visual_style or "").strip()

    system_msg = (
        "你是一位兼具 SDXL AI 绘画导演与中文短视频编剧能力的分镜总监。\n"
        "请根据用户的创意主题，设计一套结构完整、主角与画风高度一致的短视频分镜剧本，并严格以 JSON 对象返回。\n"
        "输出格式：\n"
        "{\n"
        '  "title": "简短吸引人的中文项目标题（4~12字）",\n'
        '  "prefix": "英文公共画风与主角设定前缀，用于锁死全片画风、色调与主角外貌特征，末尾带 no text",\n'
        '  "negative_prompt": "英文通用负提示词（包含 blurry, low quality, text, watermark 等）",\n'
        '  "shots": [\n'
        "    {\n"
        '      "prompt": "英文单镜画面描述（包含景别如 wide shot/close-up/low angle、动作、构图、光线与环境细节，不要重复 prefix 里的完整画风描述）",\n'
        '      "narration": "对应的中文口语化旁白解说词（10~24个汉字，贴合3~5秒阅读节奏，不要出现第几镜或括号舞台提示）",\n'
        '      "motion": "zoom_in | zoom_out | pan_left | pan_right | static",\n'
        '      "duration": 4\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "要求：\n"
        f"1. shots 数组长度必须严格等于 {count}；\n"
        "2. 镜头景别与运镜要交替有节奏（开场全景定调 → 中景/特写推进 → 动作转折 → 温暖或升华收尾）；\n"
        "3. prefix 与每镜 prompt 必须使用英文（SDXL 对英文描述理解最稳定），title 与 narration 必须使用自然流畅的简体中文；\n"
        "4. duration 只能取 3、4 或 5；motion 只能从 zoom_in、zoom_out、pan_left、pan_right、static 中选择；\n"
        "5. 只输出严格合法的 JSON 对象，不要输出任何额外说明文字。"
    )

    user_msg = (
        f"创意主题：{clean_idea}\n"
        f"期望分镜数量：{count} 镜\n"
        f"旁白风格：{narration_style or '绘本故事'}\n"
        f"画风参考（如有）：{style_hint or '请根据主题自动匹配最合适的插画、水彩、电影或扁平矢量画风'}\n"
    )

    payload = {
        "model": cfg["model"],
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.75,
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

    raw_shots = parsed.get("shots")
    if not isinstance(raw_shots, list) or not raw_shots:
        raise RuntimeError(f"大模型未返回有效的 shots 分镜列表：{parsed}")

    shots = []
    for idx, item in enumerate(raw_shots[:count]):
        if not isinstance(item, dict):
            continue
        motion = str(item.get("motion") or "").strip().lower()
        if motion not in VALID_MOTIONS:
            motion = DEFAULT_MOTION_CYCLE[idx % len(DEFAULT_MOTION_CYCLE)]
        try:
            dur = int(round(float(item.get("duration") or 4)))
        except (TypeError, ValueError):
            dur = 4
        if dur not in (3, 4, 5):
            dur = 4
        shots.append({
            "prompt": str(item.get("prompt") or "").strip(),
            "narration": str(item.get("narration") or "").strip(),
            "motion": motion,
            "duration": dur,
        })

    if not shots:
        raise RuntimeError("大模型生成的分镜列表为空")

    return {
        "storyboard": {
            "title": str(parsed.get("title") or clean_idea[:16]).strip(),
            "prefix": str(parsed.get("prefix") or style_hint).strip(),
            "negative_prompt": str(
                parsed.get("negative_prompt")
                or "photorealistic, 3d render, blurry, low quality, distorted anatomy, text, watermark"
            ).strip(),
            "shots": shots,
        },
        "model": raw.get("model") or cfg["model"],
    }
