export type TripLifecycleStatus = 'Open' | 'Introductory' | 'Locked' | 'Completed';

export interface EscrowSummary {
  baseAmount: number;
  platformFee: number;
  totalAmount: number;
  releasedToOrganizer: number;
}

const toCurrency = (value: number): number => Number(value.toFixed(2));

export const calculateEscrowSummary = (baseAmount: number): EscrowSummary => {
  const normalizedBase = Math.max(0, baseAmount);
  const platformFee = toCurrency(normalizedBase * 0.05);
  const totalAmount = toCurrency(normalizedBase + platformFee);

  return {
    baseAmount: toCurrency(normalizedBase),
    platformFee,
    totalAmount,
    releasedToOrganizer: 0,
  };
};

export const releaseCheckInFunds = (summary: EscrowSummary): EscrowSummary => {
  return {
    ...summary,
    releasedToOrganizer: toCurrency(summary.totalAmount * 0.5),
  };
};
