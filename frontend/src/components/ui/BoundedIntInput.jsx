export default function BoundedIntInput({
  value,
  onChange,
  min,
  max,
  fallback,
  className = '',
  ...rest
}) {
  const defaultVal = fallback ?? min;

  const clampValue = (val) => {
    if (val === '' || val === null || val === undefined) return defaultVal;
    const n = Number(val);
    if (!Number.isFinite(n)) return defaultVal;
    return Math.max(min, Math.min(max, Math.round(n)));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onKeyDown={(e) => {
        if (['-', '+', '.', 'e', 'E', ',', ' '].includes(e.key)) {
          e.preventDefault();
        }
      }}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D+/g, '').replace(/^0+/, '');
        if (!digits) {
          onChange('');
          return;
        }
        const n = parseInt(digits, 10);
        onChange(n > max ? max : n);
      }}
      onBlur={() => onChange(clampValue(value))}
      className={className}
      {...rest}
    />
  );
}
