import { Clock, Layers } from 'lucide-react';
import {
  MAX_SHOT_COUNT,
  MAX_TARGET_DURATION,
  MIN_SHOT_COUNT,
  MIN_TARGET_DURATION,
  SHOT_COUNT_OPTIONS,
  TARGET_DURATION_OPTIONS,
} from '../../data/presets';
import SegmentedControl from './SegmentedControl';

function estimateShotsFromDuration(sec) {
  const s = Math.max(MIN_TARGET_DURATION, Math.min(MAX_TARGET_DURATION, Number(sec) || 30));
  let avg = 4;
  if (s <= 24) avg = 4;
  else if (s <= 48) avg = 5;
  else if (s <= 96) avg = 6;
  else if (s <= 180) avg = 8;
  else if (s <= 240) avg = 10;
  else avg = 12;
  const count = Math.max(MIN_SHOT_COUNT, Math.min(MAX_SHOT_COUNT, Math.round(s / avg)));
  const perShot = Math.max(3, Math.min(12, Math.round(s / count)));
  return { count, perShot };
}

export default function StoryScopeControl({
  planMode,
  onPlanModeChange,
  targetDuration,
  onTargetDurationChange,
  shotCount,
  onShotCountChange,
  compact = false,
}) {
  const isDuration = planMode === 'duration';
  const safeDuration = Math.max(
    MIN_TARGET_DURATION,
    Math.min(MAX_TARGET_DURATION, Math.round(Number(targetDuration) || 30))
  );
  const safeShots = Math.max(
    MIN_SHOT_COUNT,
    Math.min(MAX_SHOT_COUNT, Math.round(Number(shotCount) || 6))
  );
  const est = estimateShotsFromDuration(safeDuration);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-300">生成规模</span>
        <SegmentedControl
          size="xs"
          variant="subtle"
          value={planMode}
          onChange={onPlanModeChange}
          options={[
            { value: 'duration', label: '按目标时长', icon: Clock },
            { value: 'shots', label: '按镜头数量', icon: Layers },
          ]}
        />
      </div>

      {isDuration ? (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            {TARGET_DURATION_OPTIONS.map((opt) => {
              const active = safeDuration === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onTargetDurationChange(opt.value)}
                  className={`rounded-lg border py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'border-blue-500/70 bg-blue-600 text-white shadow-sm shadow-blue-950/50'
                      : 'border-slate-800 bg-[#090d14] text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/90 bg-[#090d14]/90 px-2.5 py-1.5">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>自定义</span>
              <input
                type="number"
                min={MIN_TARGET_DURATION}
                max={MAX_TARGET_DURATION}
                value={targetDuration}
                onChange={(e) => {
                  const v = e.target.value;
                  onTargetDurationChange(v === '' ? '' : Number(v));
                }}
                onBlur={() => onTargetDurationChange(safeDuration)}
                className="w-16 rounded-md border border-slate-700/80 bg-[#0c121e] px-2 py-0.5 text-xs tabular-nums text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <span>秒</span>
            </label>
            <span className={`text-[10px] text-slate-500 tabular-nums ${compact ? 'truncate' : ''}`}>
              限 {MIN_TARGET_DURATION}~{MAX_TARGET_DURATION}s · 约 {est.count} 镜
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            {SHOT_COUNT_OPTIONS.map((opt) => {
              const active = safeShots === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onShotCountChange(opt.value)}
                  className={`rounded-lg border py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'border-blue-500/70 bg-blue-600 text-white shadow-sm shadow-blue-950/50'
                      : 'border-slate-800 bg-[#090d14] text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/90 bg-[#090d14]/90 px-2.5 py-1.5">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>自定义</span>
              <input
                type="number"
                min={MIN_SHOT_COUNT}
                max={MAX_SHOT_COUNT}
                value={shotCount}
                onChange={(e) => {
                  const v = e.target.value;
                  onShotCountChange(v === '' ? '' : Number(v));
                }}
                onBlur={() => onShotCountChange(safeShots)}
                className="w-16 rounded-md border border-slate-700/80 bg-[#0c121e] px-2 py-0.5 text-xs tabular-nums text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <span>镜</span>
            </label>
            <span className={`text-[10px] text-slate-500 tabular-nums ${compact ? 'truncate' : ''}`}>
              限 {MIN_SHOT_COUNT}~{MAX_SHOT_COUNT} 镜 · 约 {safeShots * 4}s
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
