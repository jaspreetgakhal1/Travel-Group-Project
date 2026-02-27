import type { TravelDNAField } from '../../models/dnaModel';

type VibeSliderProps = {
  id: TravelDNAField;
  label: string;
  lowLabel: string;
  highLabel: string;
  value: number;
  disabled?: boolean;
  onChange: (nextValue: number) => void;
};

function VibeSlider({ id, label, lowLabel, highLabel, value, disabled = false, onChange }: VibeSliderProps) {
  const normalizedValue = Math.max(1, Math.min(10, Math.round(value)));

  return (
    <label className="block rounded-card bg-white p-3 ring-1 ring-primary/10">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-primary">{label}</span>
        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
          {normalizedValue}/10
        </span>
      </div>
      <input
        id={`vibe-${id}`}
        type="range"
        min={1}
        max={10}
        value={normalizedValue}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="vibe-slider mt-3 h-2 w-full cursor-pointer appearance-none rounded-full"
      />
      <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-primary/65">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </label>
  );
}

export default VibeSlider;
