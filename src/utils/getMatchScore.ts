// Added by Codex: project documentation comment for src\utils\getMatchScore.ts
import {
  TRAVEL_DNA_DIMENSIONS,
  clampTravelDNAValue,
  type TravelDNA,
  type TripDNA,
  type UserDNA,
} from '../models/dnaModel';

const MAX_EUCLIDEAN_DISTANCE = Math.sqrt(TRAVEL_DNA_DIMENSIONS.length * 81);

export const getDNADistance = (userDNA: TravelDNA, organizerDNA: TravelDNA): number => {
  const squaredDistanceSum = TRAVEL_DNA_DIMENSIONS.reduce((total, { key }) => {
    const userValue = clampTravelDNAValue(userDNA[key]);
    const organizerValue = clampTravelDNAValue(organizerDNA[key]);
    const difference = userValue - organizerValue;
    return total + difference * difference;
  }, 0);

  return Math.sqrt(squaredDistanceSum);
};

export const getMatchScore = (userDNA: UserDNA, tripDNA: TripDNA): number => {
  const distance = getDNADistance(userDNA, tripDNA);
  const percentage = (1 - distance / MAX_EUCLIDEAN_DISTANCE) * 100;
  return Math.max(0, Math.min(100, Math.round(percentage)));
};

