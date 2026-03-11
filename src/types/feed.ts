export type FeedPostStatus = 'Active' | 'Completed';

export type FeedPost = {
  id: string;
  hostId?: string;
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
  maxParticipants: number;
  spotsFilled: number;
  spotsFilledPercent: number;
  participantIds: string[];
  expectations: string[];
  travelerType: string;
  startDate: string;
  endDate: string;
  pendingRequestCount?: number;
};
