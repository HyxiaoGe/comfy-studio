# Comfy Studio (ComfyUI 批量生图与分镜出片流水线)

基于本地 ComfyUI API 的轻量级批量生图与短视频分镜生产工坊。纯 Python 标准库实现，零外部依赖，专为消费级显卡（如 RTX 3060 12GB）的显存安全串行调度与快速出片优化。

## 目录结构

```text
comfy-studio/
├── core/                      # 核心引擎（纯标准库，CLI 与 Web 服务共用）
│   ├── comfy_client.py        # ComfyUI HTTP API 通信、节点自动识别与产物下载
│   ├── image_runner.py        # 批量生图流水线
│   └── video_runner.py        # 批量分镜视频生成与 FFmpeg 无损拼接
├── workflows/                 # ComfyUI Export (API) 导出的工作流模板
│   ├── sdxl_image_api.json    # SDXL 批量生图工作流
│   └── minimax_h3_video.json  # MiniMax H3 图/文生视频工作流（已默认开启 8 步加速与 5s 时长）
├── presets/                   # 分镜脚本与批量任务配置清单
│   ├── kitchen_cat_images.json
│   └── kitchen_cat_shots.json
├── web/                       # Web 控制台前端
│   └── index.html
├── server.py                  # 本地 Web 工作台与 HTTP API 服务（默认端口 8899）
└── outputs/                   # 生成结果目录（已加入 .gitignore）
```

## 快速开始

### 1. 启动 Web 生图工作台
在运行 ComfyUI 的机器上，直接使用 ComfyUI 便携版自带的 Python 启动（无需额外 `pip install`）：

```bash
D:\ComfyUI\python_embeded\python.exe server.py
```

启动后访问 `http://127.0.0.1:8899`（局域网其他设备如 Mac 可通过 `http://<Windows局域网IP>:8899` 访问）。

### 2. 命令行批量生图
```bash
D:\ComfyUI\python_embeded\python.exe -m core.image_runner --images presets/kitchen_cat_images.json
```

### 3. 命令行批量生成分镜视频并自动拼接
```bash
D:\ComfyUI\python_embeded\python.exe -m core.video_runner --shots presets/kitchen_cat_shots.json
```

## 关键调优说明（针对 RTX 3060 12GB）
* **单队列串行执行**：所有生图与视频分镜任务按队列顺序执行，避免并行推理导致 12GB 显存溢出（OOM）。
* **MiniMax H3 加速配置**：`workflows/minimax_h3_video.json` 已默认启用 `turbo_mode=true`（8 步蒸馏 LoRA）并将单段时长设为 `5.0s`，兼顾动作连贯度与出片效率。
* **FFmpeg 自动拼接**：视频流水线会在 `outputs/videos/<任务名>/` 下按独立子目录隔离产物，避免多轮测试时旧文件覆盖或误拼接。
