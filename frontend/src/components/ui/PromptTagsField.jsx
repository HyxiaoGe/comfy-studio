import { useState } from 'react';
import { Camera, Check, Copy, Pencil } from 'lucide-react';
import AutoGrowTextarea from './AutoGrowTextarea';

export const CAMERA_FRAMING_RE =
  /^(extreme\s+)?(wide|long|full|medium|mid|close[- ]?up|establishing|overhead|bird'?s[- ]?eye|worm'?s[- ]?eye|low[- ]?angle|high[- ]?angle|dutch[- ]?angle|eye[- ]?level|macro|portrait|top[- ]?down|side)\b/i;

export function splitPromptTags(prompt) {
  return (prompt || '')
    .split(/[,，]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const TONE_CHIP = {
  default: 'border-slate-700/75 bg-slate-900/90 text-slate-200',
  blue: 'border-blue-500/30 bg-blue-500/10 text-blue-100',
  cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100',
  rose: 'border-rose-500/25 bg-rose-500/10 text-rose-200/90',
};

export default function PromptTagsField({
  value,
  onChange,
  label,
  hint,
  placeholder = '点击填写英文描述（用英文逗号分隔词组）…',
  highlightCamera = false,
  tone = 'default',
  compact = false,
  minHeight = 44,
  className = '',
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const tags = splitPromptTags(value);
  const chipCls = TONE_CHIP[tone] || TONE_CHIP.default;

  const handleCopy = async (e) => {
    e.stopPropagation();
    const text = (value || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2 shrink-0">
        {label ? (
          <span className="text-[11px] font-medium text-slate-300 truncate">
            {label}
            {hint ? <span className="text-slate-500 font-normal ml-1">· {hint}</span> : null}
          </span>
        ) : (
          <span className="text-[11px] text-slate-500">
            {tags.length > 0 ? `${tags.length} 个视觉标签` : '点击添加描述'}
          </span>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          {value?.trim() ? (
            <button
              type="button"
              onClick={handleCopy}
              title="复制完整文本"
              className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-[#0c121e] hover:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                  <span className="text-emerald-300">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-2.5 h-2.5" />
                  <span>复制</span>
                </>
              )}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium cursor-pointer transition-colors ${
              editing
                ? 'border-blue-500/50 bg-blue-500/15 text-blue-200'
                : 'border-slate-800 bg-[#0c121e] hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {editing ? (
              <>
                <Check className="w-2.5 h-2.5" />
                <span>完成</span>
              </>
            ) : (
              <>
                <Pencil className="w-2.5 h-2.5" />
                <span>编辑</span>
              </>
            )}
          </button>
        </div>
      </div>

      {editing ? (
        <AutoGrowTextarea
          autoFocus
          minHeight={minHeight}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          placeholder={placeholder}
          className="w-full flex-1 rounded-xl border border-blue-500/60 bg-[#090d14] px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none leading-relaxed"
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setEditing(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setEditing(true);
            }
          }}
          title="点击切换编辑"
          style={{ minHeight: `${minHeight}px` }}
          className={`w-full flex-1 rounded-xl border border-slate-800/90 hover:border-slate-700 bg-[#090d14]/85 ${
            compact ? 'px-2 py-1.5' : 'px-2.5 py-2'
          } cursor-text transition-colors`}
        >
          {tags.length === 0 ? (
            <span className="text-xs text-slate-500">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, idx) => {
                const isCamera = highlightCamera && CAMERA_FRAMING_RE.test(tag);
                return (
                  <span
                    key={`${idx}_${tag.slice(0, 14)}`}
                    className={`inline-flex items-center gap-1 rounded-lg border ${
                      compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-[11.5px]'
                    } leading-snug ${
                      isCamera
                        ? 'border-cyan-500/35 bg-cyan-500/10 text-cyan-200 font-medium'
                        : chipCls
                    }`}
                  >
                    {isCamera ? <Camera className="w-3 h-3 text-cyan-400 shrink-0" /> : null}
                    <span>{tag}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
