import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Ban,
  BookmarkPlus,
  Camera,
  ChevronDown,
  Copy,
  Dices,
  LayoutList,
  List,
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
  onCollapse,
  collapsible = false,
}) {
  const tags = splitPromptTags(shot.prompt);
  const charCount = (shot.narration || '').trim().length;

  return (
    <article
      id={`script-shot-${index}`}
      className="rounded-2xl border border-slate-800/90 hover:border-slate-700/80 bg-[#111827]/90 p-4 space-y-3 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
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
          {collapsible ? (
            <button
              type="button"
              onClick={onCollapse}
              title="收起为紧凑行"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0c121e] hover:bg-slate-800 px-2 py-1 text-[11px] text-slate-300 cursor-pointer mr-1"
            >
              <ChevronDown className="w-3.5 h-3.5 rotate-180 text-blue-400" />
              <span>收起</span>
            </button>
          ) : null}
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
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] gap-3.5 items-stretch">
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

function CompactShotRow({
  shot,
  index,
  total,
  onExpand,
  onMoveUp,
  onMoveDown,
  onDelete,
}) {
  const tags = splitPromptTags(shot.prompt);
  const hasCamera = tags.length > 0 && CAMERA_FRAMING_RE.test(tags[0]);
  const promptPreview = (hasCamera ? tags.slice(1) : tags).join(', ') || shot.prompt || '待填写英文画面提示词';

  return (
    <div
      id={`script-shot-${index}`}
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onExpand();
        }
      }}
      className="group rounded-xl border border-slate-800/90 hover:border-blue-500/45 bg-[#111827]/90 hover:bg-[#141d2e] px-3.5 py-2.5 space-y-1.5 cursor-pointer transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="rounded-md bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 text-[11px] font-mono font-bold text-blue-300 tabular-nums shrink-0">
            #{String(index + 1).padStart(2, '0')}
          </span>
          {hasCamera ? (
            <span className="inline-flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-200 shrink-0">
              {tags[0]}
            </span>
          ) : null}
          <span className="text-[10px] text-slate-500 tabular-nums shrink-0">
            · {shot.duration || 4}s
          </span>
        </div>

        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            title="上移"
            className="rounded-md border border-slate-800 bg-[#0c121e] hover:bg-slate-800 disabled:opacity-30 p-1 text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            title="下移"
            className="rounded-md border border-slate-800 bg-[#0c121e] hover:bg-slate-800 disabled:opacity-30 p-1 text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="删除此镜"
            className="rounded-md border border-slate-800 bg-[#0c121e] hover:bg-rose-500/15 hover:border-rose-500/40 p-1 text-slate-400 hover:text-rose-300 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onExpand}
            title="展开编辑旁白与提示词"
            className="inline-flex items-center gap-0.5 rounded-md border border-slate-700/80 bg-[#0c121e] group-hover:border-blue-500/40 group-hover:text-blue-200 px-2 py-0.5 text-[10px] font-medium text-slate-300 cursor-pointer"
          >
            <ChevronDown className="w-3 h-3" />
            <span>展开编辑</span>
          </button>
        </div>
      </div>

      {/* Full readable Chinese narration (no truncation) */}
      <p className="text-[13.5px] leading-relaxed text-slate-100 whitespace-pre-wrap break-words">
        {shot.narration?.trim() || <span className="text-slate-500 text-xs">暂无中文旁白（点击展开填写）</span>}
      </p>

      {/* Subtle 1-line visual prompt preview */}
      <p className="text-[11px] text-slate-500 truncate">
        <span className="text-slate-400 mr-1">画面:</span>
        {promptPreview}
        {tags.length > 0 ? <span className="text-slate-600 ml-1.5">({tags.length} 标签)</span> : null}
      </p>
    </div>
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
  onMoveShotUp,
  onMoveShotDown,
  onDuplicateShot,
  onDeleteShot,
  onNextStep,
}) {
  const [chipName, setChipName] = useState('');
  const [viewMode, setViewMode] = useState(() => (shots.length >= 10 ? 'compact' : 'detail'));
  const [expandedUid, setExpandedUid] = useState('');
  const manualViewRef = useRef(false);

  useEffect(() => {
    if (!manualViewRef.current) {
      setViewMode(shots.length >= 10 ? 'compact' : 'detail');
    }
  }, [shots.length]);

  const jumpChunks = [];
  if (shots.length > 8) {
    for (let i = 0; i < shots.length; i += 5) {
      jumpChunks.push({
        startIdx: i,
        label: `#${i + 1}-${Math.min(shots.length, i + 5)}`,
      });
    }
  }

  const handleSaveChip = () => {
    const clean = chipName.trim();
    if (!clean || !prefix.trim()) return;
    onAddCustomChip(clean, prefix.trim());
    setChipName('');
  };

  return (
    <main className="max-w-[1440px] mx-auto px-4 lg:px-6 py-5 grid grid-cols-1 lg:grid-cols-[410px_minmax(0,1fr)] gap-5 items-start">
      {/* Left: AI Script Generator + Visual DNA (sticky sidebar) */}
      <aside className="rounded-2xl border border-slate-800/90 bg-[#111827]/95 p-4 space-y-4 shadow-xl shadow-black/30 lg:sticky lg:top-[68px] lg:max-h-[calc(100vh-84px)] lg:overflow-y-auto">
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

      {/* Right: Sticky Toolbar + Script Outline / Detail Cards */}
      <section className="space-y-3 min-w-0">
        <div className="sticky top-[64px] z-20 rounded-2xl border border-slate-800/90 bg-[#111827]/95 backdrop-blur-xl px-4 py-3 space-y-2.5 shadow-xl shadow-black/40">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-bold text-slate-100">
                  分镜文字脚本（共 {shots.length} 镜）
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {viewMode === 'compact'
                    ? '紧凑大纲模式 · 点击任意一镜展开详细编辑'
                    : '确认各镜中文旁白与英文画面描述后进入 Step 2'}
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
                  { value: 'compact', label: '紧凑大纲', icon: List },
                  { value: 'detail', label: '详情卡片', icon: LayoutList },
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
                onClick={onAddShot}
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

          {jumpChunks.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-500 mr-1">快速定位:</span>
              {jumpChunks.map((chunk) => (
                <button
                  key={chunk.label}
                  type="button"
                  onClick={() => {
                    document
                      .getElementById(`script-shot-${chunk.startIdx}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="rounded-md border border-slate-800 bg-[#0c121e] hover:border-blue-500/45 hover:text-blue-200 px-2 py-0.5 text-[10px] font-mono text-slate-400 cursor-pointer transition-colors"
                >
                  {chunk.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className={viewMode === 'compact' ? 'space-y-1.5' : 'space-y-3'}>
          {shots.map((shot, idx) =>
            viewMode === 'compact' && expandedUid !== shot.uid ? (
              <CompactShotRow
                key={shot.uid}
                shot={shot}
                index={idx}
                total={shots.length}
                onExpand={() => setExpandedUid(shot.uid)}
                onMoveUp={() => onMoveShotUp(idx)}
                onMoveDown={() => onMoveShotDown(idx)}
                onDelete={() => onDeleteShot(shot.uid)}
              />
            ) : (
              <ScriptShotCard
                key={shot.uid}
                shot={shot}
                index={idx}
                total={shots.length}
                collapsible={viewMode === 'compact'}
                onCollapse={() => setExpandedUid('')}
                onChangeNarration={(val) => onChangeShotNarration(shot.uid, val)}
                onChangePrompt={(val) => onChangeShotPrompt(shot.uid, val)}
                onMoveUp={() => onMoveShotUp(idx)}
                onMoveDown={() => onMoveShotDown(idx)}
                onDuplicate={() => onDuplicateShot(idx)}
                onDelete={() => onDeleteShot(shot.uid)}
              />
            )
          )}
        </div>
      </section>
    </main>
  );
}
