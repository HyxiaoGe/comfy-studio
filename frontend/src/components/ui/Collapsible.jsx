import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Collapsible({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0c121e] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/40 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          {Icon ? <Icon className="w-3.5 h-3.5 text-slate-400" /> : null}
          <span>{title}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-150 ${
            open ? 'rotate-180 text-slate-300' : ''
          }`}
        />
      </button>
      {open ? <div className="px-3 pb-3 pt-1 border-t border-slate-800/70">{children}</div> : null}
    </div>
  );
}
