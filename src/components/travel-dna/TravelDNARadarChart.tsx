import { useEffect, useMemo, useRef, useState } from 'react';
import { TRAVEL_DNA_DIMENSIONS, defaultUserDNA, type TravelDNA } from '../../models/dnaModel';

const LEVELS = [2, 4, 6, 8, 10];

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

const toDNAArray = (dna?: TravelDNA | null): number[] => {
  const safeDNA = dna ?? defaultUserDNA;
  return TRAVEL_DNA_DIMENSIONS.map(({ key }) => safeDNA[key]);
};

const toPoint = (angle: number, radius: number, center: number) => ({
  x: center + Math.cos(angle) * radius,
  y: center + Math.sin(angle) * radius,
});

const toPolygon = (values: number[], center: number, maxRadius: number): string => {
  const dimensionCount = TRAVEL_DNA_DIMENSIONS.length;
  return values
    .map((rawValue, index) => {
      const value = Math.max(1, Math.min(10, rawValue));
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / dimensionCount;
      const radius = (value / 10) * maxRadius;
      const point = toPoint(angle, radius, center);
      return `${point.x},${point.y}`;
    })
    .join(' ');
};

const useAnimatedDNAValues = (target: number[], durationMs = 520): number[] => {
  const [animated, setAnimated] = useState<number[]>(target);
  const previousValuesRef = useRef<number[]>(target);

  useEffect(() => {
    const fromValues = previousValuesRef.current;
    const toValues = target;

    let frameId = 0;
    let start = 0;

    const tick = (timestamp: number) => {
      if (!start) {
        start = timestamp;
      }

      const elapsed = timestamp - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(progress);

      const nextValues = toValues.map((toValue, index) => {
        const fromValue = fromValues[index] ?? toValue;
        return fromValue + (toValue - fromValue) * eased;
      });

      setAnimated(nextValues);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        previousValuesRef.current = toValues;
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [durationMs, target]);

  return animated;
};

type TravelDNARadarChartProps = {
  primaryDNA: TravelDNA;
  secondaryDNA?: TravelDNA | null;
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
  className?: string;
  size?: number;
};

function TravelDNARadarChart({
  primaryDNA,
  secondaryDNA,
  primaryLabel = 'You',
  secondaryLabel = 'Organizer',
  primaryColor = '#3D405B',
  secondaryColor = '#81B29A',
  className = '',
  size = 320,
}: TravelDNARadarChartProps) {
  const center = size / 2;
  const maxRadius = size * 0.32;
  const dimensionCount = TRAVEL_DNA_DIMENSIONS.length;

  const targetPrimaryValues = useMemo(() => toDNAArray(primaryDNA), [primaryDNA]);
  const targetSecondaryValues = useMemo(() => toDNAArray(secondaryDNA), [secondaryDNA]);

  const primaryValues = useAnimatedDNAValues(targetPrimaryValues);
  const secondaryValues = useAnimatedDNAValues(targetSecondaryValues);

  const primaryPolygon = useMemo(() => toPolygon(primaryValues, center, maxRadius), [center, maxRadius, primaryValues]);
  const secondaryPolygon = useMemo(
    () => toPolygon(secondaryValues, center, maxRadius),
    [center, maxRadius, secondaryValues],
  );

  return (
    <div className={`rounded-card bg-white/90 p-4 ring-1 ring-primary/10 ${className}`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full">
        {LEVELS.map((level) => (
          <circle
            key={`level-${level}`}
            cx={center}
            cy={center}
            r={(level / 10) * maxRadius}
            fill="none"
            stroke="rgba(61,64,91,0.12)"
            strokeWidth={1}
          />
        ))}

        {TRAVEL_DNA_DIMENSIONS.map(({ label }, index) => {
          const angle = -Math.PI / 2 + (index * Math.PI * 2) / dimensionCount;
          const lineEnd = toPoint(angle, maxRadius, center);
          const labelPoint = toPoint(angle, maxRadius + 16, center);
          const labelAnchor = Math.abs(Math.cos(angle)) < 0.2 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';

          return (
            <g key={label}>
              <line
                x1={center}
                y1={center}
                x2={lineEnd.x}
                y2={lineEnd.y}
                stroke="rgba(61,64,91,0.16)"
                strokeWidth={1}
              />
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor={labelAnchor}
                dominantBaseline="middle"
                fontSize={10}
                fill="rgba(61,64,91,0.8)"
              >
                {label}
              </text>
            </g>
          );
        })}

        {secondaryDNA ? (
          <polygon
            points={secondaryPolygon}
            fill={secondaryColor}
            fillOpacity={0.5}
            stroke={secondaryColor}
            strokeOpacity={0.78}
            strokeWidth={2}
          />
        ) : null}

        <polygon
          points={primaryPolygon}
          fill={primaryColor}
          fillOpacity={secondaryDNA ? 0.5 : 0.28}
          stroke={primaryColor}
          strokeOpacity={0.9}
          strokeWidth={2.5}
        />
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-primary/80">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
          {primaryLabel}
        </span>
        {secondaryDNA ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
            {secondaryLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default TravelDNARadarChart;
