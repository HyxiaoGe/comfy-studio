import { useEffect, useRef } from 'react';

export default function AutoGrowTextarea({
  value,
  onChange,
  minHeight = 44,
  autoFocus = false,
  className = '',
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
  }, [value, minHeight]);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      const len = ref.current.value.length;
      ref.current.setSelectionRange(len, len);
    }
  }, [autoFocus]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={onChange}
      style={{ minHeight: `${minHeight}px` }}
      className={`overflow-hidden resize-none ${className}`}
      {...rest}
    />
  );
}
