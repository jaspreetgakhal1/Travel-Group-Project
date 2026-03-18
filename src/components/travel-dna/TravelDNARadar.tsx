import { useMemo } from 'react';
import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';

type DNAInput = Record<string, unknown> | null | undefined;

type TravelDNARadarProps = {
  userProfile?: DNAInput;
  tripProfile?: DNAInput;
  userDNA?: DNAInput;
  tripDNA?: DNAInput;
  userLabel?: string;
  tripLabel?: string;
  className?: string;
  height?: number;
};

type RadarPoint = {
  subject: string;
  A: number;
  B: number;
  fullMark: 100;
};

const CATEGORY_MAP = [
  { subject: 'Adventure', keys: ['adventure', 'Adventure', 'riskAppetite'] },
  { subject: 'Social', keys: ['social', 'Social', 'socialBattery'] },
  { subject: 'Budget', keys: ['budget', 'Budget', 'budgetFlexibility'] },
  { subject: 'Relaxation', keys: ['relaxation', 'Relaxation', 'cleanliness'] },
  { subject: 'Culture', keys: ['culture', 'Culture', 'planningStyle'] },
  { subject: 'Nature', keys: ['nature', 'Nature', 'morningSync'] },
] as const;

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const normalizeScore = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  if (value <= 1) {
    return clampPercent(value * 100);
  }

  if (value <= 10) {
    return clampPercent(value * 10);
  }

  return clampPercent(value);
};

const getScore = (source: DNAInput, keys: readonly string[]): number | null => {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const normalized = normalizeScore(source[key]);
    if (normalized !== null) {
      return normalized;
    }
  }

  return null;
};

const parsePayloadValue = (value: number | string | readonly (number | string)[] | undefined): number => {
  if (Array.isArray(value)) {
    const firstValue = value[0];
    return typeof firstValue === 'number' ? firstValue : Number(firstValue);
  }

  return typeof value === 'number' ? value : Number(value);
};

function TravelDNARadar({
  userProfile,
  tripProfile,
  userDNA,
  tripDNA,
  userLabel = 'You',
  tripLabel = 'The Trip',
  className = '',
  height = 350,
}: TravelDNARadarProps) {
  const resolvedUserProfile = userProfile ?? userDNA;
  const resolvedTripProfile = tripProfile ?? tripDNA;

  const radarData = useMemo(() => {
    const points: RadarPoint[] = CATEGORY_MAP.map(({ subject, keys }) => {
      const userValue = getScore(resolvedUserProfile, keys);
      const tripValue = getScore(resolvedTripProfile, keys);

      return {
        subject,
        A: userValue ?? 0,
        B: tripValue ?? 0,
        fullMark: 100,
      };
    });

    const hasUserData = points.some((point) => point.A > 0);
    const hasTripData = points.some((point) => point.B > 0);

    return {
      points,
      hasUserData,
      hasTripData,
    };
  }, [resolvedTripProfile, resolvedUserProfile]);

  const renderTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: ReadonlyArray<{
      dataKey?: string | number | ((obj: unknown) => unknown);
      value?: number | string | readonly (number | string)[];
    }>;
    label?: string | number;
  }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const userValue = payload.find((entry) => entry.dataKey === 'A')?.value;
    const tripValue = payload.find((entry) => entry.dataKey === 'B')?.value;
    const parsedUser = parsePayloadValue(userValue);
    const parsedTrip = parsePayloadValue(tripValue);
    const hasTrip = Number.isFinite(parsedTrip) && radarData.hasTripData;
    const match = Number.isFinite(parsedUser) && hasTrip ? Math.max(0, 100 - Math.abs(parsedUser - parsedTrip)) : null;

    return (
      <div
        style={{
          borderRadius: '12px',
          border: '1px solid rgba(100, 116, 139, 0.24)',
          background: 'rgba(255, 255, 255, 0.97)',
          padding: '10px 12px',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
          fontFamily: 'Inter, Montserrat, sans-serif',
          color: '#334155',
          minWidth: 132,
        }}
      >
        <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{label}</p>
        {Number.isFinite(parsedUser) ? (
          <p style={{ margin: '6px 0 0', fontWeight: 600, color: '#81B29A' }}>
            {userLabel}: {Math.round(parsedUser)}%
          </p>
        ) : null}
        {hasTrip ? (
          <p style={{ margin: '4px 0 0', fontWeight: 600, color: '#E07A5F' }}>
            {tripLabel}: {Math.round(parsedTrip)}%
          </p>
        ) : null}
        {match !== null ? (
          <p style={{ margin: '6px 0 0', fontWeight: 700, color: '#475569' }}>Match: {Math.round(match)}%</p>
        ) : null}
      </div>
    );
  };

  return (
    <div
      className={`h-[350px] rounded-card bg-white/50 p-4 backdrop-blur-md ring-1 ring-primary/10 ${className}`.trim()}
      style={{ height }}
    >
      {!radarData.hasUserData ? (
        <div className="flex h-full items-center justify-center rounded-card border border-dashed border-primary/30 bg-white/35 px-6 text-center text-sm font-medium text-primary/75">
          Complete your Travel DNA profile to unlock your radar chart.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData.points} cx="50%" cy="50%" outerRadius="80%">
            <PolarGrid gridType="polygon" stroke="rgba(100, 116, 139, 0.25)" />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <PolarAngleAxis
              dataKey="subject"
              tick={{
                fill: '#64748b',
                fontSize: 12,
                fontFamily: 'Inter, Montserrat, sans-serif',
              }}
            />
            <Tooltip content={renderTooltip} />
            <Legend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{
                color: '#64748b',
                fontSize: '12px',
                fontFamily: 'Inter, Montserrat, sans-serif',
                paddingTop: '8px',
              }}
            />
            <Radar
              name={userLabel}
              dataKey="A"
              stroke="#81B29A"
              fill="#81B29A"
              fillOpacity={0.6}
              isAnimationActive
            />
            {radarData.hasTripData ? (
              <Radar
                name={tripLabel}
                dataKey="B"
                stroke="#E07A5F"
                fill="#E07A5F"
                fillOpacity={0.4}
                strokeDasharray="4 4"
                isAnimationActive
              />
            ) : null}
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default TravelDNARadar;
export type { TravelDNARadarProps };
