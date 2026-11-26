import { Clapperboard, FolderClock, Image as ImageIcon } from 'lucide-react';
import SegmentedControl from './ui/SegmentedControl';

export default function TopBar({
  mode,
  onModeChange,
  health,
  gpuProgress,
  onOpenHistory,
  historyCount,
}) {
  const allGood = Boolean(health?.workflow_loaded && health?.comfyui === 'ok' && health?.ffmpeg);
  const busy = Boolean(gpuProgress?.busy);

  const dotCls = busy
    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)] animate-pulse'
    : allGood
    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]'
    : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]';

  const healthParts = [];
  if (health) {
    healthParts.push(health.workflow_loaded ? '工作流就绪' : '缺少工作流');
    healthParts.push(health.comfyui === 'ok' ? 'ComfyUI 在线' : 'ComfyUI 离线');
    healthParts.push(health.ffmpeg ? (health.nvenc ? 'FFmpeg (NVENC)' : 'FFmpeg (x264)') : '缺少 FFmpeg');
    if (health.queued) healthParts.push(`排队 ${health.queued}`);
  } else {
    healthParts.push('检测服务中…');
  }

  const pct =
    gpuProgress?.total > 0 ? Math.min(100, Math.round((gpuProgress.done / gpuProgress.total) * 100)) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-[#090d14]/90 backdrop-blur-xl">
      <div className="max-w-[1520px] mx-auto px-5 py-2.5 flex items-center justify-between gap-4 flex-wrap">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-sm text-white shadow-lg shadow-blue-950/60">
            CS
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-tight text-slate-100 leading-tight">
              Comfy Studio
            </div>
            <div className="text-[11px] text-slate-500 leading-tight">
              RTX 3060 12GB 串行分镜与运镜工坊
            </div>
          </div>
        </div>

        {/* Mode switch */}
        <SegmentedControl
          value={mode}
          onChange={onModeChange}
          options={[
            { value: 'storyboard', label: '图文分镜模式', icon: ImageIcon },
            { value: 'video', label: '音画短片模式', icon: Clapperboard },
          ]}
        />

        {/* Status & History */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#111827] hover:bg-slate-800 hover:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            <FolderClock className="w-3.5 h-3.5 text-cyan-400" />
            <span>历史与成片</span>
            {historyCount > 0 ? (
              <span className="ml-0.5 rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300 border border-slate-700">
                {historyCount}
              </span>
            ) : null}
          </button>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-[#111827] px-3 py-1.5 text-xs text-slate-300">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} />
            <span>{healthParts.join(' · ')}</span>
          </div>

          <div className="min-w-[200px] rounded-lg border border-slate-800 bg-[#111827] px-3 py-1.5">
            <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400 mb-1">
              <span className="truncate max-w-[155px]">{gpuProgress?.text || '显卡队列：空闲'}</span>
              <span className="tabular-nums text-slate-300 font-medium">{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
