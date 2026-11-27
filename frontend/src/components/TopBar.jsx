import { useState } from 'react';
import { FolderClock, Home, Layers, Pencil } from 'lucide-react';

export default function TopBar({
  activeView,
  onGoHome,
  onResumeStudio,
  hasActiveProject,
  title,
  onTitleChange,
  saveState,
  health,
  gpuProgress,
  onOpenHistory,
  historyCount,
}) {
  const [editingTitle, setEditingTitle] = useState(false);

  const allGood = Boolean(health?.workflow_loaded && health?.comfyui === 'ok' && health?.ffmpeg);
  const busy = Boolean(gpuProgress?.busy);

  const dotCls = busy
    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.75)] animate-pulse'
    : allGood
    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
    : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.65)]';

  const pct =
    gpuProgress?.total > 0 ? Math.min(100, Math.round((gpuProgress.done / gpuProgress.total) * 100)) : 0;

  const statusText = busy
    ? `${gpuProgress?.text || '生成中'} · ${pct}%`
    : !health
    ? '检测服务中…'
    : health.comfyui === 'ok'
    ? health.queued
      ? `ComfyUI 在线 · 排队 ${health.queued}`
      : 'ComfyUI 在线 · 空闲'
    : 'ComfyUI 离线';

  const tooltip = health
    ? [
        `工作流: ${health.workflow_loaded ? '就绪' : '缺失'}`,
        `ComfyUI: ${health.comfyui === 'ok' ? '在线' : '离线'}`,
        `FFmpeg: ${health.ffmpeg ? (health.nvenc ? 'NVENC' : 'x264') : '缺失'}`,
        `DeepSeek: ${health.llm_configured ? '已配置' : '未配置'}`,
        `TTS: ${health.tts_configured ? health.tts_provider : '未配置'}`,
      ].join(' | ')
    : '';

  const saveIndicator =
    saveState === 'saving'
      ? { text: '保存中', cls: 'text-amber-300' }
      : saveState === 'error'
      ? { text: '未保存', cls: 'text-rose-400' }
      : { text: '已保存', cls: 'text-emerald-400/90' };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-[#090d14]/92 backdrop-blur-xl">
      <div className="max-w-[1560px] mx-auto px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
        {/* Left: Brand (Go Home) + Active Project Title or Nav */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onGoHome}
            title="回到首页"
            className="flex items-center gap-2.5 rounded-lg pr-2 py-1 hover:bg-slate-800/60 transition-colors cursor-pointer shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-xs text-white shadow-lg shadow-blue-950/60 shrink-0">
              CS
            </div>
            <span className="hidden sm:inline text-sm font-bold tracking-tight text-slate-100">
              Comfy Studio
            </span>
          </button>

          {activeView === 'studio' ? (
            <>
              <span className="hidden sm:inline text-slate-700 shrink-0">/</span>
              <div className="flex items-center gap-1.5 min-w-0">
                {editingTitle ? (
                  <input
                    type="text"
                    autoFocus
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    onBlur={() => setEditingTitle(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false);
                    }}
                    className="w-44 sm:w-56 rounded-md border border-blue-500/70 bg-[#0c121e] px-2 py-1 text-xs font-semibold text-slate-100 focus:outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingTitle(true)}
                    title="点击重命名当前项目"
                    className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-slate-800/70 text-xs font-semibold text-slate-100 max-w-[180px] sm:max-w-[260px] cursor-pointer transition-colors"
                  >
                    <span className="truncate">{title || '未命名分镜项目'}</span>
                    <Pencil className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                  </button>
                )}
                <span className={`hidden md:inline text-[11px] font-medium shrink-0 ${saveIndicator.cls}`}>
                  · {saveIndicator.text}
                </span>
              </div>
            </>
          ) : (
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-[#111827] px-2.5 py-1 text-[11px] text-slate-400">
              <Home className="w-3 h-3 text-blue-400" />
              <span>首页 · AI 故事分镜工作台</span>
            </span>
          )}
        </div>

        {/* Center/Right Nav */}
        <div className="flex items-center gap-2 shrink-0">
          {activeView === 'home' && hasActiveProject ? (
            <button
              type="button"
              onClick={onResumeStudio}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-blue-500/35 bg-blue-500/15 hover:bg-blue-500/25 px-3 py-1.5 text-xs font-medium text-blue-200 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>回到工作台</span>
            </button>
          ) : null}

          <div
            title={tooltip}
            className="relative overflow-hidden inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-[#111827] px-3 py-1.5 text-xs text-slate-300"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} />
            <span className="whitespace-nowrap">{statusText}</span>
            {busy ? (
              <div
                className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            ) : null}
          </div>

          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#111827] hover:bg-slate-800 hover:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            <FolderClock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">历史与成片</span>
            {historyCount > 0 ? (
              <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300 border border-slate-700 tabular-nums">
                {historyCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
}
