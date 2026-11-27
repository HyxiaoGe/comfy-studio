import { useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Captions,
  Copy,
  Download,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  MoveLeft,
  MoveRight,
  Pause,
  RefreshCw,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DURATION_OPTIONS, MOTION_OPTIONS } from '../data/presets';
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
  batchRunning,
  onChangePrompt,
  onChangeNarration,
  onChangeMotion,
  onChangeDuration,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onReroll,
  onUploadImage,
  onPreview,
}) {
  const imgInputRef = useRef(null);
  const isBusy = shot.status === 'queued' || shot.status === 'running';
  const statusInfo = STATUS_STYLE[shot.status] || STATUS_STYLE.idle;
  const imgSrc = shot.filename
    ? `/results/${encodeURIComponent(shot.filename)}?v=${shot.imgVer || 1}`
    : '';

  return (
    <article className="group rounded-2xl border border-slate-800/90 hover:border-slate-700 bg-[#111827]/90 p-3.5 grid grid-cols-1 md:grid-cols-[248px_minmax(0,1fr)] gap-4 transition-colors shadow-md shadow-black/25">
      {/* Left Media Preview */}
      <div
        className="relative rounded-xl border border-slate-800 bg-[#090d14] overflow-hidden flex items-center justify-center"
        style={{ aspectRatio: `${aspect.width} / ${aspect.height}` }}
      >
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

        {shot.filename ? (
          <>
            <img
              src={imgSrc}
              alt={`分镜 #${index + 1}`}
              onClick={() => onPreview(imgSrc)}
              className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.015]"
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
            <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 pointer-events-none">
              <span className="pointer-events-auto rounded-md bg-slate-950/80 backdrop-blur-sm border border-white/10 px-2 py-0.5 text-[11px] tabular-nums text-slate-200">
                {shot.seed != null ? `seed ${shot.seed}` : '本地上传'}
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
            <ImageIcon className="w-6 h-6 opacity-50" />
            <span className="text-xs">分镜 #{String(index + 1).padStart(2, '0')} 待生成</span>
            <button
              type="button"
              onClick={() => imgInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 bg-[#111827] hover:bg-slate-800 px-2 py-1 text-[11px] text-slate-300 cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              <span>或上传本地图</span>
            </button>
          </div>
        )}

        {isBusy ? (
          <div className="absolute inset-0 bg-[#090d14]/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-xs font-semibold text-slate-100">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <span>{shot.status === 'queued' ? '排队等待显存…' : 'SDXL 绘制中…'}</span>
          </div>
        ) : null}
      </div>

      {/* Right Editor & Controls */}
      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-xs font-mono font-bold text-blue-300">
              #{String(index + 1).padStart(2, '0')}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusInfo.cls}`}
            >
              {statusInfo.label}
            </span>
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

        <textarea
          rows={2}
          value={shot.prompt}
          onChange={(e) => onChangePrompt(e.target.value)}
          placeholder="画面提示词：描述本镜景别、主体动作、光线与环境细节…"
          className="w-full rounded-xl border border-slate-800 bg-[#0c121e] px-3 py-2 text-[13px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition resize-y leading-relaxed"
        />

        {/* Chinese Narration / Subtitle line */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-800/90 bg-[#090d14] px-2.5 py-1.5 focus-within:border-indigo-500/70 transition-colors">
          <Captions className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <input
            type="text"
            value={shot.narration || ''}
            onChange={(e) => onChangeNarration(e.target.value)}
            placeholder="中文解说词 / 底部字幕（可手动填写或由上方 DeepSeek 一键生成）"
            className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>

        {shot.error ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-300">
            {shot.error}
          </div>
        ) : null}

        <div className="mt-auto pt-1 flex items-center justify-between gap-2.5 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">运镜</span>
              <SelectDropdown
                size="sm"
                className="w-[155px]"
                value={shot.motion}
                onChange={onChangeMotion}
                options={MOTION_OPTIONS}
                renderIcon={(opt) => {
                  const IconComp = MOTION_ICONS[opt.icon];
                  return IconComp ? <IconComp className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> : null;
                }}
              />
            </div>

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

          <button
            type="button"
            onClick={onReroll}
            disabled={mode !== 'storyboard' || isBusy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isBusy ? 'animate-spin' : ''}`} />
            <span>仅重绘此镜</span>
          </button>
        </div>
      </div>
    </article>
  );
}
