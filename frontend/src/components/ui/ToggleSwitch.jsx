export default function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none group">
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
          {label}
        </div>
        {description ? (
          <div className="text-[11px] text-slate-500">{description}</div>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
          checked
            ? 'bg-blue-600 border-blue-500'
            : 'bg-slate-800 border-slate-700 hover:border-slate-600'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}
