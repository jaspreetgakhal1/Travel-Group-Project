export type FeedPost = {
  id: string;
  title: string;
  hostName: string;
  isVerified: boolean;
  imageUrl: string;
  location: string;
  cost: number;
  durationDays: number;
  requiredPeople: number;
  spotsFilledPercent: number;
  expectations: string[];
  travelerType: string;
  startDate: string;
  endDate: string;
};
