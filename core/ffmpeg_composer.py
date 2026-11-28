#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FFmpeg 静态分镜运镜合成器（纯 Python 标准库调用 ffmpeg）
支持 Ken Burns 推拉/平移运镜、多转场样式、ASS 中文字幕烧录、逐镜 TTS 语音配音对齐与 BGM 混音淡出、
优先 h264_nvenc 硬编码并自动回退 libx264。
"""

import json
import os
import shutil
import subprocess
import tempfile

from core.tts_client import probe_audio_duration

SUPPORTED_MOTIONS = {
    "zoom_in",
    "zoom_out",
    "pan_left",
    "pan_right",
    "pan",
    "static",
}

SUPPORTED_TRANSITIONS = {
    "fade",
    "dissolve",
    "wipeleft",
    "none",
}

DEFAULT_FPS = 30
DEFAULT_DURATION = 4.0
DEFAULT_TRANSITION = 0.5


def ensure_even(value, fallback):
    try:
        n = int(value)
    except (TypeError, ValueError):
        n = fallback
    n = max(256, min(3840, n))
    return n - (n % 2)


def has_ffmpeg():
    return shutil.which("ffmpeg") is not None


def has_subtitle_filter():
    if not has_ffmpeg():
        return False
    try:
        r = subprocess.run(
            ["ffmpeg", "-hide_banner", "-filters"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        out = r.stdout or ""
        return r.returncode == 0 and (" ass " in out or " subtitles " in out)
    except Exception:  # noqa: BLE001
        return False


def detect_nvenc():
    """探测当前 ffmpeg 是否编入了 h264_nvenc（实际运行仍可能因无显卡驱动而失败并触发回退）。"""
    if not has_ffmpeg():
        return False
    try:
        r = subprocess.run(
            ["ffmpeg", "-hide_banner", "-encoders"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return r.returncode == 0 and "h264_nvenc" in (r.stdout or "")
    except Exception:  # noqa: BLE001
        return False


def build_motion_filter(motion, width, height, duration, fps):
    """生成单张静图的 Ken Burns 滤镜链（超采样严格控制在 2x 目标宽度以内）。"""
    motion = (motion or "zoom_in").strip().lower()
    if motion not in SUPPORTED_MOTIONS:
        motion = "zoom_in"
    if motion == "pan":
        motion = "pan_right"

    frames = max(1, int(round(float(duration) * fps)))
    denom = max(1, frames - 1)
    oversample_w = width * 2
    oversample_h = height * 2
    prep = (
        f"scale={oversample_w}:{oversample_h}:force_original_aspect_ratio=increase,"
        f"crop={oversample_w}:{oversample_h},setsar=1"
    )

    if motion == "static":
        return (
            f"scale={width}:{height}:force_original_aspect_ratio=increase,"
            f"crop={width}:{height},setsar=1,fps={fps},format=yuv420p"
        )

    if motion == "zoom_in":
        zoom_expr = f"1+0.14*on/{denom}"
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = "ih/2-(ih/zoom/2)"
    elif motion == "zoom_out":
        zoom_expr = f"1.14-0.14*on/{denom}"
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = "ih/2-(ih/zoom/2)"
    elif motion == "pan_left":
        zoom_expr = "1.12"
        x_expr = f"(iw-iw/zoom)*(1-on/{denom})"
        y_expr = "ih/2-(ih/zoom/2)"
    else:  # pan_right
        zoom_expr = "1.12"
        x_expr = f"(iw-iw/zoom)*(on/{denom})"
        y_expr = "ih/2-(ih/zoom/2)"

    zp = (
        f"zoompan=z='{zoom_expr}':x='{x_expr}':y='{y_expr}'"
        f":d={frames}:s={width}x{height}:fps={fps}"
    )
    return f"{prep},{zp},format=yuv420p"


def _run_ffmpeg(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout or "ffmpeg 执行失败")[-800:])
    return r


def _encode_args(use_nvenc):
    if use_nvenc:
        return ["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "20"]
    return ["-c:v", "libx264", "-preset", "fast", "-crf", "20"]


def probe_media_info(path):
    """使用 ffprobe 检测媒体文件的时长及是否包含视频/音频流。"""
    if not path or not os.path.isfile(path):
        return {"duration": 0.0, "has_video": False, "has_audio": False}
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        return {"duration": 0.0, "has_video": True, "has_audio": False}
    try:
        r = subprocess.run(
            [
                ffprobe,
                "-v",
                "error",
                "-show_entries",
                "format=duration:stream=codec_type",
                "-of",
                "json",
                path,
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if r.returncode != 0:
            return {"duration": 0.0, "has_video": True, "has_audio": False}
        data = json.loads(r.stdout or "{}")
        dur_raw = (data.get("format") or {}).get("duration")
        try:
            dur = max(0.0, float(dur_raw or 0.0))
        except (TypeError, ValueError):
            dur = 0.0
        streams = data.get("streams") or []
        has_v = any(s.get("codec_type") == "video" for s in streams)
        has_a = any(s.get("codec_type") == "audio" for s in streams)
        return {"duration": dur, "has_video": has_v, "has_audio": has_a}
    except Exception:  # noqa: BLE001
        return {"duration": 0.0, "has_video": True, "has_audio": False}


def render_shot_clip(image_path, out_clip_path, motion, width, height, duration, fps):
    """将单张静态图渲染为带运镜的中间视频片段。"""
    vf = build_motion_filter(motion, width, height, duration, fps)
    motion_norm = (motion or "zoom_in").strip().lower()
    cmd = ["ffmpeg", "-y"]
    if motion_norm == "static":
        cmd += ["-loop", "1", "-t", f"{duration:.3f}", "-i", image_path]
    else:
        cmd += ["-i", image_path]
    cmd += [
        "-vf", vf,
        "-an",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "16",
        "-pix_fmt", "yuv420p",
        out_clip_path,
    ]
    _run_ffmpeg(cmd)


def render_video_shot_clip(video_path, out_clip_path, width, height, duration, fps, src_duration=0.0):
    """将 AI 视频分镜片段统一缩放裁切为目标分辨率、帧率与时长（不足时尾帧定格补齐）。"""
    vf_parts = [
        f"scale={width}:{height}:force_original_aspect_ratio=increase",
        f"crop={width}:{height}",
        "setsar=1",
        f"fps={fps}",
    ]
    if src_duration > 0 and duration > src_duration + 0.05:
        pad_s = max(0.05, duration - src_duration)
        vf_parts.append(f"tpad=stop_mode=clone:stop_duration={pad_s:.3f}")
    vf_parts.append("format=yuv420p")
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-t", f"{duration:.3f}",
        "-vf", ",".join(vf_parts),
        "-an",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "16",
        "-pix_fmt", "yuv420p",
        out_clip_path,
    ]
    _run_ffmpeg(cmd)


def _format_ass_time(sec):
    total_cs = max(0, int(round(sec * 100)))
    h = total_cs // 360000
    m = (total_cs % 360000) // 6000
    s = (total_cs % 6000) // 100
    cs = total_cs % 100
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def _write_ass_subtitles(entries, ass_path, width, height):
    font_size = max(22, min(52, int(round(height * 0.046))))
    margin_v = max(24, int(round(height * 0.055)))
    header = (
        "[Script Info]\n"
        "ScriptType: v4.00+\n"
        f"PlayResX: {width}\n"
        f"PlayResY: {height}\n"
        "WrapStyle: 1\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, "
        "Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Default,Noto Sans CJK SC,{font_size},&H00FFFFFF,&H000000FF,&H80000000,&H99000000,"
        f"0,0,0,0,100,100,0,0,3,8,0,2,48,48,{margin_v},1\n\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    lines = [header]
    for start_s, end_s, text in entries:
        clean = (text or "").replace("\r", " ").replace("\n", "\\N").strip()
        if not clean or end_s <= start_s:
            continue
        lines.append(
            f"Dialogue: 0,{_format_ass_time(start_s)},{_format_ass_time(end_s)},Default,,0,0,0,,{clean}\n"
        )
    with open(ass_path, "w", encoding="utf-8") as f:
        f.writelines(lines)


def _escape_filter_path(path):
    return path.replace("\\", "/").replace(":", "\\:").replace("'", "\\'")


def _concat_with_xfade(
    clip_entries,
    out_path,
    transition,
    transition_type,
    fps,
    use_nvenc,
    ass_path=None,
    tts_events=None,
    video_audio_events=None,
    bgm_path=None,
    bgm_volume=0.35,
    total_duration=0.0,
):
    """将多段中间视频用 xfade 转场拼接，可选烧录 ASS 字幕、逐镜 TTS 配音、AI 原生环境音与循环淡出 BGM。"""
    cmd = ["ffmpeg", "-y"]
    for clip_path, _dur in clip_entries:
        cmd += ["-i", clip_path]

    next_input_idx = len(clip_entries)
    tts_inputs = []
    for start_s, tpath in (tts_events or []):
        tts_inputs.append((next_input_idx, start_s))
        cmd += ["-i", tpath]
        next_input_idx += 1

    va_inputs = []
    for start_s, clip_dur, vpath in (video_audio_events or []):
        va_inputs.append((next_input_idx, start_s, clip_dur))
        cmd += ["-i", vpath]
        next_input_idx += 1

    bgm_idx = None
    if bgm_path:
        bgm_idx = next_input_idx
        cmd += ["-stream_loop", "-1", "-i", bgm_path]
        next_input_idx += 1

    t_type = transition_type if transition_type in SUPPORTED_TRANSITIONS else "fade"
    if t_type == "none":
        transition = 0.0

    filter_parts = []
    if len(clip_entries) == 1 or transition <= 0:
        if len(clip_entries) == 1:
            filter_parts.append(f"[0:v]fps={fps}[vjoined]")
        else:
            inputs_tag = ""
            for idx in range(len(clip_entries)):
                filter_parts.append(f"[{idx}:v]fps={fps},setpts=PTS-STARTPTS[v{idx}]")
                inputs_tag += f"[v{idx}]"
            filter_parts.append(f"{inputs_tag}concat=n={len(clip_entries)}:v=1:a=0[vjoined]")
    else:
        for idx in range(len(clip_entries)):
            filter_parts.append(f"[{idx}:v]fps={fps},setpts=PTS-STARTPTS[v{idx}]")
        offset = max(0.1, clip_entries[0][1] - transition)
        prev_label = "v0"
        for idx in range(1, len(clip_entries)):
            out_label = "vjoined" if idx == len(clip_entries) - 1 else f"xf{idx}"
            filter_parts.append(
                f"[{prev_label}][v{idx}]xfade=transition={t_type}:duration={transition:.3f}:offset={offset:.3f}[{out_label}]"
            )
            prev_label = out_label
            offset += max(0.1, clip_entries[idx][1] - transition)

    if ass_path:
        esc = _escape_filter_path(ass_path)
        filter_parts.append(f"[vjoined]ass='{esc}',format=yuv420p[vfinal]")
    else:
        filter_parts.append("[vjoined]format=yuv420p[vfinal]")

    map_args = ["-map", "[vfinal]"]
    audio_enc = []
    mix_labels = []

    for idx, (inp_idx, start_s) in enumerate(tts_inputs):
        delay_ms = max(0, int(round(start_s * 1000)))
        lbl = f"tts{idx}"
        filter_parts.append(
            f"[{inp_idx}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,"
            f"adelay={delay_ms}|{delay_ms}[{lbl}]"
        )
        mix_labels.append(f"[{lbl}]")

    va_vol = 0.28 if tts_inputs else 0.90
    for idx, (inp_idx, start_s, clip_dur) in enumerate(va_inputs):
        delay_ms = max(0, int(round(start_s * 1000)))
        lbl = f"va{idx}"
        filter_parts.append(
            f"[{inp_idx}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,"
            f"atrim=0:{max(0.1, clip_dur):.3f},asetpts=PTS-STARTPTS,"
            f"volume={va_vol:.2f},adelay={delay_ms}|{delay_ms}[{lbl}]"
        )
        mix_labels.append(f"[{lbl}]")

    if bgm_idx is not None:
        raw_vol = max(0.05, min(1.5, float(bgm_volume or 0.35)))
        # 有旁白人声时自动把 BGM 压低一档（ducking），保证人声清晰
        eff_vol = raw_vol * 0.45 if tts_inputs else raw_vol
        fade_len = min(1.5, max(0.3, total_duration * 0.2))
        fade_start = max(0.0, total_duration - fade_len)
        filter_parts.append(
            f"[{bgm_idx}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,"
            f"atrim=0:{total_duration:.3f},asetpts=PTS-STARTPTS,"
            f"volume={eff_vol:.2f},afade=t=out:st={fade_start:.3f}:d={fade_len:.3f}[bgm]"
        )
        mix_labels.append("[bgm]")

    if len(mix_labels) == 1:
        single = mix_labels[0]
        filter_parts.append(
            f"{single}apad,atrim=0:{total_duration:.3f},asetpts=PTS-STARTPTS[afinal]"
        )
        map_args += ["-map", "[afinal]"]
        audio_enc = ["-c:a", "aac", "-b:a", "192k", "-shortest"]
    elif len(mix_labels) > 1:
        filter_parts.append(
            f"{''.join(mix_labels)}amix=inputs={len(mix_labels)}:duration=longest:normalize=0,"
            f"apad,atrim=0:{total_duration:.3f},asetpts=PTS-STARTPTS[afinal]"
        )
        map_args += ["-map", "[afinal]"]
        audio_enc = ["-c:a", "aac", "-b:a", "192k", "-shortest"]

    cmd += [
        "-filter_complex", ";".join(filter_parts),
        *map_args,
        *_encode_args(use_nvenc),
        *audio_enc,
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        out_path,
    ]
    _run_ffmpeg(cmd)


def compose_storyboard_video(
    shots,
    out_path,
    width=1344,
    height=768,
    fps=DEFAULT_FPS,
    transition=DEFAULT_TRANSITION,
    transition_type="fade",
    burn_subtitles=True,
    auto_align_tts=True,
    bgm_path=None,
    bgm_volume=0.35,
    progress_cb=None,
):
    """
    将一组静态分镜图片合成为带 Ken Burns 运镜、转场、字幕、逐镜 TTS 配音与 BGM 的完整 MP4。
    shots: [{"path": "...", "motion": "zoom_in", "duration": 4.0, "narration": "...", "tts_path": "..."}, ...]
    """
    if not has_ffmpeg():
        raise RuntimeError("未检测到 ffmpeg，请先安装 ffmpeg 并确保它在 PATH 中")
    if not shots:
        raise ValueError("shots 不能为空")

    w = ensure_even(width, 1344)
    h = ensure_even(height, 768)
    fps = max(15, min(60, int(fps or DEFAULT_FPS)))
    t_type = (transition_type or "fade").strip().lower()
    if t_type not in SUPPORTED_TRANSITIONS:
        t_type = "fade"
    trans = 0.0 if t_type == "none" else max(0.0, min(1.5, float(transition if transition is not None else DEFAULT_TRANSITION)))

    if bgm_path and not os.path.isfile(bgm_path):
        raise FileNotFoundError("找不到背景音乐文件：%s" % bgm_path)

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    total_steps = len(shots) + 1

    with tempfile.TemporaryDirectory(prefix="comfy_compose_") as tmp_dir:
        clip_entries = []
        sub_entries = []
        tts_events = []
        video_audio_events = []
        cursor = 0.0

        for idx, shot in enumerate(shots):
            vpath = shot.get("video_path")
            use_video = bool(shot.get("use_video", bool(vpath))) and bool(vpath and os.path.isfile(vpath))
            img_path = shot.get("path")
            if not use_video and (not img_path or not os.path.exists(img_path)):
                raise FileNotFoundError("找不到分镜素材：%s" % (img_path or vpath or ""))

            dur = float(shot.get("duration") or (5.0 if use_video else DEFAULT_DURATION))
            dur = max(1.0, min(15.0, dur))

            v_info = probe_media_info(vpath) if use_video else {"duration": 0.0, "has_audio": False}
            if use_video and v_info["duration"] > 0:
                dur = max(dur, min(15.0, v_info["duration"]))

            tts_path = shot.get("tts_path")
            if tts_path and os.path.isfile(tts_path):
                tts_dur = probe_audio_duration(tts_path)
                if auto_align_tts and tts_dur > 0:
                    pad = (trans + 0.25) if idx < len(shots) - 1 else 0.45
                    dur = max(dur, min(15.0, tts_dur + pad))
            else:
                tts_path = None

            if len(shots) > 1 and trans > 0 and dur <= trans + 0.2:
                dur = trans + 0.5

            clip_path = os.path.join(tmp_dir, f"clip_{idx:03d}.mp4")
            if use_video:
                if progress_cb:
                    progress_cb(idx, total_steps, f"正在处理第 {idx + 1}/{len(shots)} 镜 AI 视频片段")
                render_video_shot_clip(
                    vpath, clip_path, w, h, dur, fps, src_duration=v_info["duration"]
                )
            else:
                motion = shot.get("motion") or "zoom_in"
                if progress_cb:
                    progress_cb(idx, total_steps, f"正在渲染第 {idx + 1}/{len(shots)} 镜运镜 ({motion})")
                render_shot_clip(img_path, clip_path, motion, w, h, dur, fps)
            clip_entries.append((clip_path, dur))

            start_t = cursor + (trans * 0.55 if idx > 0 and trans > 0 else 0.0)
            if tts_path:
                tts_events.append((start_t, tts_path))
            if use_video and shot.get("use_video_audio", True) and v_info["has_audio"]:
                va_dur = min(dur, v_info["duration"] or dur)
                video_audio_events.append((start_t, va_dur, vpath))

            narr = (shot.get("narration") or "").strip()
            if narr:
                if idx < len(shots) - 1:
                    next_start_t = (cursor + dur - trans) + (trans * 0.55 if trans > 0 else 0.0)
                    end_t = next_start_t - 0.08
                else:
                    end_t = cursor + dur - 0.08
                sub_entries.append((start_t, max(start_t + 0.25, end_t), narr))

            cursor += dur - (trans if idx < len(shots) - 1 and trans > 0 else 0.0)

        # 确保相邻字幕严格不重叠，防止 libass 触发碰撞上抬导致上下跳动
        for i in range(len(sub_entries) - 1):
            s_cur, e_cur, txt_cur = sub_entries[i]
            s_next = sub_entries[i + 1][0]
            if e_cur > s_next - 0.05:
                sub_entries[i] = (s_cur, max(s_cur + 0.1, s_next - 0.05), txt_cur)

        total_duration = sum(d for _, d in clip_entries)
        if len(clip_entries) > 1 and trans > 0:
            total_duration -= trans * (len(clip_entries) - 1)
        total_duration = max(0.1, total_duration)

        ass_path = None
        subtitles_burned = False
        if burn_subtitles and sub_entries and has_subtitle_filter():
            ass_path = os.path.join(tmp_dir, "captions.ass")
            _write_ass_subtitles(sub_entries, ass_path, w, h)
            subtitles_burned = True

        if progress_cb:
            progress_cb(len(shots), total_steps, "正在合成转场、配音与音轨…")

        use_nvenc = detect_nvenc()
        encoder_used = "libx264"
        if use_nvenc:
            try:
                _concat_with_xfade(
                    clip_entries,
                    out_path,
                    trans,
                    t_type,
                    fps,
                    use_nvenc=True,
                    ass_path=ass_path,
                    tts_events=tts_events,
                    video_audio_events=video_audio_events,
                    bgm_path=bgm_path,
                    bgm_volume=bgm_volume,
                    total_duration=total_duration,
                )
                encoder_used = "h264_nvenc"
            except Exception:  # noqa: BLE001
                _concat_with_xfade(
                    clip_entries,
                    out_path,
                    trans,
                    t_type,
                    fps,
                    use_nvenc=False,
                    ass_path=ass_path,
                    tts_events=tts_events,
                    video_audio_events=video_audio_events,
                    bgm_path=bgm_path,
                    bgm_volume=bgm_volume,
                    total_duration=total_duration,
                )
                encoder_used = "libx264"
        else:
            _concat_with_xfade(
                clip_entries,
                out_path,
                trans,
                t_type,
                fps,
                use_nvenc=False,
                ass_path=ass_path,
                tts_events=tts_events,
                video_audio_events=video_audio_events,
                bgm_path=bgm_path,
                bgm_volume=bgm_volume,
                total_duration=total_duration,
            )

    if progress_cb:
        progress_cb(total_steps, total_steps, "成片导出完成")

    return {
        "out_path": os.path.abspath(out_path),
        "encoder": encoder_used,
        "width": w,
        "height": h,
        "fps": fps,
        "duration": round(total_duration, 2),
        "subtitles_burned": subtitles_burned,
        "has_audio": bool(bgm_path or tts_events),
        "tts_count": len(tts_events),
    }
