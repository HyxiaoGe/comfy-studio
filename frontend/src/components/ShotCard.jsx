import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Captions,
  ChevronDown,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Mic,
  MoveLeft,
  MoveRight,
  Pause,
  Play,
  RefreshCw,
  Square,
  Trash2,
  Upload,
  Video,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DURATION_OPTIONS, MOTION_OPTIONS } from '../data/presets';
import AutoGrowTextarea from './ui/AutoGrowTextarea';
import PromptTagsField from './ui/PromptTagsField';
import SelectDropdown from './ui/SelectDropdown';
import SegmentedControl from './ui/SegmentedControl';

const MOTION_ICONS = {
  ZoomIn,
  ZoomOut,
  MoveRight,
  MoveLeft,
  Pause,
};

const STATUS_STYLE = {
  idle: { label: '待生成', cls: 'bg-slate-800/90 text-slate-400 border-slate-700' },
  queued: { label: '排队中', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  running: { label: '绘制中', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  ready: { label: '已出图', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  error: { label: '失败', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
};

export default function ShotCard({
  shot,
  index,
  total,
  aspect,
  mode,
  viewMode = 'list',
  batchRunning,
  ttsBusy,
  videoWorkflowLoaded = false,
  onChangePrompt,
  onChangeNarration,
  onChangeMotion,
  onChangeDuration,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onReroll,
  onGenerateVideo,
  onToggleUseVideo,
  onGenerateTts,
  onUploadImage,
  onPreview,
}) {
  const imgInputRef = useRef(null);
  const audioRef = useRef(null);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);

  const imgBusy = shot.status === 'queued' || shot.status === 'running';
  const vidBusy = shot.videoStatus === 'queued' || shot.videoStatus === 'running';
  const isBusy = imgBusy || vidBusy;
  const hasImage = Boolean(shot.filename);
  const hasVideo = Boolean(shot.videoFilename);
  const showingVideo = hasVideo && (shot.useVideo !== false || !hasImage);
  const statusInfo = showingVideo
    ? { label: 'AI 视频', cls: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40' }
    : STATUS_STYLE[shot.status] || STATUS_STYLE.idle;
  const imgSrc = shot.filename
    ? `/results/${encodeURIComponent(shot.filename)}?v=${shot.imgVer || 1}`
    : '';
  const videoSrc = shot.videoFilename
    ? `/videos/${encodeURIComponent(shot.videoFilename)}?v=${shot.videoVer || 1}`
    : '';

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlayTts = () => {
    if (!shot.ttsFilename) return;
    if (playingAudio && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingAudio(false);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(`/tts/${encodeURIComponent(shot.ttsFilename)}`);
    audioRef.current = audio;
    audio.onended = () => setPlayingAudio(false);
    audio.onerror = () => setPlayingAudio(false);
    audio.play().then(() => setPlayingAudio(true)).catch(() => setPlayingAudio(false));
  };

  const fileInputEl = (
    <input
      ref={imgInputRef}
      type="file"
      accept=".png,.jpg,.jpeg,.webp"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onUploadImage(file);
        e.target.value = '';
      }}
    />
  );

  // ==================== Storyboard Grid View ====================
  if (viewMode === 'grid') {
    const motionOpt = MOTION_OPTIONS.find((m) => m.value === shot.motion);
    return (
      <article className="group rounded-2xl border border-slate-800/90 hover:border-slate-700 bg-[#111827]/90 overflow-hidden flex flex-col transition-colors shadow-md shadow-black/25">
        {fileInputEl}
        <div
          className="relative bg-[#090d14] overflow-hidden flex items-center justify-center border-b border-slate-800"
          style={{ aspectRatio: `${aspect.width} / ${aspect.height}` }}
        >
          {showingVideo ? (
            <video
              key={videoSrc}
              src={videoSrc}
              controls
              loop
              playsInline
              preload="metadata"
              className="w-full h-full object-cover bg-black"
            />
          ) : shot.filename ? (
            <>
              <img
                src={imgSrc}
                alt={`分镜 #${index + 1}`}
                onClick={() => onPreview(imgSrc)}
                className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 flex items-center gap-1 transition-opacity">
                <button
                  type="button"
                  onClick={() => imgInputRef.current?.click()}
                  title="上传本地图替换"
                  className="rounded-lg bg-slate-950/80 border border-white/10 p-1.5 text-slate-200 hover:bg-slate-900 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onPreview(imgSrc)}
                  title="查看大图"
                  className="rounded-lg bg-slate-950/80 border border-white/10 p-1.5 text-slate-200 hover:bg-slate-900 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-slate-500">
              {mode === 'video' ? (
                <Film className="w-6 h-6 opacity-50" />
              ) : (
                <ImageIcon className="w-6 h-6 opacity-50" />
              )}
              <span className="text-xs">
                #{String(index + 1).padStart(2, '0')} {mode === 'video' ? '待生成视频' : '待生成'}
              </span>
            </div>
          )}

          <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
            <span className="rounded-md bg-slate-950/80 backdrop-blur-sm border border-white/10 px-2 py-0.5 text-[11px] font-mono font-bold text-blue-300">
              #{String(index + 1).padStart(2, '0')}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
            {showingVideo && shot.videoHasAudio ? (
              <span className="rounded-full border border-cyan-500/35 bg-cyan-950/80 px-1.5 py-0.5 text-[10px] text-cyan-200 backdrop-blur-sm">
                原生音
              </span>
            ) : null}
          </div>

          {hasImage && hasVideo ? (
            <button
              type="button"
              onClick={() => onToggleUseVideo?.(!showingVideo)}
              title={showingVideo ? '切换显示/使用静态分镜图' : '切换使用 AI 动态视频'}
              className="absolute bottom-2 right-2 rounded-md bg-slate-950/85 border border-white/15 hover:border-indigo-400/60 px-2 py-0.5 text-[10px] font-medium text-slate-200 cursor-pointer"
            >
              {showingVideo ? '切回静态图' : '切回 AI 视频'}
            </button>
          ) : null}

          {isBusy ? (
            <div className="absolute inset-0 bg-[#090d14]/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-xs font-semibold text-slate-100">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <span>
                {vidBusy
                  ? shot.videoStatus === 'queued'
                    ? '排队生成视频…'
                    : 'H3 视频渲染中…'
                  : shot.status === 'queued'
                  ? '排队中…'
                  : '绘制中…'}
              </span>
            </div>
          ) : null}
        </div>

        <div className="p-3 flex-1 flex flex-col gap-2.5">
          <div className="text-[13px] text-slate-100 leading-snug min-h-[2.4em]">
            {shot.narration?.trim() ? (
              <p className="line-clamp-2">{shot.narration}</p>
            ) : (
              <p className="text-slate-500 text-xs line-clamp-2">{shot.prompt || '暂无描述'}</p>
            )}
          </div>

          <div className="mt-auto pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span>{motionOpt?.label || '运镜'}</span>
              <span>·</span>
              <span className="tabular-nums">{shot.duration}s</span>
              {shot.ttsFilename ? (
                <button
                  type="button"
                  onClick={togglePlayTts}
                  className="inline-flex items-center gap-1 rounded bg-cyan-500/15 border border-cyan-500/30 px-1.5 py-0.5 text-cyan-200 cursor-pointer"
                >
                  {playingAudio ? <Square className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current" />}
                  <span>{shot.ttsDuration}s</span>
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-1.5">
              {mode !== 'video' ? (
                <button
                  type="button"
                  onClick={onReroll}
                  disabled={isBusy}
                  title="重新绘制静态分镜图"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 disabled:opacity-40 px-2 py-1 text-[11px] font-medium text-slate-200 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 text-blue-400 ${imgBusy ? 'animate-spin' : ''}`} />
                  <span>重绘</span>
                </button>
              ) : null}
              {videoWorkflowLoaded ? (
                <button
                  type="button"
                  onClick={() => onGenerateVideo?.(hasImage)}
                  disabled={isBusy}
                  title={hasImage ? '以当前图片为首帧生成 MiniMax H3 动态视频' : '用 MiniMax H3 生成动态视频'}
                  className="inline-flex items-center gap-1 rounded-md border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/30 disabled:opacity-40 px-2 py-1 text-[11px] font-medium text-indigo-200 cursor-pointer"
                >
                  <Video className={`w-3 h-3 ${vidBusy ? 'animate-pulse' : ''}`} />
                  <span>{hasVideo ? '重拍视频' : mode === 'video' ? '拍视频' : '转视频'}</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </article>
    );
  }

  // ==================== Detail List View ====================
  return (
    <article className="group rounded-2xl border border-slate-800/90 hover:border-slate-700 bg-[#111827]/90 p-3.5 grid grid-cols-1 md:grid-cols-[236px_minmax(0,1fr)] gap-4 transition-colors shadow-md shadow-black/25">
      {fileInputEl}

      {/* Left Media Preview */}
      <div
        className="relative rounded-xl border border-slate-800 bg-[#090d14] overflow-hidden flex items-center justify-center"
        style={{ aspectRatio: `${aspect.width} / ${aspect.height}` }}
      >
        {showingVideo ? (
          <>
            <video
              key={videoSrc}
              src={videoSrc}
              controls
              loop
              playsInline
              preload="metadata"
              className="w-full h-full object-cover bg-black"
            />
            <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none">
              <span className="rounded-md bg-indigo-950/85 border border-indigo-400/40 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-200">
                {shot.videoMode === 'i2v' ? '图生视频' : 'H3 视频'}
              </span>
              {shot.videoHasAudio ? (
                <span className="rounded-md bg-cyan-950/85 border border-cyan-500/35 px-1.5 py-0.5 text-[10px] text-cyan-200">
                  原生音
                </span>
              ) : null}
            </div>
            {hasImage ? (
              <button
                type="button"
                onClick={() => onToggleUseVideo?.(false)}
                title="切回预览并使用静态分镜图"
                className="absolute top-2 right-2 rounded-md bg-slate-950/85 border border-white/15 hover:border-blue-400/60 px-2 py-0.5 text-[10px] font-medium text-slate-200 cursor-pointer"
              >
                切到静图
              </button>
            ) : null}
          </>
        ) : shot.filename ? (
          <>
            <img
              src={imgSrc}
              alt={`分镜 #${index + 1}`}
              onClick={() => onPreview(imgSrc)}
              className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.015]"
            />
            <div className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 flex items-center gap-1 transition-opacity">
              {hasVideo ? (
                <button
                  type="button"
                  onClick={() => onToggleUseVideo?.(true)}
                  title="切换到已生成的 AI 视频"
                  className="rounded-lg bg-indigo-950/90 border border-indigo-400/40 px-2 py-1 text-[10px] font-medium text-indigo-200 hover:bg-indigo-900 cursor-pointer"
                >
                  切到视频
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => imgInputRef.current?.click()}
                title="上传本地图替换"
                className="rounded-lg bg-slate-950/80 border border-white/10 p-1.5 text-slate-200 hover:bg-slate-900 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onPreview(imgSrc)}
                title="查看大图"
                className="rounded-lg bg-slate-950/80 border border-white/10 p-1.5 text-slate-200 hover:bg-slate-900 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 pointer-events-none">
              <span className="pointer-events-auto rounded-md bg-slate-950/80 backdrop-blur-sm border border-white/10 px-2 py-0.5 text-[11px] tabular-nums text-slate-200">
                {shot.seed != null ? `seed ${shot.seed}` : '本地图'}
              </span>
              <a
                href={`/results/${encodeURIComponent(shot.filename)}`}
                download={shot.filename}
                title="下载原图"
                className="pointer-events-auto inline-flex items-center gap-1 rounded-md bg-slate-950/80 backdrop-blur-sm border border-blue-500/35 hover:bg-blue-600 px-2 py-0.5 text-[11px] text-blue-300 hover:text-white transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>下载</span>
              </a>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500 px-4 text-center">
            {mode === 'video' ? (
              <Film className="w-6 h-6 opacity-50" />
            ) : (
              <ImageIcon className="w-6 h-6 opacity-50" />
            )}
            <span className="text-xs">
              分镜 #{String(index + 1).padStart(2, '0')} {mode === 'video' ? '待生成视频' : '待生成'}
            </span>
            <button
              type="button"
              onClick={() => imgInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 bg-[#111827] hover:bg-slate-800 px-2 py-1 text-[11px] text-slate-300 cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              <span>上传参考图</span>
            </button>
          </div>
        )}

        {isBusy ? (
          <div className="absolute inset-0 bg-[#090d14]/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-xs font-semibold text-slate-100">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <span>
              {vidBusy
                ? shot.videoStatus === 'queued'
                  ? '排队等待显存…'
                  : 'MiniMax H3 生成中…'
                : shot.status === 'queued'
                ? '排队等待显存…'
                : 'SDXL 绘制中…'}
            </span>
          </div>
        ) : null}
      </div>

      {/* Right Editor & Controls (Story Narration First, Prompt Collapsible) */}
      <div className="flex flex-col gap-2.5 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-xs font-mono font-bold text-blue-300">
              #{String(index + 1).padStart(2, '0')}
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
            {shot.seed != null ? (
              <span className="hidden sm:inline text-[11px] text-slate-500 tabular-nums">
                seed {shot.seed}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0 || batchRunning}
              title="上移"
              className="rounded-lg border border-slate-800 bg-[#0c121e] hover:bg-slate-800 hover:border-slate-700 disabled:opacity-35 disabled:cursor-not-allowed p-1.5 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === total - 1 || batchRunning}
              title="下移"
              className="rounded-lg border border-slate-800 bg-[#0c121e] hover:bg-slate-800 hover:border-slate-700 disabled:opacity-35 disabled:cursor-not-allowed p-1.5 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onDuplicate}
              disabled={batchRunning}
              title="复制此分镜"
              className="rounded-lg border border-slate-800 bg-[#0c121e] hover:bg-slate-800 hover:border-slate-700 disabled:opacity-35 disabled:cursor-not-allowed p-1.5 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={batchRunning}
              title="删除此分镜"
              className="rounded-lg border border-slate-800 bg-[#0c121e] hover:bg-rose-500/15 hover:border-rose-500/40 disabled:opacity-35 disabled:cursor-not-allowed p-1.5 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Primary: Chinese Narration + TTS Audition */}
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-2.5 space-y-2 focus-within:border-indigo-400 transition-colors">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300">
              <Captions className="w-3.5 h-3.5" />
              <span>中文旁白 / 字幕文案</span>
            </span>
            <div className="flex items-center gap-1.5">
              {shot.ttsFilename ? (
                <button
                  type="button"
                  onClick={togglePlayTts}
                  className="inline-flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-500/15 hover:bg-cyan-500/30 px-2 py-0.5 text-[11px] font-medium text-cyan-200 cursor-pointer"
                >
                  {playingAudio ? <Square className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current" />}
                  <span>试听 {shot.ttsDuration ? `${shot.ttsDuration}s` : ''}</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={onGenerateTts}
                disabled={!shot.narration?.trim() || ttsBusy}
                className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed px-2 py-0.5 text-[11px] font-medium text-slate-200 cursor-pointer"
              >
                {ttsBusy ? <Loader2 className="w-3 h-3 animate-spin text-cyan-400" /> : <Mic className="w-3 h-3 text-cyan-400" />}
                <span>{shot.ttsFilename ? '重配音' : '生成配音'}</span>
              </button>
            </div>
          </div>

          <AutoGrowTextarea
            minHeight={48}
            value={shot.narration || ''}
            onChange={(e) => onChangeNarration(e.target.value)}
            placeholder="填写这一镜的中文旁白（可在 Step 1「AI 重写旁白」统一生成）…"
            className="w-full bg-transparent text-[13.5px] text-slate-100 placeholder-slate-500 focus:outline-none leading-relaxed"
          />
        </div>

        {/* Secondary: Collapsible AI Drawing Prompt */}
        <div className="rounded-lg border border-slate-800/80 bg-[#0c121e]">
          <button
            type="button"
            onClick={() => setPromptExpanded((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <span className="truncate">
              <strong className="text-slate-400 font-medium mr-1.5">绘图词:</strong>
              {shot.prompt || '点击填写英文画面描述…'}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                promptExpanded ? 'rotate-180 text-blue-400' : ''
              }`}
            />
          </button>
          {promptExpanded ? (
            <div className="px-2.5 pb-2.5 pt-2 border-t border-slate-800/70">
              <PromptTagsField
                value={shot.prompt || ''}
                onChange={onChangePrompt}
                placeholder="英文画面描述（将自动拼接公共画风前缀）…"
                highlightCamera
                compact
              />
            </div>
          ) : null}
        </div>

        {shot.error || shot.videoError ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-300">
            {shot.videoError || shot.error}
          </div>
        ) : null}

        {/* Bottom Motion & Reroll Bar */}
        <div className="mt-auto pt-0.5 flex items-center justify-between gap-2.5 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            {!showingVideo ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">运镜</span>
                <SelectDropdown
                  size="sm"
                  className="w-[150px]"
                  value={shot.motion}
                  onChange={onChangeMotion}
                  options={MOTION_OPTIONS}
                  renderIcon={(opt) => {
                    const IconComp = MOTION_ICONS[opt.icon];
                    return IconComp ? <IconComp className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> : null;
                  }}
                />
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-[11px] font-medium text-indigo-200">
                <Film className="w-3 h-3 text-indigo-400" />
                <span>AI 原生动态{shot.videoDuration ? ` · ${shot.videoDuration}s` : ''}</span>
              </span>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">时长</span>
              <SegmentedControl
                size="xs"
                variant="subtle"
                value={shot.duration}
                onChange={onChangeDuration}
                options={DURATION_OPTIONS}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {mode !== 'video' ? (
              <button
                type="button"
                onClick={onReroll}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${imgBusy ? 'animate-spin' : ''}`} />
                <span>仅重绘此镜</span>
              </button>
            ) : null}

            {videoWorkflowLoaded ? (
              <button
                type="button"
                onClick={() => onGenerateVideo?.(hasImage)}
                disabled={isBusy}
                title={
                  hasImage
                    ? '以当前分镜图为首帧，使用 MiniMax H3 生成 5s 动态视频与原生音效'
                    : '直接用 MiniMax H3 文生视频（含原生环境音）'
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/45 bg-indigo-500/15 hover:bg-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-medium text-indigo-200 transition-colors cursor-pointer"
              >
                <Video className={`w-3.5 h-3.5 text-indigo-300 ${vidBusy ? 'animate-pulse' : ''}`} />
                <span>
                  {hasVideo
                    ? '重拍 AI 视频'
                    : hasImage
                    ? '首帧图生视频 (H3)'
                    : '生成 AI 视频 (H3)'}
                </span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
