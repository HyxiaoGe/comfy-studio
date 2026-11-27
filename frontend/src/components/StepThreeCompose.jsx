import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Film,
  Image as ImageIcon,
  Loader2,
  MoveLeft,
  MoveRight,
  Music,
  Pause,
  Play,
  Sparkles,
  Square,
  Upload,
  Volume2,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DURATION_OPTIONS, MOTION_OPTIONS, TRANSITION_OPTIONS } from '../data/presets';
import ComposePanel from './ComposePanel';
import PromptTagsField from './ui/PromptTagsField';
import SegmentedControl from './ui/SegmentedControl';
import SelectDropdown from './ui/SelectDropdown';
import ToggleSwitch from './ui/ToggleSwitch';

const MOTION_ICONS = {
  ZoomIn,
  ZoomOut,
  MoveRight,
  MoveLeft,
  Pause,
};

const BGM_MOOD_PRESETS = [
  {
    label: '温暖绘本',
    bpm: 92,
    tags: "Warm acoustic guitar, gentle felt piano, soft glockenspiel bells, cozy healing children's storybook instrumental, no vocals",
  },
  {
    label: '轻快科普',
    bpm: 112,
    tags: 'Bright marimba, light pizzicato strings, upbeat cheerful educational background music, clean modern synth pluck, instrumental, no vocals',
  },
  {
    label: '治愈抒情',
    bpm: 78,
    tags: 'Soft cinematic piano, lush warm string pad, delicate cello, nostalgic emotional film score, instrumental, no vocals',
  },
  {
    label: '星空夜晚',
    bpm: 84,
    tags: 'Dreamy music box, ambient warm pads, soft harp arpeggios, peaceful starry lullaby instrumental, no vocals',
  },
];

export default function StepThreeCompose({
  title,
  shots,
  aspect,
  readyCount,
  ttsCount,
  composeState,
  onCloseCompose,
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
  bgmTags,
  onBgmTagsChange,
  bgmBpm,
  onBgmBpmChange,
  bgmDuration,
  onBgmDurationChange,
  suggestingBgm,
  onSuggestBgmTags,
  generatingBgm,
  onGenerateBgm,
  bgmWorkflowLoaded,
  llmConfigured,
  composing,
  onCompose,
  onChangeMotion,
  onChangeDuration,
  onPrevStep,
}) {
  const audioInputRef = useRef(null);
  const bgmAudioRef = useRef(null);
  const [playingBgm, setPlayingBgm] = useState(false);

  useEffect(() => {
    if (bgmAudioRef.current) {
      bgmAudioRef.current.pause();
      bgmAudioRef.current = null;
      setPlayingBgm(false);
    }
  }, [bgmFilename]);

  useEffect(() => {
    return () => {
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current = null;
      }
    };
  }, []);

  const togglePlayBgm = () => {
    if (!bgmFilename) return;
    if (playingBgm && bgmAudioRef.current) {
      bgmAudioRef.current.pause();
      bgmAudioRef.current.currentTime = 0;
      setPlayingBgm(false);
      return;
    }
    if (bgmAudioRef.current) bgmAudioRef.current.pause();
    const audio = new Audio(`/audio/${encodeURIComponent(bgmFilename)}`);
    bgmAudioRef.current = audio;
    audio.onended = () => setPlayingBgm(false);
    audio.onerror = () => setPlayingBgm(false);
    audio.play().then(() => setPlayingBgm(true)).catch(() => setPlayingBgm(false));
  };

  const bgmOptions = [
    { value: '', label: '无背景音乐', badge: '静音' },
    ...audioFiles.map((f) => ({
      value: f.filename,
      label: f.filename,
      badge: `${Math.max(0.1, f.size / (1024 * 1024)).toFixed(1)} MB`,
    })),
  ];

  const estDuration = shots
    .filter((s) => Boolean(s.filename))
    .reduce((acc, s) => {
      const base = Number(s.duration) || 4;
      const d = autoAlignTts && s.ttsDuration > 0 ? Math.max(base, Math.ceil(s.ttsDuration * 10) / 10) : base;
      return acc + d;
    }, 0);

  return (
    <main className="max-w-[1480px] mx-auto px-4 lg:px-6 py-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_370px] gap-5 items-start">
      {/* Left: Video Stage & Shot Timeline */}
      <section className="space-y-4 min-w-0">
        {composeState.visible ? (
          <ComposePanel state={composeState} title={title} onClose={onCloseCompose} />
        ) : (
          <div className="rounded-2xl border border-slate-800/90 bg-[#111827]/95 p-6 text-center space-y-3 shadow-xl shadow-black/30">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <Film className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">准备合成最终短片</h2>
              <p className="text-xs text-slate-400 mt-1">
                当前共有 {readyCount}/{shots.length} 镜已出图，{ttsCount}/{shots.length} 条旁白已配音，预计成片约{' '}
                {estDuration.toFixed(1)}s（{aspect.width}×{aspect.height}）。确认右侧后期参数后点击「一键合成成片」。
              </p>
            </div>
          </div>
        )}

        {/* Shot Motion & Duration Timeline */}
        <div className="rounded-2xl border border-slate-800/90 bg-[#111827]/95 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-slate-100">分镜时间轴与运镜微调</h3>
              <p className="text-[11px] text-slate-400">
                可在此微调每镜 Ken Burns 推拉/平移方式及基础时长
              </p>
            </div>
            <span className="text-xs text-slate-400 tabular-nums">
              已就绪 {readyCount}/{shots.length} 镜
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {shots.map((shot, idx) => (
              <div
                key={shot.uid}
                className="rounded-xl border border-slate-800 bg-[#0c121e] p-2.5 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-20 aspect-video rounded-lg bg-[#090d14] border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                    {shot.filename ? (
                      <img
                        src={`/results/${encodeURIComponent(shot.filename)}?v=${shot.imgVer || 1}`}
                        alt={`#${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono font-bold text-blue-300">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                      {shot.ttsFilename ? (
                        <span className="inline-flex items-center gap-1 rounded bg-cyan-500/15 border border-cyan-500/30 px-1.5 py-0.2 text-[10px] text-cyan-200 tabular-nums">
                          <Volume2 className="w-2.5 h-2.5" />
                          {shot.ttsDuration}s
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-snug">
                      {shot.narration?.trim() || shot.prompt || '未填写描述'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80">
                  <SelectDropdown
                    size="sm"
                    className="flex-1 min-w-0"
                    value={shot.motion}
                    onChange={(val) => onChangeMotion(shot.uid, val)}
                    options={MOTION_OPTIONS}
                    renderIcon={(opt) => {
                      const IconComp = MOTION_ICONS[opt.icon];
                      return IconComp ? <IconComp className="w-3 h-3 text-cyan-400 shrink-0" /> : null;
                    }}
                  />
                  <SegmentedControl
                    size="xs"
                    variant="subtle"
                    value={shot.duration}
                    onChange={(val) => onChangeDuration(shot.uid, val)}
                    options={DURATION_OPTIONS}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Right: Post-production Settings & Export */}
      <aside className="rounded-2xl border border-slate-800/90 bg-[#111827]/95 p-4 space-y-4 shadow-xl shadow-black/30 lg:sticky lg:top-[128px]">
        <h3 className="text-sm font-bold text-slate-100">后期参数与成片导出</h3>

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
            <div className="text-[11px] font-medium text-slate-400 mb-1.5">镜头转场效果</div>
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
                <button
                  type="button"
                  onClick={togglePlayBgm}
                  title={playingBgm ? '停止试听 BGM' : '试听当前 BGM'}
                  className="inline-flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-500/15 hover:bg-cyan-500/30 px-2 py-1 text-[11px] font-medium text-cyan-200 cursor-pointer shrink-0"
                >
                  {playingBgm ? (
                    <Square className="w-2.5 h-2.5 fill-current" />
                  ) : (
                    <Play className="w-2.5 h-2.5 fill-current" />
                  )}
                  <span>试听</span>
                </button>
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

            {/* AI BGM Generator (ACE-Step 1.5) */}
            <div className="mt-3 rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-200">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AI 生成配乐 (ACE-Step 1.5)</span>
                </span>
                <button
                  type="button"
                  onClick={onSuggestBgmTags}
                  disabled={suggestingBgm || !llmConfigured}
                  title="由 DeepSeek 根据当前故事自动匹配英文配乐描述"
                  className="inline-flex items-center gap-1 rounded-md border border-indigo-500/35 bg-indigo-500/15 hover:bg-indigo-500/30 disabled:opacity-45 px-2 py-0.5 text-[10px] font-medium text-indigo-200 cursor-pointer transition-colors"
                >
                  {suggestingBgm ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3" />
                  )}
                  <span>AI 匹配风格</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1">
                {BGM_MOOD_PRESETS.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => {
                      onBgmTagsChange(m.tags);
                      onBgmBpmChange(m.bpm);
                    }}
                    className="rounded-full border border-slate-700/80 bg-slate-900/80 hover:border-cyan-400/60 hover:text-cyan-200 px-2 py-0.5 text-[10px] text-slate-400 cursor-pointer transition-colors"
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <PromptTagsField
                value={bgmTags}
                onChange={onBgmTagsChange}
                placeholder="点击填写英文音乐风格标签（如 Warm acoustic guitar, gentle piano）"
                tone="cyan"
                compact
                minHeight={42}
              />

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>时长(s)</span>
                  <input
                    type="number"
                    min={8}
                    max={120}
                    value={bgmDuration}
                    onChange={(e) => onBgmDurationChange(Number(e.target.value) || 24)}
                    className="w-12 rounded-md border border-slate-700/80 bg-[#090d14] px-1.5 py-1 text-[11px] tabular-nums text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </label>
                <label className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>BPM</span>
                  <input
                    type="number"
                    min={40}
                    max={200}
                    value={bgmBpm}
                    onChange={(e) => onBgmBpmChange(Number(e.target.value) || 96)}
                    className="w-12 rounded-md border border-slate-700/80 bg-[#090d14] px-1.5 py-1 text-[11px] tabular-nums text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </label>
                <button
                  type="button"
                  onClick={onGenerateBgm}
                  disabled={generatingBgm || !bgmTags.trim() || !bgmWorkflowLoaded}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/45 bg-cyan-600/25 hover:bg-cyan-600/40 disabled:opacity-45 disabled:cursor-not-allowed px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition-colors cursor-pointer"
                >
                  {generatingBgm ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>生成中…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>生成配乐</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onCompose}
            disabled={readyCount === 0 || composing}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-950/40 transition-all cursor-pointer"
          >
            {composing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
            <span>{composing ? '正在合成运镜成片…' : `一键合成 MP4 (${readyCount}/${shots.length})`}</span>
          </button>

          {composeState.videoUrl ? (
            <a
              href={composeState.videoUrl}
              download={
                title
                  ? `${title.replace(/[\\/:*?"<>|]/g, '_')}.mp4`
                  : composeState.filename || 'storyboard.mp4'
              }
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/15 hover:bg-blue-500/25 px-4 py-2 text-xs font-semibold text-blue-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载最新成片 MP4</span>
            </a>
          ) : null}

          <button
            type="button"
            onClick={onPrevStep}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回 Step 2 修改图片 / 配音</span>
          </button>
        </div>
      </aside>
    </main>
  );
}
