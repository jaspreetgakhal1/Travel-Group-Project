import React, { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type LiquidSplitMeterProps = {
  fillRatio: number;
  helperText?: string;
  isWarning?: boolean;
  label: string;
  valueLabel: string;
};

const clamp = (value: number) => Math.min(0.96, Math.max(0, value));

const LiquidSplitMeter: React.FC<LiquidSplitMeterProps> = ({
  fillRatio,
  helperText = 'Tracks how much of the trip budget has been used so far.',
  isWarning = false,
  label,
  valueLabel,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const clipPathId = useId();
  const gradientId = useId();
  const normalizedFill = clamp(fillRatio);
  const liquidY = 12 + (1 - normalizedFill) * 192;
  const gradientStart = isWarning ? 'rgba(224,122,95,0.96)' : 'rgba(129,178,154,0.95)';
  const gradientEnd = isWarning ? 'rgba(248,196,183,0.88)' : 'rgba(244,241,222,0.88)';
  const secondaryWaveColor = isWarning ? 'rgba(122,45,35,0.14)' : 'rgba(61,64,91,0.12)';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex h-[216px] w-[138px] items-center justify-center overflow-hidden rounded-[44px] border border-white/55 bg-white/18 shadow-[0_32px_70px_-42px_rgba(27,39,58,0.8)] backdrop-blur-2xl">
        <div className="absolute inset-[8px] rounded-[38px] bg-white/14" />
        <svg viewBox="0 0 138 216" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
          <defs>
            <clipPath id={clipPathId}>
              <rect x="24" y="12" width="90" height="192" rx="40" />
            </clipPath>
            <linearGradient id={gradientId} x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={gradientStart} />
              <stop offset="100%" stopColor={gradientEnd} />
            </linearGradient>
          </defs>

          <rect x="24" y="12" width="90" height="192" rx="40" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.42)" />

          <g clipPath={`url(#${clipPathId})`}>
            <motion.g
              initial={false}
              animate={{ y: liquidY }}
              transition={{
                damping: 22,
                stiffness: 120,
                type: 'spring',
              }}
            >
              <rect x="24" y="0" width="90" height="192" fill={`url(#${gradientId})`} />
              <motion.path
                d="M12 32 C28 18 46 18 62 32 C78 46 96 46 114 32 V0 H12 Z"
                fill="rgba(255,255,255,0.34)"
                animate={prefersReducedMotion ? undefined : { x: [-8, 8, -8] }}
                transition={{ duration: 5.5, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY }}
              />
              <motion.path
                d="M6 40 C22 26 40 26 56 40 C74 54 92 54 120 34 V8 H6 Z"
                fill={secondaryWaveColor}
                animate={prefersReducedMotion ? undefined : { x: [10, -10, 10] }}
                transition={{ duration: 7.5, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY }}
              />
            </motion.g>
          </g>
        </svg>

        <div className="relative z-10 flex flex-col items-center gap-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary/45">Liquid Split</p>
          <p className="text-xs font-medium text-primary/55">{label}</p>
          <p className="text-sm font-bold text-primary">{valueLabel}</p>
        </div>
      </div>
      <p className="max-w-[140px] text-center text-[11px] font-medium leading-5 text-primary/50">
        {helperText}
      </p>
    </div>
  );
};

export default LiquidSplitMeter;
