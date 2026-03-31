import React, { useState } from 'react';

type FloatingLabelFieldProps = {
  autoFocus?: boolean;
  badge?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  label: string;
  min?: number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  step?: number | string;
  type?: 'number' | 'text';
  value: string;
};

const FloatingLabelField: React.FC<FloatingLabelFieldProps> = ({
  autoFocus = false,
  badge,
  inputMode,
  label,
  min,
  onChange,
  step,
  type = 'text',
  value,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const shouldFloat = isFocused || value.trim().length > 0;

  return (
    <label className="block">
      <div
        className={`relative overflow-hidden rounded-[30px] border border-white/60 bg-white/80 px-4 pb-3 pt-6 shadow-xl shadow-slate-950/10 backdrop-blur-xl transition duration-300 ${
          isFocused
            ? 'border-accent/30 ring-4 ring-accent/15 shadow-[0_18px_45px_-24px_rgba(224,122,95,0.65)]'
            : 'hover:border-primary/10 hover:shadow-2xl hover:shadow-slate-950/10'
        }`}
      >
        <span
          className={`pointer-events-none absolute left-4 transition-all duration-200 ${
            shouldFloat
              ? 'top-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/45'
              : 'top-1/2 -translate-y-1/2 text-sm font-medium text-primary/45'
          }`}
        >
          {label}
        </span>

        {badge ? (
          <span className="absolute right-4 top-3 rounded-full bg-primary/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/50">
            {badge}
          </span>
        ) : null}

        <input
          autoFocus={autoFocus}
          type={type}
          value={value}
          min={min}
          step={step}
          inputMode={inputMode}
          placeholder=" "
          onBlur={() => setIsFocused(false)}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          className={`w-full bg-transparent text-sm font-semibold text-primary outline-none placeholder:text-transparent ${
            shouldFloat ? 'pt-1' : ''
          }`}
        />
      </div>
    </label>
  );
};

export default FloatingLabelField;
