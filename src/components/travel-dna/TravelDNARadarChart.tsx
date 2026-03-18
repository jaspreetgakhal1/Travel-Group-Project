
import type { TravelDNA } from '../../models/dnaModel';
import TravelDNARadar from './TravelDNARadar';

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

function TravelDNARadarChart(props: TravelDNARadarChartProps) {
  const {
    primaryDNA,
    secondaryDNA,
    primaryLabel = 'You',
    secondaryLabel = 'The Trip',
    className = '',
    size = 320,
  } = props;

  return (
    <TravelDNARadar
      userProfile={primaryDNA}
      tripProfile={secondaryDNA}
      userLabel={primaryLabel}
      tripLabel={secondaryLabel}
      className={className}
      height={size}
    />
  );
}

export default TravelDNARadarChart;

export type { TravelDNARadarChartProps };

