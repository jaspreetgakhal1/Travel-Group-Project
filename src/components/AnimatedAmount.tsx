import React, { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  minimumFractionDigits: 2,
  style: 'currency',
});

type AnimatedAmountProps = {
  className?: string;
  size?: 'compact' | 'default' | 'hero';
  value: number;
};

const AnimatedAmount: React.FC<AnimatedAmountProps> = ({ className, size = 'default', value }) => {
  const prefersReducedMotion = useReducedMotion();
  const previousValueRef = useRef(0);
  const [displayValue, setDisplayValue] = useState(value);
  const wholeNumberLength = Math.trunc(Math.abs(value)).toString().length;
  const hasLargeValue = wholeNumberLength >= 5;
  const sizeClassName =
    size === 'hero'
      ? hasLargeValue
        ? 'text-[clamp(1.7rem,7vw,2.6rem)] sm:text-[clamp(2rem,5vw,3rem)]'
        : 'text-[clamp(2.1rem,7vw,3.3rem)]'
      : size === 'compact'
        ? hasLargeValue
          ? 'text-[clamp(0.95rem,4.2vw,1.1rem)] sm:text-[1.15rem]'
          : 'text-[clamp(1rem,4.5vw,1.25rem)]'
        : hasLargeValue
          ? 'text-[clamp(1.15rem,5vw,1.9rem)]'
          : 'text-[clamp(1.25rem,5.4vw,2.1rem)]';

  useEffect(() => {
    if (prefersReducedMotion) {
      previousValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    const controls = animate(previousValueRef.current, value, {
      duration: 1.05,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplayValue(latest),
    });

    previousValueRef.current = value;

    return () => controls.stop();
  }, [prefersReducedMotion, value]);

  return (
    <span
      className={[
        'block max-w-full whitespace-normal leading-none tabular-nums [font-variant-numeric:tabular-nums] [overflow-wrap:anywhere]',
        sizeClassName,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {currencyFormatter.format(displayValue)}
    </span>
  );
};

export default AnimatedAmount;
