import {
  ArrowRight,
  Clapperboard,
  Download,
  Film,
  FolderOpen,
  Loader2,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  ASPECT_RATIOS,
  IDEA_SUGGESTIONS,
  NARRATION_STYLES,
  SHOT_COUNT_OPTIONS,
  STYLE_CHIPS,
} from '../data/presets';
import AutoGrowTextarea from './ui/AutoGrowTextarea';
import SegmentedControl from './ui/SegmentedControl';
import SelectDropdown from './ui/SelectDropdown';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function HomePage({
  storyIdea,
  onStoryIdeaChange,
  aiShotCount,
  onAiShotCountChange,
  aspectValue,
  onAspectChange,
  narrationStyle,
  onNarrationStyleChange,
  prefix,
  onPrefixChange,
  llmConfigured,
  generatingStoryboard,
  onStartWithAi,
  onCreateBlank,
  projects,
  compositions,
  onOpenProject,
  onDeleteProject,
  onPlayComposition,
  onDeleteComposition,
}) {
  const readyCompositions = compositions.filter((c) => c.status === 'done' && c.file_exists);
  const compProjectIds = new Set(readyCompositions.map((c) => c.project_id).filter(Boolean));
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const styleOptions = [
    { value: '', label: '由 AI 根据主题自动匹配画风' },
    ...STYLE_CHIPS.map((c) => ({ value: c.prefix, label: c.label })),
  ];

  return (
    <main className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 space-y-8">
      {/* Hero Creation Launcher */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-[#12192b] via-[#101624] to-[#0d1420] p-5 sm:p-7 shadow-2xl shadow-black/40">
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_380px] gap-6 items-start">
          {/* Left: Story Idea Input */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/35 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>3 步完成 AI 分镜短片：剧本编排 → 配音出图 → 运镜合成</span>
              </div>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full border ${
                  llmConfigured
                    ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                    : 'text-amber-300 border-amber-500/30 bg-amber-500/10'
                }`}
              >
                {llmConfigured ? 'DeepSeek 剧本引擎就绪' : '未配置 DeepSeek Key'}
              </span>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                输入一句话灵感，AI 为你生成全套分镜短片
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-400 mt-1">
                不再受限于固定模板——输入任意故事、绘本或科普主题，自动生成统一主角画风、逐镜提示词与中文旁白。
              </p>
            </div>

            <AutoGrowTextarea
              minHeight={88}
              value={storyIdea}
              onChange={(e) => onStoryIdeaChange(e.target.value)}
              placeholder="例如：一只怕黑的小橘猫，在夏夜跟着萤火虫学会了勇敢..."
              className="w-full rounded-2xl border border-slate-700/80 bg-[#090e18]/90 px-4 py-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />

            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-slate-400">灵感试一试：</div>
              <div className="flex flex-wrap gap-1.5">
                {IDEA_SUGGESTIONS.map((idea, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onStoryIdeaChange(idea)}
                    className="rounded-full border border-slate-700/80 bg-slate-900/80 hover:border-indigo-400/60 hover:bg-indigo-500/10 hover:text-indigo-200 px-3 py-1 text-xs text-slate-300 transition-colors cursor-pointer text-left"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Parameters & Start CTA */}
          <div className="rounded-2xl border border-slate-800/90 bg-[#0b101b]/90 p-4 space-y-3.5">
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-300">目标镜头数</span>
                <span className="text-[11px] text-slate-500">可随时增删</span>
              </div>
              <SegmentedControl
                fullWidth
                size="sm"
                value={aiShotCount}
                onChange={onAiShotCountChange}
                options={SHOT_COUNT_OPTIONS}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-1.5">旁白口吻</div>
                <SelectDropdown
                  size="sm"
                  value={narrationStyle}
                  onChange={onNarrationStyleChange}
                  options={NARRATION_STYLES}
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-1.5">成片画幅</div>
                <SelectDropdown
                  size="sm"
                  value={aspectValue}
                  onChange={onAspectChange}
                  options={ASPECT_RATIOS.map((a) => ({
                    value: a.value,
                    label: a.shortLabel,
                    badge: a.hint,
                  }))}
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-300 mb-1.5">参考画风（可选）</div>
              <SelectDropdown
                size="sm"
                value={styleOptions.some((o) => o.value === prefix) ? prefix : ''}
                onChange={onPrefixChange}
                options={styleOptions}
              />
            </div>

            <div className="pt-1 space-y-2">
              <button
                type="button"
                onClick={onStartWithAi}
                disabled={generatingStoryboard || !llmConfigured || !storyIdea.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 disabled:opacity-45 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
              >
                {generatingStoryboard ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>正在编排全套分镜…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>AI 生成剧本并开始创作</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onCreateBlank}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#111827] hover:bg-slate-800 hover:border-slate-600 px-3 py-2 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>手动新建空白项目</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Projects Grid */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-blue-400" />
            <h2 className="text-base font-bold text-slate-100">我的分镜项目</h2>
            <span className="rounded-full border border-slate-800 bg-[#111827] px-2 py-0.5 text-[11px] text-slate-400 tabular-nums">
              {projects.length}
            </span>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-[#111827]/40 py-10 text-center text-xs text-slate-500">
            还没有保存的分镜项目，请在上方输入创意或点击「手动新建空白项目」开始。
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((p) => {
              const hasComp = compProjectIds.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => onOpenProject(p.id)}
                  className="group rounded-2xl border border-slate-800/90 hover:border-blue-500/50 bg-[#111827]/90 overflow-hidden flex flex-col transition-all cursor-pointer shadow-md shadow-black/25"
                >
                  <div className="relative aspect-video bg-[#090d14] border-b border-slate-800/80 overflow-hidden flex items-center justify-center">
                    {p.cover_filename ? (
                      <img
                        src={`/results/${encodeURIComponent(p.cover_filename)}`}
                        alt={p.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-slate-600">
                        <Clapperboard className="w-6 h-6 opacity-60" />
                        <span className="text-[11px]">待生成分镜图</span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className="rounded-md bg-slate-950/80 backdrop-blur-sm border border-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-200 tabular-nums">
                        {p.ready_count}/{p.shot_count} 镜
                      </span>
                      {hasComp ? (
                        <span className="rounded-md bg-emerald-950/85 backdrop-blur-sm border border-emerald-400/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 shadow-sm">
                          已成片
                        </span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(p.id);
                      }}
                      title="删除项目"
                      className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 rounded-lg bg-slate-950/85 border border-white/10 hover:border-rose-500/50 hover:bg-rose-500/20 p-1.5 text-slate-400 hover:text-rose-300 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-3.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-100 truncate group-hover:text-blue-300 transition-colors">
                        {p.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                        {p.width}×{p.height} · {formatTime(p.updated_at)}
                      </div>
                    </div>
                    <span className="rounded-lg border border-slate-700/80 bg-[#0c121e] group-hover:border-blue-500/40 group-hover:text-blue-300 px-2.5 py-1 text-[11px] font-medium text-slate-300 shrink-0 transition-colors">
                      继续编辑
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Ready Compositions Showcase */}
      {readyCompositions.length > 0 ? (
        <section className="space-y-3.5">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">已导出成片</h2>
            <span className="rounded-full border border-slate-800 bg-[#111827] px-2 py-0.5 text-[11px] text-slate-400 tabular-nums">
              {readyCompositions.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {readyCompositions.map((c, idx) => {
              const linkedProj = c.project_id ? projectMap[c.project_id] : null;
              const displayTitle = c.project_title || linkedProj?.title || c.filename || '未命名成片';
              const downloadName = c.project_title || linkedProj?.title
                ? `${(c.project_title || linkedProj.title).replace(/[\\/:*?"<>|]/g, '_')}.mp4`
                : c.filename;
              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-800/90 bg-[#111827]/90 p-3.5 flex flex-col gap-3 shadow-md shadow-black/25"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {linkedProj?.cover_filename ? (
                        <img
                          src={`/results/${encodeURIComponent(linkedProj.cover_filename)}`}
                          alt={displayTitle}
                          className="w-12 h-9 rounded-lg object-cover border border-slate-700/80 bg-[#090d14] shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                          <Film className="w-4 h-4 text-cyan-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-slate-100 truncate">
                            {displayTitle}
                          </span>
                          {idx === 0 ? (
                            <span className="rounded bg-indigo-500/20 border border-indigo-400/35 px-1.5 py-0.2 text-[10px] font-medium text-indigo-200 shrink-0">
                              最新
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums truncate">
                          {c.width}×{c.height} · {c.duration}s · {c.encoder || 'h264'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 tabular-nums">
                      {formatTime(c.updated_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/70">
                    <button
                      type="button"
                      onClick={() => onPlayComposition(c)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/35 bg-cyan-500/15 hover:bg-cyan-500/25 px-3 py-1.5 text-xs font-semibold text-cyan-200 cursor-pointer transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>播放成片</span>
                    </button>
                    <a
                      href={c.video_url}
                      download={downloadName}
                      title={`下载 ${downloadName}`}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>下载</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => onDeleteComposition(c.id)}
                      title="删除成片"
                      className="rounded-lg border border-slate-800 bg-[#0c121e] hover:bg-rose-500/15 hover:border-rose-500/40 p-1.5 text-slate-400 hover:text-rose-300 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}
