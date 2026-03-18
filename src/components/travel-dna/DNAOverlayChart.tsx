
import { TRAVEL_DNA_DIMENSIONS, type TravelDNA } from '../../models/dnaModel';
import TravelDNARadarChart from './TravelDNARadarChart';

type DNAOverlayChartProps = {
  userDNA: TravelDNA;
  organizerDNA: TravelDNA;
  className?: string;
};

const COMPACT_DIFF_LABEL_BY_KEY: Record<string, string> = {
  socialBattery: 'Social',
  planningStyle: 'Plan',
  budgetFlexibility: 'Budget',
  morningSync: 'Morning',
  riskAppetite: 'Risk',
  cleanliness: 'Clean',
};

const toPercent = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((value / 10) * 100)));
};

function DNAOverlayChart({ userDNA, organizerDNA, className = '' }: DNAOverlayChartProps) {
  const differences = TRAVEL_DNA_DIMENSIONS.map(({ key, label }) => {
    const hostPercent = toPercent(organizerDNA[key]);
    const userPercent = toPercent(userDNA[key]);
    return {
      key,
      label: COMPACT_DIFF_LABEL_BY_KEY[key] ?? label,
      diff: Math.abs(hostPercent - userPercent),
    };
  });

  return (
    <div className={className}>
      <TravelDNARadarChart
        primaryDNA={userDNA}
        secondaryDNA={organizerDNA}
        primaryLabel="Your DNA"
        secondaryLabel="Organizer DNA"
        primaryColor="#3D405B"
        secondaryColor="#81B29A"
        size={400}
      />

      <div className="mt-1.5 grid grid-cols-2 gap-1 px-1">
        {differences.map((item) => (
          <span
            key={item.key}
            className="overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary/80"
          >
            {item.label}: {item.diff}%
          </span>
        ))}
      </div>
    </div>
  );
}

export default DNAOverlayChart;

