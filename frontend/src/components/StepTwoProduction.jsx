import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LayoutGrid,
  LayoutList,
  Loader2,
  Mic,
  Plus,
  RefreshCw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { DEFAULT_TTS_VOICES } from '../data/presets';
import SegmentedControl from './ui/SegmentedControl';
import SelectDropdown from './ui/SelectDropdown';
import ShotCard from './ShotCard';

export default function StepTwoProduction({
  shots,
  aspect,
  mode,
  viewMode,
  onViewModeChange,
  ttsVoice,
  onTtsVoiceChange,
  ttsVoices,
  ttsConfigured,
  ttsProvider,
  generatingTts,
  ttsBusyUid,
  onGenerateTtsAll,
  onGenerateTtsMissing,
  onGenerateTtsSingle,
  batchRunning,
  gpuProgress,
  onProduceMissing,
  onProduceAll,
  readyCount,
  ttsCount,
  onAddShot,
  onChangePrompt,
  onChangeNarration,
  onChangeMotion,
  onChangeDuration,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onReroll,
  onUploadImage,
  onPreview,
  onPrevStep,
  onNextStep,
  onBlockedNextStep,
}) {
  const [highlightPrimary, setHighlightPrimary] = useState(false);
  const highlightTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const promptShots = shots.filter((s) => (s.prompt || '').trim().length > 0);
  const narrShots = shots.filter((s) => (s.narration || '').trim().length > 0);
  const missingTtsCount = narrShots.filter((s) => !s.ttsFilename).length;
  const missingImageCount = promptShots.filter((s) => !s.filename).length;
  const allReady = shots.length > 0 && missingImageCount === 0 && (missingTtsCount === 0 || !ttsConfigured);
  const isProducing = generatingTts || batchRunning;
  const nextBlocked = readyCount === 0;
  const providerLabel = ttsProvider === 'doubao' ? '豆包' : '百炼';

  const primaryDisabled =
    mode !== 'storyboard' || isProducing || (promptShots.length === 0 && narrShots.length === 0);

  let primaryLabel = narrShots.length > 0 && ttsConfigured ? '一键生成配音与分镜图' : '批量生成分镜图';
  let primaryTitle = ttsConfigured
    ? `自动使用${providerLabel}补全缺失配音，并生成分镜图`
    : '未配置 TTS Key，将直接生成分镜图';
  let primaryHandler = onProduceMissing;

  if (generatingTts) {
    primaryLabel = '正在合成配音…';
  } else if (batchRunning) {
    primaryLabel = `${gpuProgress?.text || '正在绘制分镜图'} (${readyCount}/${shots.length})`;
  } else if (missingImageCount > 0 && readyCount > 0) {
    primaryLabel =
      missingTtsCount > 0 && ttsConfigured
        ? `补全配音与缺图 (${missingImageCount} 镜)`
        : `一键补全缺图 (${missingImageCount} 镜)`;
    primaryTitle = '仅生成缺失配音与尚未出图的镜头，不重画已有图片';
    primaryHandler = onProduceMissing;
  } else if (missingImageCount === 0 && promptShots.length > 0 && missingTtsCount > 0 && ttsConfigured) {
    primaryLabel = `一键补全缺失配音 (${missingTtsCount} 条)`;
    primaryTitle = `分镜图已全部就绪，补全剩余 ${missingTtsCount} 条旁白配音`;
    primaryHandler = onGenerateTtsMissing;
  }

  const handleNextClick = () => {
    if (!nextBlocked) {
      onNextStep();
      return;
    }
    const msg = isProducing
      ? '正在生成配音与分镜图，请等待至少 1 镜完成后再进入下一步'
      : `请先点击左侧「${primaryLabel}」，至少生成 1 镜后再进入下一步`;
    onBlockedNextStep?.(msg);
    setHighlightPrimary(true);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightPrimary(false), 2400);
  };

  return (
    <main className="max-w-[1560px] mx-auto px-4 lg:px-6 py-5 space-y-4">
      {/* Sticky Unified Production Action Bar */}
      <div className="sticky top-[64px] z-30 rounded-2xl border border-slate-800/90 bg-[#111827]/95 backdrop-blur-md p-3.5 shadow-lg shadow-black/30 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Voice selector + Unified Produce CTA */}
          <div
            className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 flex-wrap transition-all ${
              highlightPrimary
                ? 'border-amber-400/90 bg-amber-500/15 ring-2 ring-amber-400/70'
                : 'border-blue-500/25 bg-blue-500/5'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <SelectDropdown
                size="sm"
                className="w-[152px]"
                value={ttsVoice}
                onChange={onTtsVoiceChange}
                options={ttsVoices?.length ? ttsVoices : DEFAULT_TTS_VOICES}
              />
            </div>

            {allReady && !isProducing ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>配音与分镜图已就绪</span>
                </span>
                <button
                  type="button"
                  onClick={onProduceAll}
                  disabled={primaryDisabled}
                  title="重新按当前画风与音色全量重绘所有分镜图"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 disabled:opacity-45 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                  <span>全量重绘</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={primaryHandler}
                disabled={primaryDisabled}
                title={primaryTitle}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-45 disabled:cursor-not-allowed px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-950/50 transition-all cursor-pointer"
              >
                {isProducing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{primaryLabel}</span>
              </button>
            )}

            {/* Standalone Voice Re-dub (handy when swapping voice without redrawing images) */}
            <button
              type="button"
              onClick={onGenerateTtsAll}
              disabled={isProducing || !ttsConfigured || narrShots.length === 0}
              title={
                ttsConfigured
                  ? `仅使用 ${providerLabel} (${ttsVoice}) 重新合成全部旁白配音，不重绘图片`
                  : '未配置 TTS Key'
              }
              className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1.5 text-xs font-medium text-cyan-200 transition-colors cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{ttsCount > 0 ? '重配全部语音' : '仅配音'}</span>
            </button>

            {readyCount > 0 && missingImageCount > 0 && !isProducing ? (
              <button
                type="button"
                onClick={onProduceAll}
                disabled={primaryDisabled}
                title="按当前画风与提示词重绘全部镜头"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 disabled:opacity-40 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-slate-400" />
                <span>全量重绘</span>
              </button>
            ) : null}
          </div>

          <span className="hidden xl:inline-flex items-center gap-2 text-xs text-slate-400 tabular-nums pl-1">
            <span>
              配音 <strong className="text-cyan-300 font-semibold">{ttsCount}</strong>/
              {narrShots.length || shots.length}
            </span>
            <span className="text-slate-700">·</span>
            <span>
              出图 <strong className="text-blue-300 font-semibold">{readyCount}</strong>/
              {shots.length}
            </span>
            <span className="text-slate-700">·</span>
            <span className="text-slate-500">
              {aspect.width}×{aspect.height}
            </span>
          </span>
        </div>

        {/* Right: View toggle + Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <SegmentedControl
            size="xs"
            variant="subtle"
            value={viewMode}
            onChange={onViewModeChange}
            options={[
              { value: 'list', label: '精编', icon: LayoutList, title: '精编详情视图' },
              { value: 'grid', label: '故事板', icon: LayoutGrid, title: '故事板网格视图' },
            ]}
          />

          <button
            type="button"
            onClick={onAddShot}
            disabled={isProducing}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 disabled:opacity-40 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>加镜</span>
          </button>

          <button
            type="button"
            onClick={onPrevStep}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>改剧本</span>
          </button>

          <button
            type="button"
            onClick={handleNextClick}
            aria-disabled={nextBlocked}
            title={
              nextBlocked
                ? isProducing
                  ? '正在生成分镜图，请等待至少 1 镜就绪'
                  : `请先点击左侧「${primaryLabel}」`
                : '进入 Step 3：运镜与成片合成'
            }
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              nextBlocked
                ? 'border border-slate-700/80 bg-[#0c121e]/80 text-slate-400 hover:border-amber-500/45 hover:text-amber-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white shadow-md shadow-teal-950/40 cursor-pointer'
            }`}
          >
            <span>下一步：运镜与成片</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Full-Width Storyboard Workspace */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'flex flex-col gap-3'
        }
      >
        {shots.map((shot, idx) => (
          <ShotCard
            key={shot.uid}
            shot={shot}
            index={idx}
            total={shots.length}
            aspect={aspect}
            mode={mode}
            viewMode={viewMode}
            batchRunning={batchRunning}
            ttsBusy={generatingTts || ttsBusyUid === shot.uid}
            onChangePrompt={(val) => onChangePrompt(shot.uid, val)}
            onChangeNarration={(val) => onChangeNarration(shot.uid, val)}
            onChangeMotion={(val) => onChangeMotion(shot.uid, val)}
            onChangeDuration={(val) => onChangeDuration(shot.uid, val)}
            onMoveUp={() => onMoveUp(idx)}
            onMoveDown={() => onMoveDown(idx)}
            onDuplicate={() => onDuplicate(idx, shot)}
            onDelete={() => onDelete(shot.uid)}
            onReroll={() => onReroll(shot.uid)}
            onGenerateTts={() => onGenerateTtsSingle(shot.uid)}
            onUploadImage={(file) => onUploadImage(shot.uid, file)}
            onPreview={onPreview}
          />
        ))}
      </div>
    </main>
  );
}
