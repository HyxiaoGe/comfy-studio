import {
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  LayoutList,
  Loader2,
  Plus,
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
  onGenerateTtsSingle,
  batchRunning,
  onRunBatch,
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
}) {
  return (
    <main className="max-w-[1560px] mx-auto px-4 lg:px-6 py-5 space-y-4">
      {/* Guided Production Action Bar */}
      <div className="rounded-2xl border border-slate-800/90 bg-[#111827]/95 p-3.5 shadow-lg shadow-black/25 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* ① Batch TTS */}
          <div className="flex items-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-2.5 py-1.5">
            <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
              ① 先配音
            </span>
            <SelectDropdown
              size="sm"
              className="w-[156px]"
              value={ttsVoice}
              onChange={onTtsVoiceChange}
              options={ttsVoices?.length ? ttsVoices : DEFAULT_TTS_VOICES}
            />
            <button
              type="button"
              onClick={onGenerateTtsAll}
              disabled={generatingTts || !ttsConfigured || shots.length === 0}
              title={ttsConfigured ? `使用 ${ttsProvider === 'doubao' ? '豆包' : '百炼'} 合成配音` : '未配置 TTS Key'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/45 bg-cyan-600/25 hover:bg-cyan-600/40 disabled:opacity-45 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold text-cyan-100 transition-colors cursor-pointer"
            >
              {generatingTts ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span>{generatingTts ? '配音中…' : `批量配音 (${ttsCount}/${shots.length})`}</span>
            </button>
          </div>

          {/* ② Batch ComfyUI Render */}
          <div className="flex items-center gap-2 rounded-xl border border-blue-500/25 bg-blue-500/5 px-2.5 py-1.5">
            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-200">
              ② 再出图
            </span>
            <button
              type="button"
              onClick={onRunBatch}
              disabled={mode !== 'storyboard' || batchRunning || shots.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-45 disabled:cursor-not-allowed px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-950/50 transition-colors cursor-pointer"
            >
              {batchRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>
                {batchRunning ? '绘制中…' : `批量生成分镜图 (${readyCount}/${shots.length})`}
              </span>
            </button>
          </div>

          <span className="hidden xl:inline text-xs text-slate-500 pl-1">
            画幅 {aspect.width}×{aspect.height}
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
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#0c121e] hover:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
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
            onClick={onNextStep}
            disabled={readyCount === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-teal-950/40 transition-all cursor-pointer"
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
