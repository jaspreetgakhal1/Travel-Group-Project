// Added by Codex: project documentation comment for src\types\feed.ts
export type FeedPostStatus = 'Active' | 'Completed';

export type FeedPost = {
  id: string;
  authorKey: string;
  status: FeedPostStatus;
  onlyVerifiedUsers: boolean;
  title: string;
  hostName: string;
  isVerified: boolean;
  hostProfileImageDataUrl?: string | null;
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

