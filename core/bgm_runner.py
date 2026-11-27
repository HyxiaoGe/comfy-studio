#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ComfyUI AI 配乐工作流构参工具 —— ACE-Step 1.5（纯 Python 标准库）
"""

import copy


def build_bgm_workflow(
    template,
    tags,
    lyrics="[Instrumental]",
    duration=24.0,
    seed=42,
    bpm=96,
    filename_prefix="audio/comfy_studio_bgm",
):
    """基于 ACE-Step 1.5 API 模板填充风格词、歌词、时长、BPM 与随机种子。"""
    wf = copy.deepcopy(template)
    clean_tags = (tags or "").strip() or "Warm gentle acoustic piano and strings instrumental"
    clean_lyrics = (lyrics or "").strip() or "[Instrumental]"
    try:
        dur = max(5.0, min(180.0, float(duration or 24.0)))
    except (TypeError, ValueError):
        dur = 24.0
    try:
        bpm_val = max(40, min(220, int(round(float(bpm or 96)))))
    except (TypeError, ValueError):
        bpm_val = 96
    try:
        seed_val = max(0, int(seed))
    except (TypeError, ValueError):
        seed_val = 42

    for node in wf.values():
        if not isinstance(node, dict):
            continue
        cls = node.get("class_type") or ""
        inputs = node.get("inputs") or {}
        if cls == "TextEncodeAceStepAudio1.5":
            inputs["tags"] = clean_tags
            inputs["lyrics"] = clean_lyrics
            inputs["duration"] = dur
            inputs["seed"] = seed_val
            inputs["bpm"] = bpm_val
        elif cls == "EmptyAceStep1.5LatentAudio":
            inputs["seconds"] = dur
        elif cls == "KSampler":
            inputs["seed"] = seed_val
        elif cls in ("SaveAudioMP3", "SaveAudio", "SaveAudioAdvanced"):
            inputs["filename_prefix"] = filename_prefix
    return wf
