export interface Trip {
  id: string;
  hostId?: string;
  title: string;
  hostName: string;
  priceShare: number;
  matchPercentage: number;
  imageUrl: string;
  isVerified: boolean;
  maxParticipants?: number;
  spotsFilled?: number;
  participantIds?: string[];
  pendingRequestCount?: number;
}
