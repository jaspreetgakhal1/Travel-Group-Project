import appIconUrl from '../assets/app-icon.png';

type SplitNGoLogoProps = {
  className?: string;
  title?: string;
};

function SplitNGoLogo({ className = 'h-10 w-auto', title = 'SplitNGo' }: SplitNGoLogoProps) {
  return <img src={appIconUrl} alt={title} className={className} />;
}

export default SplitNGoLogo;
