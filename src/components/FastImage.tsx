import type { ImgHTMLAttributes } from 'react';
import { useMemo, useState } from 'react';

type FastImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

function FastImage({ src, alt, className, fallbackSrc, loading, decoding, fetchPriority, onError, ...rest }: FastImageProps) {
  const [hasError, setHasError] = useState(false);

  const resolvedSrc = useMemo(() => {
    if (!hasError) {
      return src;
    }

    return fallbackSrc ?? src;
  }, [fallbackSrc, hasError, src]);

  return (
    <img
      {...rest}
      src={resolvedSrc}
      alt={alt}
      className={className}
      loading={loading ?? 'lazy'}
      decoding={decoding ?? 'async'}
      fetchPriority={fetchPriority ?? 'low'}
      referrerPolicy="no-referrer"
      onError={(event) => {
        if (fallbackSrc && !hasError) {
          setHasError(true);
        }

        onError?.(event);
      }}
    />
  );
}

export default FastImage;
