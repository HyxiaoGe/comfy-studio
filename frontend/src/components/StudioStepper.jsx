import { ArrowLeft, Check, ChevronRight, Clapperboard, FileText, Image as ImageIcon } from 'lucide-react';

export default function StudioStepper({
  activeStep,
  onStepChange,
  onGoHome,
  shotCount,
  readyCount,
  ttsCount,
  hasVideo,
}) {
  const steps = [
    {
      id: 1,
      code: 'STEP 1',
      title: '创意与剧本',
      sub: `${shotCount} 镜脚本与画风`,
      icon: FileText,
      done: shotCount > 0,
    },
    {
      id: 2,
      code: 'STEP 2',
      title: '配音与生图',
      sub: `配音 ${ttsCount}/${shotCount} · 出图 ${readyCount}/${shotCount}`,
      icon: ImageIcon,
      done: shotCount > 0 && readyCount === shotCount,
    },
    {
      id: 3,
      code: 'STEP 3',
      title: '运镜与成片',
      sub: hasVideo ? '成片已就绪' : '转场 · 配乐 · 导出',
      icon: Clapperboard,
      done: hasVideo,
    },
  ];

  return (
    <div className="border-b border-slate-800/80 bg-[#0b101b]/95 backdrop-blur-md">
      <div className="max-w-[1560px] mx-auto px-4 lg:px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={onGoHome}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#111827] hover:bg-slate-800 hover:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
          <span>返回首页</span>
        </button>

        <nav
          aria-label="创作步骤"
          className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-center overflow-x-auto py-0.5"
        >
          {steps.map((step, idx) => {
            const active = activeStep === step.id;
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onStepChange(step.id)}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-1.5 text-left transition-all cursor-pointer ${
                    active
                      ? 'border-blue-500/70 bg-blue-500/15 shadow-sm shadow-blue-950/50'
                      : 'border-slate-800/90 bg-[#111827]/70 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      active
                        ? 'bg-blue-500 text-white'
                        : step.done
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {step.done && !active ? <Check className="w-3.5 h-3.5" /> : step.id}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon
                        className={`w-3 h-3 shrink-0 ${
                          active ? 'text-blue-400' : 'text-slate-400'
                        }`}
                      />
                      <span
                        className={`text-xs font-semibold whitespace-nowrap ${
                          active ? 'text-white' : 'text-slate-200'
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                    <div className="hidden sm:block text-[10px] text-slate-400 whitespace-nowrap tabular-nums">
                      {step.sub}
                    </div>
                  </div>
                </button>
                {idx < steps.length - 1 ? (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0 hidden md:block" />
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
          <span>支持任意步骤间自由切换</span>
        </div>
      </div>
    </div>
  );
}
