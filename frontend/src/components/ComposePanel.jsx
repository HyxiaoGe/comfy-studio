import { useEffect, useRef, useState } from 'react';
import { Download, Film, Volume2, X } from 'lucide-react';

export default function ComposePanel({ state, title, onClose }) {
  const videoRef = useRef(null);
  const [autoMuted, setAutoMuted] = useState(false);

  useEffect(() => {
    setAutoMuted(false);
    if (!state?.visible || !state?.videoUrl || !state?.autoPlay) return;
    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    const p = el.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        // 浏览器若因安全策略拦截有声自动播放，降级为静音自动播放并提示恢复声音
        el.muted = true;
        setAutoMuted(true);
        el.play().catch(() => {});
      });
    }
  }, [state?.visible, state?.videoUrl, state?.autoPlay, state?.cacheBust]);

  if (!state?.visible) return null;

  const pct = state.total > 0 ? Math.min(100, Math.round((state.done / state.total) * 100)) : 0;
  const downloadName = title
    ? `${title.replace(/[\\/:*?"<>|]/g, '_')}.mp4`
    : state.filename || 'storyboard.mp4';

  return (
    <section className="rounded-2xl border border-cyan-500/35 bg-[#111827]/95 p-4 shadow-xl shadow-black/40">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Film className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-100">成片预览舞台</div>
            <div className="text-xs text-slate-400 truncate">{state.stage || '准备中…'}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {state.videoUrl ? (
            <a
              href={state.videoUrl}
              download={downloadName}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 MP4</span>
            </a>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            title="收起播放器"
            className="rounded-lg border border-slate-800 bg-[#0c121e] hover:bg-slate-800 p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!state.videoUrl ? (
        <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <div className="relative rounded-xl bg-black border border-slate-800 overflow-hidden flex justify-center">
          <video
            ref={videoRef}
            key={state.videoUrl + '_' + (state.cacheBust || '')}
            src={`${state.videoUrl}?t=${state.cacheBust || 1}`}
            autoPlay={Boolean(state.autoPlay)}
            onVolumeChange={(e) => {
              if (!e.currentTarget.muted) setAutoMuted(false);
            }}
            controls
            playsInline
            className="w-full max-h-[420px]"
          />
          {autoMuted ? (
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = false;
                  videoRef.current.volume = 1;
                }
                setAutoMuted(false);
              }}
              className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-slate-950/85 hover:bg-slate-900 px-3 py-1 text-xs font-medium text-amber-200 shadow-lg cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>已静音自动播放 · 点击开启声音</span>
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
