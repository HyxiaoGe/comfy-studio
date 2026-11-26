import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Lightbox({ src, onClose }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[90] bg-black/88 backdrop-blur-xs flex items-center justify-center p-6 cursor-zoom-out"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 rounded-full bg-slate-900/80 border border-slate-700 p-2 text-slate-300 hover:text-white cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt="分镜大图预览"
        onClick={(e) => e.stopPropagation()}
        className="max-w-[94vw] max-h-[90vh] rounded-xl border border-slate-700/80 shadow-2xl cursor-default"
      />
    </div>
  );
}
