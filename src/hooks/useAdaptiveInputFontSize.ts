import { useMemo } from 'react';

type AdaptiveInputFontSizeOptions = {
  compactThreshold?: number;
  smallestThreshold?: number;
};

const useAdaptiveInputFontSize = (
  value: string,
  { compactThreshold = 7, smallestThreshold = 10 }: AdaptiveInputFontSizeOptions = {},
): string => {
  return useMemo(() => {
    const normalizedLength = value.trim().length;

    if (normalizedLength >= smallestThreshold) {
      return 'text-xl sm:text-2xl';
    }

    if (normalizedLength >= compactThreshold) {
      return 'text-2xl sm:text-[1.7rem]';
    }

    return 'text-3xl sm:text-[2rem]';
  }, [compactThreshold, smallestThreshold, value]);
};

export default useAdaptiveInputFontSize;
