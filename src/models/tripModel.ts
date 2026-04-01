// Added by Codex: project documentation comment for src\models\tripModel.ts
import type { TripDNA } from './dnaModel';

export interface Trip {
  id: string;
  hostId?: string;
  title: string;
  hostName: string;
  hostCountryCode?: string;
  hostMobileNumber?: string;
  priceShare: number;
  expectedBudget?: number;
  matchPercentage: number;
  tripDNA: TripDNA;
  imageUrl: string;
  isVerified: boolean;
  route: string;
  duration: string;
  totalExpectedFromPartner: number;
  partnerExpectations: string[];
  notes: string;
  highlights: string[];
}

export const tripCatalog: Trip[] = [];
