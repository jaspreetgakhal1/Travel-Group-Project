export type TravelPace = 'Active' | 'Chill';

export interface UserDNA {
  socialEnergy: number;
  budgetRange: number;
  pace: TravelPace;
}

export interface TripDNA {
  socialEnergy: number;
  budgetRange: number;
  pace: TravelPace;
}

export const defaultUserDNA: UserDNA = {
  socialEnergy: 5,
  budgetRange: 5,
  pace: 'Active',
};
