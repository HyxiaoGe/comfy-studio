export default function SegmentedControl({
  value,
  onChange,
  options,
  size = 'md',
  variant = 'primary',
  fullWidth = false,
  className = '',
}) {
  const padCls =
    size === 'xs'
      ? 'px-2 py-1 text-[11px]'
      : size === 'sm'
      ? 'px-2.5 py-1.5 text-xs'
      : 'px-3.5 py-1.5 text-[13px]';

  const activeCls =
    variant === 'subtle'
      ? 'bg-slate-700/90 text-white shadow-sm'
      : 'bg-blue-600 text-white shadow-sm shadow-blue-950/50';

  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-[#0a0f18] p-1 ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="tab"
            aria-selected={active}
            title={opt.title || opt.hint || opt.label}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all cursor-pointer ${padCls} ${
              fullWidth ? 'flex-1' : ''
            } ${
              active
                ? activeCls
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {Icon ? <Icon className="w-3.5 h-3.5 shrink-0" /> : null}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
