import { useRef, useState } from 'react';
import {
  AudioLines,
  Ban,
  BookmarkPlus,
  Dices,
  Film,
  Loader2,
  Music,
  Palette,
  RotateCcw,
  Sparkles,
  Upload,
  Volume2,
  Wand2,
  X,
} from 'lucide-react';
import {
  ASPECT_RATIOS,
  DEFAULT_TTS_VOICES,
  NARRATION_STYLES,
  STORY_PRESETS,
  STYLE_CHIPS,
  TRANSITION_OPTIONS,
} from '../data/presets';
import SelectDropdown from './ui/SelectDropdown';
import SegmentedControl from './ui/SegmentedControl';
import ToggleSwitch from './ui/ToggleSwitch';
import Collapsible from './ui/Collapsible';

export default function DnaSidebar({
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
  narrationStyle,
  onNarrationStyleChange,
  generatingNarration,
  llmConfigured,
  onGenerateNarration,
  ttsVoice,
  onTtsVoiceChange,
  ttsVoices,
  ttsConfigured,
  ttsProvider,
  generatingTts,
  onGenerateTtsAll,
  transitionType,
  onTransitionTypeChange,
  burnSubtitles,
  onBurnSubtitlesChange,
  autoAlignTts,
  onAutoAlignTtsChange,
  audioFiles,
  bgmFilename,
  onBgmFilenameChange,
  bgmVolume,
  onBgmVolumeChange,
  onUploadAudio,
  onRunBatch,
  onCompose,
  batchDisabled,
  composeDisabled,
  batchRunning,
  composing,
  shotCount,
  readyCount,
}) {
  const [activeTab, setActiveTab] = useState('visual'); // visual | audio
  const [chipName, setChipName] = useState('');
  const audioInputRef = useRef(null);

  const presetOptions = STORY_PRESETS.map((p) => ({
    value: p.id,
    label: p.name,
    badge: p.badge,
  }));

  const bgmOptions = [
    { value: '', label: '无背景音乐', badge: '静音' },
    ...audioFiles.map((f) => ({
      value: f.filename,
      label: f.filename,
      badge: `${Math.max(0.1, f.size / (1024 * 1024)).toFixed(1)} MB`,
    })),
  ];

  const handleSaveChip = () => {
    const clean = chipName.trim();
    if (!clean || !prefix.trim()) return;
    onAddCustomChip(clean, prefix.trim());
    setChipName('');
  };

  return (
    <aside className="rounded-2xl border border-slate-800/90 bg-[#111827]/95 shadow-xl shadow-black/40 lg:sticky lg:top-[72px] lg:h-[calc(100vh-88px)] flex flex-col overflow-hidden">
      {/* Sidebar Tabs Header */}
      <div className="p-3 border-b border-slate-800/80 bg-[#0d131f]/70 shrink-0">
        <SegmentedControl
          fullWidth
          size="sm"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'visual', label: '画面设定', icon: Palette },
            { value: 'audio', label: '旁白与成片', icon: AudioLines },
          ]}
        />
      </div>

      {/* Scrollable Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'visual' ? (
          <>
            {/* Story Preset */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-300">故事分镜模板</span>
                <span className="text-[11px] text-slate-500">切换新建草稿</span>
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

            {/* Common Style & Character Prefix */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label htmlFor="dna-prefix" className="text-xs font-semibold text-slate-300">
                  公共画风 / 主角设定
                </label>
                <span className="text-[11px] text-slate-500">自动拼到每镜前</span>
              </div>
              <textarea
                id="dna-prefix"
                rows={3}
                value={prefix}
                onChange={(e) => onPrefixChange(e.target.value)}
                placeholder="选择下方风格胶囊，或输入统一画风 + 主角外貌描述…"
                className="w-full rounded-xl border border-slate-700/80 bg-[#0c121e] px-3 py-2 text-[13px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition resize-y leading-relaxed"
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

            {/* Aspect Ratio */}
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

            {/* Seed */}
            <div className="space-y-2">
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
          </>
        ) : (
          <>
            {/* DeepSeek Narration Card */}
            <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-200">
                  <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>DeepSeek 中文旁白</span>
                </span>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                    llmConfigured
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  }`}
                >
                  {llmConfigured ? '已就绪' : '未配 Key'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <SelectDropdown
                  size="sm"
                  className="w-[122px] shrink-0"
                  value={narrationStyle}
                  onChange={onNarrationStyleChange}
                  options={NARRATION_STYLES}
                />
                <button
                  type="button"
                  onClick={onGenerateNarration}
                  disabled={generatingNarration}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-600/25 hover:bg-indigo-600/40 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-indigo-100 transition-colors cursor-pointer"
                >
                  {generatingNarration ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  <span>{generatingNarration ? '生成中…' : '一键生成旁白'}</span>
                </button>
              </div>
            </div>

            {/* TTS Voiceover Card */}
            <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-200">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AI 语音配音 ({ttsProvider === 'doubao' ? '豆包' : '百炼'})</span>
                </span>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                    ttsConfigured
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  }`}
                >
                  {ttsConfigured ? '已就绪' : '未配 Key'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <SelectDropdown
                  size="sm"
                  className="w-[144px] shrink-0"
                  value={ttsVoice}
                  onChange={onTtsVoiceChange}
                  options={ttsVoices?.length ? ttsVoices : DEFAULT_TTS_VOICES}
                />
                <button
                  type="button"
                  onClick={onGenerateTtsAll}
                  disabled={generatingTts}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-600/20 hover:bg-cyan-600/35 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition-colors cursor-pointer"
                >
                  {generatingTts ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  <span>{generatingTts ? '配音中…' : '批量生成配音'}</span>
                </button>
              </div>
            </div>

            {/* Subtitle & Transition & BGM */}
            <div className="rounded-xl border border-slate-800 bg-[#0c121e] p-3.5 space-y-3.5">
              <ToggleSwitch
                checked={burnSubtitles}
                onChange={onBurnSubtitlesChange}
                label="烧录底部中文字幕"
                description="自动同步每镜旁白文字"
              />

              <ToggleSwitch
                checked={autoAlignTts}
                onChange={onAutoAlignTtsChange}
                label="按配音时长自动对齐镜长"
                description="语音较长时自动延长画面秒数"
              />

              <div>
                <div className="text-[11px] font-medium text-slate-400 mb-1.5">转场效果</div>
                <SelectDropdown
                  size="sm"
                  value={transitionType}
                  onChange={onTransitionTypeChange}
                  options={TRANSITION_OPTIONS}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <Music className="w-3 h-3 text-cyan-400" />
                    <span>背景音乐 (BGM)</span>
                  </span>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept=".mp3,.wav,.m4a,.ogg,.flac"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadAudio(file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>上传音频</span>
                  </button>
                </div>
                <SelectDropdown
                  size="sm"
                  value={bgmFilename}
                  onChange={onBgmFilenameChange}
                  options={bgmOptions}
                />
                {bgmFilename ? (
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 shrink-0">音量</span>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      value={Math.round(bgmVolume * 100)}
                      onChange={(e) => onBgmVolumeChange(Number(e.target.value) / 100)}
                      className="flex-1 accent-cyan-400 cursor-pointer"
                    />
                    <span className="text-[11px] tabular-nums text-slate-300 w-8 text-right">
                      {Math.round(bgmVolume * 100)}%
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sticky Bottom Action Dock */}
      <div className="p-3.5 border-t border-slate-800/90 bg-[#0d131f]/95 space-y-2 shrink-0">
        <button
          type="button"
          onClick={onRunBatch}
          disabled={batchDisabled}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-45 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/50 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{batchRunning ? '正在批量绘制分镜…' : `批量生成分镜 (${shotCount})`}</span>
        </button>

        <button
          type="button"
          onClick={onCompose}
          disabled={composeDisabled}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-950/40 transition-all cursor-pointer"
        >
          <Film className="w-4 h-4" />
          <span>{composing ? '正在合成运镜成片…' : `一键合成成片 (${readyCount}/${shotCount})`}</span>
        </button>
      </div>
    </aside>
  );
}
