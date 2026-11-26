import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export default function SelectDropdown({
  value,
  onChange,
  options,
  placeholder = '请选择',
  renderIcon,
  align = 'left',
  size = 'md',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const padCls = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-[13px]';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border bg-[#0c121e] text-slate-200 transition-colors cursor-pointer ${padCls} ${
          open
            ? 'border-blue-500/80 ring-2 ring-blue-500/20'
            : 'border-slate-700/80 hover:border-slate-500/80'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {renderIcon && selected ? renderIcon(selected) : null}
          <span className="truncate font-medium">
            {selected ? selected.label : placeholder}
          </span>
          {selected?.badge ? (
            <span className="text-[11px] text-slate-400 shrink-0">{selected.badge}</span>
          ) : null}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180 text-blue-400' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1.5 min-w-full w-max max-w-[290px] rounded-xl border border-slate-700/90 bg-[#111827]/95 backdrop-blur-md shadow-2xl shadow-black/60 p-1 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-500/15 text-blue-200'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {renderIcon ? renderIcon(opt) : null}
                    <span className="truncate font-medium">{opt.label}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {opt.badge || opt.sub ? (
                      <span className="text-[11px] text-slate-400">{opt.badge || opt.sub}</span>
                    ) : null}
                    {active ? <Check className="w-3.5 h-3.5 text-blue-400" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
