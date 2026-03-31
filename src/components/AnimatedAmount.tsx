import React, { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  minimumFractionDigits: 2,
  style: 'currency',
});

type AnimatedAmountProps = {
  className?: string;
  value: number;
};

const AnimatedAmount: React.FC<AnimatedAmountProps> = ({ className, value }) => {
  const prefersReducedMotion = useReducedMotion();
  const previousValueRef = useRef(0);
  const [displayValue, setDisplayValue] = useState(value);

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

  return <span className={className}>{currencyFormatter.format(displayValue)}</span>;
};

export default AnimatedAmount;
