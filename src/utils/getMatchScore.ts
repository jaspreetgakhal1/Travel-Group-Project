import type { TripDNA, UserDNA } from '../models/dnaModel';

const clampToSliderRange = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(10, Math.max(1, value));
};

const sliderSimilarity = (left: number, right: number): number => {
  const normalizedLeft = clampToSliderRange(left);
  const normalizedRight = clampToSliderRange(right);
  const distance = Math.abs(normalizedLeft - normalizedRight);
  return (1 - distance / 9) * 100;
};

export const getMatchScore = (userDNA: UserDNA, tripDNA: TripDNA): number => {
  const socialScore = sliderSimilarity(userDNA.socialEnergy, tripDNA.socialEnergy);
  const budgetScore = sliderSimilarity(userDNA.budgetRange, tripDNA.budgetRange);
  const paceScore = userDNA.pace === tripDNA.pace ? 100 : 45;

  const weightedScore = socialScore * 0.4 + budgetScore * 0.4 + paceScore * 0.2;
  return Math.round(weightedScore);
};
