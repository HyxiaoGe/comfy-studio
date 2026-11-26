import { useState } from 'react';
import {
  Ban,
  BookmarkPlus,
  Dices,
  Film,
  Palette,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { ASPECT_RATIOS, STORY_PRESETS, STYLE_CHIPS } from '../data/presets';
import SelectDropdown from './ui/SelectDropdown';
import SegmentedControl from './ui/SegmentedControl';
import ToggleSwitch from './ui/ToggleSwitch';
import Collapsible from './ui/Collapsible';

export default function DnaSidebar({
  title,
  onTitleChange,
  saveState,
  selectedPresetId,
  onSelectPreset,
  onResetPreset,
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
  onRunBatch,
  onCompose,
  batchDisabled,
  composeDisabled,
  batchRunning,
  composing,
}) {
  const [chipName, setChipName] = useState('');

  const presetOptions = STORY_PRESETS.map((p) => ({
    value: p.id,
    label: p.name,
    badge: p.badge,
  }));

  const saveBadge =
    saveState === 'saving'
      ? { text: '保存中…', cls: 'text-amber-300' }
      : saveState === 'error'
      ? { text: '保存失败', cls: 'text-rose-400' }
      : { text: '已自动保存', cls: 'text-emerald-400' };

  const handleSaveChip = () => {
    const clean = chipName.trim();
    if (!clean || !prefix.trim()) return;
    onAddCustomChip(clean, prefix.trim());
    setChipName('');
  };

  return (
    <aside className="rounded-2xl border border-slate-800/90 bg-[#111827]/95 p-4 shadow-xl shadow-black/40 lg:sticky lg:top-[68px] flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <Palette className="w-4 h-4 text-blue-400" />
          <span>全局 DNA 控制</span>
        </div>
        <span className={`text-[11px] font-medium ${saveBadge.cls}`}>{saveBadge.text}</span>
      </div>

      {/* Project Title */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label htmlFor="proj-title" className="text-xs font-semibold text-slate-300">
            项目名称
          </label>
          <span className="text-[11px] text-slate-500">自动写入本地库</span>
        </div>
        <input
          id="proj-title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="如：清晨厨房的猫"
          className="w-full rounded-lg border border-slate-700/80 bg-[#0c121e] px-3 py-2 text-[13px] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
        />
      </div>

      {/* Story Preset */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-300">故事分镜模板</span>
          <span className="text-[11px] text-slate-500">切换将新建草稿</span>
        </div>
        <div className="flex items-center gap-2">
          <SelectDropdown
            className="flex-1 min-w-0"
            value={selectedPresetId}
            onChange={onSelectPreset}
            options={presetOptions}
            placeholder="选择预设故事模板"
          />
          <button
            type="button"
            onClick={onResetPreset}
            title="重置为当前模板初始内容"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 hover:border-slate-600 px-2.5 py-2 text-xs font-medium text-slate-300 transition-colors shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重填</span>
          </button>
        </div>
      </div>

      {/* Style & Character Prefix */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label htmlFor="dna-prefix" className="text-xs font-semibold text-slate-300">
            公共画风 / 主角前缀
          </label>
          <span className="text-[11px] text-slate-500">自动拼到每镜前</span>
        </div>
        <textarea
          id="dna-prefix"
          rows={3}
          value={prefix}
          onChange={(e) => onPrefixChange(e.target.value)}
          placeholder="选择下方风格胶囊，或输入统一画风 + 主角外貌描述…"
          className="w-full rounded-lg border border-slate-700/80 bg-[#0c121e] px-3 py-2 text-[13px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition resize-y leading-relaxed"
        />

        {/* Chips */}
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
              className="inline-flex items-center gap-1 rounded-full border border-cyan-500/35 bg-cyan-500/10 hover:bg-cyan-500/20 pl-2.5 pr-1.5 py-1 text-[11px] font-medium text-cyan-200 transition-colors"
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
                className="rounded-full p-0.5 text-cyan-300/70 hover:text-rose-300 hover:bg-rose-500/20 cursor-pointer"
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
            placeholder="自定义胶囊名称（如：赛博橘猫）"
            className="flex-1 min-w-0 rounded-lg border border-slate-700/80 bg-[#0c121e] px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={handleSaveChip}
            disabled={!chipName.trim() || !prefix.trim()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1.5 text-xs font-medium text-slate-200 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>保存</span>
          </button>
        </div>
      </div>

      {/* Aspect Ratio Segmented Control */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-300">全局画幅</span>
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

      {/* Seed + Toggle */}
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="dna-seed" className="text-xs font-semibold text-slate-300">
            全局种子（Seed）
          </label>
          <span className="text-[11px] text-slate-500">同种子保风格连贯</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="dna-seed"
            type="number"
            value={seed}
            onChange={(e) => onSeedChange(Number(e.target.value) || 0)}
            className="flex-1 min-w-0 rounded-lg border border-slate-700/80 bg-[#0c121e] px-3 py-1.5 text-[13px] tabular-nums text-slate-100 focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={onRandomSeed}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 hover:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 shrink-0 cursor-pointer transition-colors"
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

      {/* Collapsible Negative Prompt */}
      <Collapsible title="全局负提示词 (Negative Prompt)" icon={Ban}>
        <textarea
          rows={3}
          value={negativePrompt}
          onChange={(e) => onNegativeChange(e.target.value)}
          className="w-full rounded-lg border border-slate-800 bg-[#090d14] px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 resize-y leading-relaxed"
        />
      </Collapsible>

      {/* Main Actions */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onRunBatch}
          disabled={batchDisabled}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-45 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/50 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{batchRunning ? '正在批量绘制中…' : '开始批量生成全部分镜'}</span>
        </button>

        <button
          type="button"
          onClick={onCompose}
          disabled={composeDisabled}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-950/40 transition-all cursor-pointer"
        >
          <Film className="w-4 h-4" />
          <span>{composing ? '正在合成运镜成片…' : '一键合成运镜成片'}</span>
        </button>
      </div>
    </aside>
  );
}
