// Added by Codex: project documentation comment for src\types\feed.ts
export type FeedPostStatus = 'Active' | 'Completed' | 'Cancelled';

export type FeedPostAuthor = {
  id: string;
  name: string;
  avatar: string | null;
  isVerified: boolean;
};

export type FeedPost = {
  id: string;
  hostId?: string;
  hostCountryCode?: string;
  hostMobileNumber?: string;
  author?: FeedPostAuthor | string | null;
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
  expectedBudget: number;
  durationDays: number;
  requiredPeople: number;
  maxParticipants: number;
  spotsFilled: number;
  spotsFilledPercent: number;
  participantIds: string[];
  expectations: string[];
  travelerType: string;
  currency: string;
  isPrivate: boolean;
  emergencyContact: {
    name: string;
    phone: string;
  };
  startDate: string;
  endDate: string;
  pendingRequestCount?: number;
};

