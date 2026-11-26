#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FFmpeg 静态分镜运镜合成器（纯 Python 标准库调用 ffmpeg）
支持 Ken Burns 推拉/平移运镜、淡入淡出转场、优先 h264_nvenc 硬编码并自动回退 libx264。
"""

import os
import shutil
import subprocess
import tempfile

SUPPORTED_MOTIONS = {
    "zoom_in",
    "zoom_out",
    "pan_left",
    "pan_right",
    "pan",
    "static",
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
    # 2x 超采样：先按覆盖比例放大再中心裁剪为 2*W x 2*H，既兼容任意原图比例又限制算力开销
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


def _concat_with_xfade(clip_entries, out_path, transition, fps, use_nvenc):
    """将多段中间视频用 xfade 淡入淡出转场拼接并输出最终成片。"""
    cmd = ["ffmpeg", "-y"]
    for clip_path, _dur in clip_entries:
        cmd += ["-i", clip_path]

    if len(clip_entries) == 1 or transition <= 0:
        vf_parts = []
        inputs_tag = ""
        for idx in range(len(clip_entries)):
            vf_parts.append(f"[{idx}:v]fps={fps},format=yuv420p[v{idx}]")
            inputs_tag += f"[v{idx}]"
        if len(clip_entries) == 1:
            filter_complex = vf_parts[0]
            map_label = "[v0]"
        else:
            filter_complex = ";".join(vf_parts) + f";{inputs_tag}concat=n={len(clip_entries)}:v=1:a=0[vout]"
            map_label = "[vout]"
    else:
        filter_parts = []
        for idx in range(len(clip_entries)):
            filter_parts.append(f"[{idx}:v]fps={fps},setpts=PTS-STARTPTS[v{idx}]")

        offset = max(0.1, clip_entries[0][1] - transition)
        prev_label = "v0"
        for idx in range(1, len(clip_entries)):
            out_label = "vout" if idx == len(clip_entries) - 1 else f"xf{idx}"
            filter_parts.append(
                f"[{prev_label}][v{idx}]xfade=transition=fade:duration={transition:.3f}:offset={offset:.3f}[{out_label}]"
            )
            prev_label = out_label
            offset += max(0.1, clip_entries[idx][1] - transition)
        filter_parts.append(f"[{prev_label}]format=yuv420p[vfinal]")
        filter_complex = ";".join(filter_parts)
        map_label = "[vfinal]"

    cmd += [
        "-filter_complex", filter_complex,
        "-map", map_label,
        *_encode_args(use_nvenc),
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
    progress_cb=None,
):
    """
    将一组静态分镜图片合成为带 Ken Burns 运镜与转场的完整 MP4。

    shots: [{"path": "...", "motion": "zoom_in", "duration": 4.0}, ...]
    返回: {"out_path": out_path, "encoder": "h264_nvenc"|"libx264", "duration": total_sec}
    """
    if not has_ffmpeg():
        raise RuntimeError("未检测到 ffmpeg，请先安装 ffmpeg 并确保它在 PATH 中")
    if not shots:
        raise ValueError("shots 不能为空")

    w = ensure_even(width, 1344)
    h = ensure_even(height, 768)
    fps = max(15, min(60, int(fps or DEFAULT_FPS)))
    trans = max(0.0, min(1.5, float(transition if transition is not None else DEFAULT_TRANSITION)))

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    total_steps = len(shots) + 1

    with tempfile.TemporaryDirectory(prefix="comfy_compose_") as tmp_dir:
        clip_entries = []
        for idx, shot in enumerate(shots):
            img_path = shot["path"]
            if not os.path.exists(img_path):
                raise FileNotFoundError("找不到分镜图片：%s" % img_path)
            dur = float(shot.get("duration") or DEFAULT_DURATION)
            dur = max(1.0, min(15.0, dur))
            if len(shots) > 1 and trans > 0 and dur <= trans + 0.2:
                dur = trans + 0.5
            motion = shot.get("motion") or "zoom_in"
            if progress_cb:
                progress_cb(idx, total_steps, f"正在渲染第 {idx + 1}/{len(shots)} 镜运镜 ({motion})")
            clip_path = os.path.join(tmp_dir, f"clip_{idx:03d}.mp4")
            render_shot_clip(img_path, clip_path, motion, w, h, dur, fps)
            clip_entries.append((clip_path, dur))

        if progress_cb:
            progress_cb(len(shots), total_steps, "正在合成转场并导出最终成片…")

        use_nvenc = detect_nvenc()
        encoder_used = "libx264"
        if use_nvenc:
            try:
                _concat_with_xfade(clip_entries, out_path, trans, fps, use_nvenc=True)
                encoder_used = "h264_nvenc"
            except Exception:  # noqa: BLE001
                _concat_with_xfade(clip_entries, out_path, trans, fps, use_nvenc=False)
                encoder_used = "libx264"
        else:
            _concat_with_xfade(clip_entries, out_path, trans, fps, use_nvenc=False)

    total_duration = sum(d for _, d in clip_entries)
    if len(clip_entries) > 1 and trans > 0:
        total_duration -= trans * (len(clip_entries) - 1)
    if progress_cb:
        progress_cb(total_steps, total_steps, "成片导出完成")

    return {
        "out_path": os.path.abspath(out_path),
        "encoder": encoder_used,
        "width": w,
        "height": h,
        "fps": fps,
        "duration": round(max(0.1, total_duration), 2),
    }
