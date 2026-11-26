import { useEffect, useState } from 'react';
import { Download, Film, FolderOpen, Play, Plus, Trash2, X } from 'lucide-react';
import SegmentedControl from './ui/SegmentedControl';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function HistoryDrawer({
  open,
  onClose,
  currentProjectId,
  projects,
  compositions,
  onRefresh,
  onOpenProject,
  onDeleteProject,
  onCreateBlankProject,
  onPlayComposition,
  onDeleteComposition,
}) {
  const [tab, setTab] = useState('projects');

  useEffect(() => {
    if (open) {
      onRefresh();
    }
  }, [open, onRefresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="w-full max-w-[500px] h-full bg-[#0e1420] border-l border-slate-800 shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-bold text-slate-100">历史项目与成片库</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCreateBlankProject}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#111827] hover:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>新建空白</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-800 bg-[#111827] hover:bg-slate-800 p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-slate-800 bg-[#0a0f18]">
          <SegmentedControl
            fullWidth
            value={tab}
            onChange={setTab}
            options={[
              { value: 'projects', label: `分镜项目 (${projects.length})`, icon: FolderOpen },
              { value: 'compositions', label: `成片库 (${compositions.length})`, icon: Film },
            ]}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {tab === 'projects' ? (
            projects.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-12">暂无历史项目</div>
            ) : (
              projects.map((p) => {
                const active = p.id === currentProjectId;
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border p-3 flex items-center gap-3 transition-colors ${
                      active
                        ? 'border-blue-500/60 bg-blue-500/10'
                        : 'border-slate-800 bg-[#111827]/90 hover:border-slate-700'
                    }`}
                  >
                    {p.cover_filename ? (
                      <img
                        src={`/results/${encodeURIComponent(p.cover_filename)}`}
                        alt={p.title}
                        className="w-16 h-11 rounded-lg object-cover border border-slate-800 bg-[#090d14] shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-11 rounded-lg border border-slate-800 bg-[#090d14] flex items-center justify-center text-slate-600 shrink-0">
                        <FolderOpen className="w-4 h-4" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-slate-100 truncate">
                          {p.title}
                        </span>
                        {active ? (
                          <span className="rounded bg-blue-500/20 px-1.5 py-0.2 text-[10px] font-medium text-blue-300 shrink-0">
                            当前
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {p.shot_count} 镜 · 已出图 {p.ready_count} · {p.width}×{p.height} ·{' '}
                        {formatTime(p.updated_at)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenProject(p.id)}
                        className="rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 cursor-pointer"
                      >
                        打开
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProject(p.id)}
                        title="删除项目记录"
                        className="rounded-lg border border-slate-800 bg-[#0c121e] hover:bg-rose-500/15 hover:border-rose-500/40 p-1.5 text-slate-400 hover:text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : compositions.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-12">暂无合成成片</div>
          ) : (
            compositions.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-slate-800 bg-[#111827]/90 hover:border-slate-700 p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-slate-100 truncate">
                    {c.filename || `合成任务 ${c.id}`}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {c.status === 'done' ? (c.file_exists ? '可播放' : '文件已移除') : c.status} ·{' '}
                    {c.width}×{c.height} · {c.duration || 0}s · {c.encoder || '-'} ·{' '}
                    {formatTime(c.created_at)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {c.status === 'done' && c.file_exists && c.video_url ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onPlayComposition(c)}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-500 px-2.5 py-1.5 text-xs font-medium text-white cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>播放</span>
                      </button>
                      <a
                        href={c.video_url}
                        download={c.filename}
                        title="下载 MP4"
                        className="rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 p-1.5 text-slate-300"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onDeleteComposition(c.id)}
                    title="删除成片及磁盘文件"
                    className="rounded-lg border border-slate-800 bg-[#0c121e] hover:bg-rose-500/15 hover:border-rose-500/40 p-1.5 text-slate-400 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
