// Added by Codex: project documentation comment for src\components\travel-dna\DNAOverlayChart.tsx
import type { TravelDNA } from '../../models/dnaModel';
import TravelDNARadarChart from './TravelDNARadarChart';

type DNAOverlayChartProps = {
  userDNA: TravelDNA;
  organizerDNA: TravelDNA;
  className?: string;
};

function DNAOverlayChart({ userDNA, organizerDNA, className = '' }: DNAOverlayChartProps) {
  return (
    <TravelDNARadarChart
      primaryDNA={userDNA}
      secondaryDNA={organizerDNA}
      primaryLabel="Your DNA"
      secondaryLabel="Organizer DNA"
      primaryColor="#3D405B"
      secondaryColor="#81B29A"
      className={className}
    />
  );
}

export default DNAOverlayChart;

