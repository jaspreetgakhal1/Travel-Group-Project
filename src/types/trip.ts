

export interface Trip {
  id: string;
  hostId?: string;
  title: string;
  startDate?: string;
  endDate?: string;
  hostName: string;
  hostCountryCode?: string;
  hostMobileNumber?: string;
  priceShare: number;
  matchPercentage: number;
  imageUrl: string;
  isVerified: boolean;
  maxParticipants?: number;
  spotsFilled?: number;
  participantIds?: string[];
  pendingRequestCount?: number;
}

