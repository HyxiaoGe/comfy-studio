import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Ban,
  BookmarkPlus,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Dices,
  FileText,
  LayoutList,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import {
  ASPECT_RATIOS,
  IDEA_SUGGESTIONS,
  NARRATION_STYLES,
  STYLE_CHIPS,
} from '../data/presets';
import AutoGrowTextarea from './ui/AutoGrowTextarea';
import Collapsible from './ui/Collapsible';
import PromptTagsField, { CAMERA_FRAMING_RE, splitPromptTags } from './ui/PromptTagsField';
import SegmentedControl from './ui/SegmentedControl';
import SelectDropdown from './ui/SelectDropdown';
import StoryScopeControl from './ui/StoryScopeControl';
import ToggleSwitch from './ui/ToggleSwitch';

function ScriptShotCard({
  shot,
  index,
  total,
  onChangeNarration,
  onChangePrompt,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}) {
  const tags = splitPromptTags(shot.prompt);
  const charCount = (shot.narration || '').trim().length;

  return (
    <article
      id={`script-shot-${index}`}
      className="h-full flex flex-col rounded-2xl border border-slate-800/90 hover:border-slate-700/80 bg-[#0d1320]/90 p-4 gap-3 transition-colors"
    >
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-xs font-mono font-bold text-blue-300">
            #{String(index + 1).padStart(2, '0')}
          </span>
          {tags.length > 0 && CAMERA_FRAMING_RE.test(tags[0]) ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-200">
              <Camera className="w-3 h-3 text-cyan-400" />
              <span>{tags[0]}</span>
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            title="上移"
            className="rounded-lg border border-slate-800 bg-[#0c121e] hover:bg-slate-800 disabled:opacity-35 p-1.5 text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            title="下移"
            className="rounded-lg border border-slate-800 bg-[#0c121e] hover:bg-slate-800 disabled:opacity-35 p-1.5 text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            title="复制此镜"
            className="rounded-lg border border-slate-800 bg-[#0c121e] hover:bg-slate-800 p-1.5 text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="删除此镜"
            className="rounded-lg border border-slate-800 bg-[#0c121e] hover:bg-rose-500/15 hover:border-rose-500/40 p-1.5 text-slate-400 hover:text-rose-300 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Equal-height alignment between Chinese Narration and English Prompt */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] gap-3.5 items-stretch">
        <div className="flex flex-col gap-1.5 h-full">
          <div className="flex items-center justify-between shrink-0">
            <label className="text-[11px] font-medium text-indigo-300">
              中文旁白 / 字幕文案
            </label>
            <span className="text-[10px] text-slate-500 tabular-nums">
              {charCount > 0 ? `${charCount} 字` : '待填写'}
            </span>
          </div>
          <div className="flex-1 flex flex-col rounded-xl border border-indigo-500/25 focus-within:border-indigo-400 bg-[#0c121e]/90 focus-within:bg-[#0c121e] transition-colors">
            <AutoGrowTextarea
              minHeight={44}
              value={shot.narration || ''}
              onChange={(e) => onChangeNarration(e.target.value)}
              placeholder="填写这一镜的口语化中文旁白…"
              className="w-full flex-1 bg-transparent px-3 py-2 text-[13.5px] text-slate-100 placeholder-slate-500 focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        <PromptTagsField
          className="h-full"
          value={shot.prompt || ''}
          onChange={onChangePrompt}
          label="英文生图提示词"
          hint="自动拼接公共画风"
          placeholder="点击填写英文画面描述（用逗号分隔视觉元素）…"
          highlightCamera
          minHeight={44}
        />
      </div>
    </article>
  );
}

export default function StepOneScript({
  title,
  onTitleChange,
  storyIdea,
  onStoryIdeaChange,
  storyPlanMode,
  onStoryPlanModeChange,
  aiTargetDuration,
  onAiTargetDurationChange,
  aiShotCount,
  onAiShotCountChange,
  generatingStoryboard,
  onGenerateStoryboard,
  llmConfigured,
  prefix,
  onPrefixChange,
  customChips,
  onAddCustomChip,
  onRemoveCustomChip,
  aspectValue,
  onAspectChange,
  seed,
  onSeedChange,
  onRandomSeed,
  autoRandomize,
  onAutoRandomizeChange,
  negativePrompt,
  onNegativeChange,
  narrationStyle,
  onNarrationStyleChange,
  generatingNarration,
  onGenerateNarration,
  shots,
  onAddShot,
  onChangeShotPrompt,
  onChangeShotNarration,
  onChangeAllNarrations,
  onMoveShotUp,
  onMoveShotDown,
  onDuplicateShot,
  onDeleteShot,
  onNextStep,
}) {
  const [chipName, setChipName] = useState('');
  const [viewMode, setViewMode] = useState(() => (shots.length >= 8 ? 'outline' : 'detail'));
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [outlineText, setOutlineText] = useState(() =>
    shots.map((s) => (s.narration || '').replace(/\n+/g, ' ').trim()).join('\n')
  );
  const [copiedOutline, setCopiedOutline] = useState(false);
  const manualViewRef = useRef(false);
  const outlineEditingRef = useRef(false);
  const pointerStartRef = useRef(null);
  const wheelLockRef = useRef(0);

  const shotsOutlineKey = shots.map((s) => `${s.uid}:${s.narration || ''}`).join('\u0001');
  const safeIndex = shots.length > 0 ? Math.max(0, Math.min(shots.length - 1, activeIndex)) : 0;

  useEffect(() => {
    if (!manualViewRef.current) {
      setViewMode(shots.length >= 8 ? 'outline' : 'detail');
    }
  }, [shots.length]);

  useEffect(() => {
    if (activeIndex >= shots.length && shots.length > 0) {
      setActiveIndex(shots.length - 1);
    }
  }, [activeIndex, shots.length]);

  useEffect(() => {
    if (!outlineEditingRef.current) {
      setOutlineText(shots.map((s) => (s.narration || '').replace(/\n+/g, ' ').trim()).join('\n'));
    }
  }, [shotsOutlineKey, viewMode]);

  useEffect(() => {
    if (viewMode !== 'detail' || shots.length <= 1) return;
    const onKeyDown = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'textarea' || tag === 'input') return;
      if (e.key === 'ArrowLeft') {
        setActiveIndex((i) => (i - 1 + shots.length) % shots.length);
      } else if (e.key === 'ArrowRight') {
        setActiveIndex((i) => (i + 1) % shots.length);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewMode, shots.length]);

  const outlineLines = outlineText.split('\n');
  const totalChars = outlineText.replace(/\s+/g, '').length;

  const handleOutlineChange = (val) => {
    setOutlineText(val);
    const lines = val.split('\n');
    const cleanLines =
      lines.length === shots.length ? lines : lines.filter((l) => l.trim().length > 0);
    onChangeAllNarrations(cleanLines);
  };

  const handleCopyOutline = async () => {
    const clean = outlineText.trim();
    if (!clean) return;
    try {
      await navigator.clipboard.writeText(clean);
      setCopiedOutline(true);
      setTimeout(() => setCopiedOutline(false), 1400);
    } catch {
      // ignore
    }
  };

  const handleSaveChip = () => {
    const clean = chipName.trim();
    if (!clean || !prefix.trim()) return;
    onAddCustomChip(clean, prefix.trim());
    setChipName('');
  };

  const handleSlidePointerDown = (e) => {
    if (e.target?.closest?.('textarea, input, button, [role="button"], a')) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleSlidePointerMove = (e) => {
    const st = pointerStartRef.current;
    if (!st) return;
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) {
      setDragOffset(Math.max(-64, Math.min(64, dx * 0.6)));
    }
  };

  const handleSlidePointerEnd = (e) => {
    const st = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!st) {
      setDragOffset(0);
      return;
    }
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.1 && shots.length > 1) {
      if (dx < 0) {
        setActiveIndex((safeIndex + 1) % shots.length);
      } else if (dx > 0) {
        setActiveIndex((safeIndex - 1 + shots.length) % shots.length);
      }
    }
    setDragOffset(0);
  };

  const handleSlideWheel = (e) => {
    if (shots.length <= 1 || Math.abs(e.deltaX) < 30 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    const now = Date.now();
    if (now - wheelLockRef.current < 360) return;
    wheelLockRef.current = now;
    if (e.deltaX > 0) {
      setActiveIndex((safeIndex + 1) % shots.length);
    } else if (e.deltaX < 0) {
      setActiveIndex((safeIndex - 1 + shots.length) % shots.length);
    }
  };

  const isOutline = viewMode === 'outline';
  const activeShot = shots[safeIndex];

  return (
    <main className="max-w-[1440px] mx-auto px-4 lg:px-6 py-5 grid grid-cols-1 lg:grid-cols-[410px_minmax(0,1fr)] gap-5 items-stretch">
      {/* Left: AI Script Generator + Visual DNA */}
      <aside className="rounded-2xl border border-slate-800/90 bg-[#111827]/95 p-4 space-y-4 shadow-xl shadow-black/30 h-full">
        {/* Project Title */}
        <div>
          <label htmlFor="step1-title" className="block text-xs font-semibold text-slate-300 mb-1.5">
            项目名称
          </label>
          <input
            id="step1-title"
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="输入项目标题…"
            className="w-full rounded-xl border border-slate-700/80 bg-[#0c121e] px-3 py-2 text-sm font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* AI Full Storyboard Card */}
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI 创意重写 / 生成全部分镜</span>
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded border ${
                llmConfigured
                  ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                  : 'text-amber-300 border-amber-500/30 bg-amber-500/10'
              }`}
            >
              {llmConfigured ? 'DeepSeek 就绪' : '未配 Key'}
            </span>
          </div>

          <AutoGrowTextarea
            minHeight={64}
            value={storyIdea}
            onChange={(e) => onStoryIdeaChange(e.target.value)}
            placeholder="输入新故事创意，AI 将生成标题、画风前缀、各镜提示词与旁白…"
            className="w-full rounded-lg border border-slate-700/80 bg-[#0c121e] px-2.5 py-2 text-xs leading-relaxed text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />

          <div className="flex flex-wrap gap-1.5">
            {IDEA_SUGGESTIONS.map((idea, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onStoryIdeaChange(idea)}
                title={idea}
                className="max-w-full truncate rounded-full border border-slate-700/80 bg-slate-900/80 hover:border-indigo-400/60 hover:text-indigo-200 px-2 py-0.5 text-[11px] text-slate-400 transition-colors cursor-pointer"
              >
                {idea}
              </button>
            ))}
          </div>

          <StoryScopeControl
            planMode={storyPlanMode}
            onPlanModeChange={onStoryPlanModeChange}
            targetDuration={aiTargetDuration}
            onTargetDurationChange={onAiTargetDurationChange}
            shotCount={aiShotCount}
            onShotCountChange={onAiShotCountChange}
            compact
          />

          <button
            type="button"
            disabled={generatingStoryboard || !llmConfigured || !storyIdea.trim()}
            onClick={onGenerateStoryboard}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 disabled:opacity-45 disabled:cursor-not-allowed px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
          >
            {generatingStoryboard ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>正在编排剧本…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI 一键生成 / 替换分镜</span>
              </>
            )}
          </button>
        </div>

        {/* Common Style & Character Prefix */}
        <div>
          <PromptTagsField
            value={prefix}
            onChange={onPrefixChange}
            label="公共画风 / 主角设定（英文）"
            hint="自动拼到每镜前"
            placeholder="点击填写统一画风 + 主角外貌英文描述（逗号分隔）…"
            tone="blue"
            minHeight={56}
          />

          <div className="flex flex-wrap gap-1.5 mt-2">
            {STYLE_CHIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.prefix}
                onClick={() => onPrefixChange(c.prefix)}
                className="rounded-full border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/25 px-2.5 py-1 text-[11px] font-medium text-blue-300 hover:text-white transition-colors cursor-pointer"
              >
                {c.label}
              </button>
            ))}
            {customChips.map((c, idx) => (
              <span
                key={`${c.label}_${idx}`}
                title={c.prefix}
                className="inline-flex items-center gap-1 rounded-full border border-cyan-500/35 bg-cyan-500/10 hover:bg-cyan-500/20 pl-2.5 pr-1.5 py-1 text-[11px] font-medium text-cyan-200"
              >
                <button
                  type="button"
                  onClick={() => onPrefixChange(c.prefix)}
                  className="cursor-pointer hover:text-white"
                >
                  {c.label}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveCustomChip(idx)}
                  title="删除胶囊"
                  className="rounded-full p-0.5 text-cyan-300/70 hover:text-rose-300 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-2.5">
            <input
              type="text"
              value={chipName}
              onChange={(e) => setChipName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveChip();
              }}
              placeholder="保存为自定义画风胶囊…"
              className="flex-1 min-w-0 rounded-lg border border-slate-700/80 bg-[#0c121e] px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleSaveChip}
              disabled={!chipName.trim() || !prefix.trim()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 disabled:opacity-40 px-2.5 py-1.5 text-xs font-medium text-slate-200 shrink-0 cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-cyan-400" />
              <span>保存</span>
            </button>
          </div>
        </div>

        {/* Aspect Ratio */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-300">成片画幅</span>
            <span className="text-[11px] text-slate-500">
              {ASPECT_RATIOS.find((a) => a.value === aspectValue)?.hint || '1344×768'}
            </span>
          </div>
          <SegmentedControl
            fullWidth
            size="sm"
            variant="subtle"
            value={aspectValue}
            onChange={onAspectChange}
            options={ASPECT_RATIOS.map((a) => ({
              value: a.value,
              label: a.shortLabel,
              title: `${a.shortLabel} (${a.hint})`,
            }))}
          />
        </div>

        {/* Advanced SDXL Settings */}
        <Collapsible title="高级生图参数（Seed / 负提示词）" icon={Ban}>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label htmlFor="step1-seed" className="text-xs font-medium text-slate-300">
                  全局种子（Seed）
                </label>
                <span className="text-[11px] text-slate-500">同种子保持角色连贯</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="step1-seed"
                  type="number"
                  value={seed}
                  onChange={(e) => onSeedChange(Number(e.target.value) || 0)}
                  className="flex-1 min-w-0 rounded-lg border border-slate-700/80 bg-[#090d14] px-3 py-1.5 text-xs tabular-nums text-slate-100 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={onRandomSeed}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#090d14] hover:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer"
                >
                  <Dices className="w-3.5 h-3.5 text-blue-400" />
                  <span>随机</span>
                </button>
              </div>
              <ToggleSwitch
                checked={autoRandomize}
                onChange={onAutoRandomizeChange}
                label="批量生成前自动换新种子"
              />
            </div>

            <PromptTagsField
              value={negativePrompt}
              onChange={onNegativeChange}
              label="负提示词 (Negative Prompt)"
              placeholder="点击填写需要屏蔽的画面元素…"
              tone="rose"
              compact
              minHeight={44}
            />
          </div>
        </Collapsible>
      </aside>

      {/* Right: Top Toolbar + Full Narration Textbox OR Paginated Swipeable Carousel */}
      <section className="min-w-0 flex flex-col gap-3 h-full">
        <div className="rounded-2xl border border-slate-800/90 bg-[#111827]/95 backdrop-blur-xl px-4 py-3 space-y-2.5 shadow-xl shadow-black/40 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-bold text-slate-100">
                  分镜文字脚本（共 {shots.length} 镜）
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isOutline
                    ? '旁白全文视图 · 在一个文本框里完整通读与微调故事旁白'
                    : `逐镜详情分页 · 第 ${safeIndex + 1} / ${shots.length} 镜，支持左右滑动切换`}
                </p>
              </div>
              <SegmentedControl
                size="xs"
                variant="subtle"
                value={viewMode}
                onChange={(v) => {
                  manualViewRef.current = true;
                  setViewMode(v);
                }}
                options={[
                  { value: 'outline', label: '旁白全文', icon: FileText },
                  { value: 'detail', label: '逐镜详情', icon: LayoutList },
                ]}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <SelectDropdown
                size="sm"
                className="w-[116px]"
                value={narrationStyle}
                onChange={onNarrationStyleChange}
                options={NARRATION_STYLES}
              />
              <button
                type="button"
                onClick={onGenerateNarration}
                disabled={generatingNarration || !llmConfigured || shots.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/25 disabled:opacity-45 px-2.5 py-1.5 text-xs font-semibold text-indigo-200 transition-colors cursor-pointer"
              >
                {generatingNarration ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                <span>{generatingNarration ? '重写中…' : 'AI 重写旁白'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddShot();
                  setActiveIndex(shots.length);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                <span>新增镜</span>
              </button>
              <button
                type="button"
                onClick={onNextStep}
                disabled={shots.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-45 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-950/50 transition-colors cursor-pointer"
              >
                <span>下一步：配音与生图</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {isOutline ? (
          <div className="flex-1 flex flex-col rounded-2xl border border-slate-800/90 bg-[#111827]/95 p-4 gap-2.5 shadow-xl shadow-black/30">
            <div className="flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs font-semibold text-indigo-300">
                完整旁白文稿（每行对应第 1～{shots.length} 镜）
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {totalChars} 字 · {outlineLines.length} 行
                </span>
                {outlineText.trim() ? (
                  <button
                    type="button"
                    onClick={handleCopyOutline}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-[#0c121e] hover:bg-slate-800 px-2 py-1 text-[11px] text-slate-300 cursor-pointer transition-colors"
                  >
                    {copiedOutline ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>复制全文</span>
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            </div>

            <textarea
              value={outlineText}
              onFocus={() => {
                outlineEditingRef.current = true;
              }}
              onBlur={() => {
                outlineEditingRef.current = false;
                setOutlineText(
                  shots.map((s) => (s.narration || '').replace(/\n+/g, ' ').trim()).join('\n')
                );
              }}
              onChange={(e) => handleOutlineChange(e.target.value)}
              placeholder="每行代表一个镜头的中文旁白，可直接完整阅读或修改…"
              className="flex-1 w-full min-h-[340px] rounded-xl border border-indigo-500/25 focus:border-indigo-400 bg-[#090d14]/90 px-4 py-3.5 text-[14px] leading-[1.95] text-slate-100 placeholder-slate-500 focus:outline-none resize-none"
            />

            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 shrink-0 flex-wrap">
              <span>
                无需来回翻滚，直接通读整篇旁白；如需逐镜微调英文生图提示词，点上方「逐镜详情」。
              </span>
              {outlineLines.length !== shots.length ? (
                <span className="text-amber-300 font-medium tabular-nums">
                  当前 {outlineLines.length} 行（分镜共 {shots.length} 镜，将按非空行顺序对齐）
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col rounded-2xl border border-slate-800/90 bg-[#111827]/95 p-4 justify-between gap-3 shadow-xl shadow-black/30">
            {/* Swipeable Card Viewport */}
            <div
              onPointerDown={handleSlidePointerDown}
              onPointerMove={handleSlidePointerMove}
              onPointerUp={handleSlidePointerEnd}
              onPointerCancel={handleSlidePointerEnd}
              onWheel={handleSlideWheel}
              className="flex-1 flex flex-col overflow-hidden touch-pan-y select-none cursor-grab active:cursor-grabbing"
            >
              {activeShot ? (
                <div
                  className="flex-1 flex flex-col transition-transform duration-150 ease-out select-text"
                  style={{ transform: `translateX(${dragOffset}px)` }}
                >
                  <ScriptShotCard
                    key={activeShot.uid}
                    shot={activeShot}
                    index={safeIndex}
                    total={shots.length}
                    onChangeNarration={(val) => onChangeShotNarration(activeShot.uid, val)}
                    onChangePrompt={(val) => onChangeShotPrompt(activeShot.uid, val)}
                    onMoveUp={() => {
                      if (safeIndex > 0) {
                        onMoveShotUp(safeIndex);
                        setActiveIndex(safeIndex - 1);
                      }
                    }}
                    onMoveDown={() => {
                      if (safeIndex < shots.length - 1) {
                        onMoveShotDown(safeIndex);
                        setActiveIndex(safeIndex + 1);
                      }
                    }}
                    onDuplicate={() => {
                      onDuplicateShot(safeIndex);
                      setActiveIndex(safeIndex + 1);
                    }}
                    onDelete={() => {
                      onDeleteShot(activeShot.uid);
                      setActiveIndex((i) => Math.max(0, Math.min(i, shots.length - 2)));
                    }}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                  暂无分镜，请点击上方「新增镜」
                </div>
              )}
            </div>

            {/* Bottom Carousel Pagination Dots & Arrows */}
            {shots.length > 0 ? (
              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveIndex((safeIndex - 1 + shots.length) % shots.length)}
                  disabled={shots.length <= 1}
                  title={safeIndex === 0 ? '循环到最后一镜' : '上一镜'}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed px-2.5 py-1.5 text-xs font-medium text-slate-200 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>{safeIndex === 0 && shots.length > 1 ? '末镜' : '上一镜'}</span>
                </button>

                <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-full">
                    {shots.map((s, idx) => {
                      const active = idx === safeIndex;
                      return (
                        <button
                          key={s.uid}
                          type="button"
                          onClick={() => setActiveIndex(idx)}
                          title={`第 ${idx + 1} 镜${s.narration ? `：${s.narration.slice(0, 18)}` : ''}`}
                          aria-label={`切换到第 ${idx + 1} 镜`}
                          className={`rounded-full transition-all cursor-pointer ${
                            active
                              ? 'w-7 h-2.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]'
                              : 'w-2.5 h-2.5 bg-slate-700 hover:bg-slate-500'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-slate-500 tabular-nums">
                    第 {safeIndex + 1} / {shots.length} 镜 · 支持鼠标拖拽 / 触屏 / 触摸板左右滑动切换
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveIndex((safeIndex + 1) % shots.length)}
                  disabled={shots.length <= 1}
                  title={safeIndex === shots.length - 1 ? '回到第一镜' : '下一镜'}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed px-2.5 py-1.5 text-xs font-medium text-slate-200 cursor-pointer transition-colors"
                >
                  <span>{safeIndex === shots.length - 1 && shots.length > 1 ? '回首镜' : '下一镜'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
