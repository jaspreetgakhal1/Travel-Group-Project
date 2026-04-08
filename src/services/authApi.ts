// Added by Codex: project documentation comment for src\services\authApi.ts
import { normalizeTravelDNA, type UserDNA } from '../models/dnaModel';
import { buildApiUrl } from './apiBaseUrl';

type AuthRequest = {
  userId: string;
  password: string;
};

export type UserProfile = {
  firstName: string;
  lastName: string;
  countryCode: string;
  mobileNumber: string;
  email: string;
  profileImageDataUrl: string | null;
  travelDNA: UserDNA;
};

export type AuthenticatedUser = {
  id: string;
  userId: string;
  provider: 'Email';
  isVerified: boolean;
  isBlocked?: boolean;
  role: 'user' | 'admin';
  verificationStatus?: 'pending' | 'verified' | 'rejected';
};

export type LoginResponse = {
  token: string;
  user: AuthenticatedUser;
};

type RegisterResponse = {
  message: string;
};

type VerifyDocumentRequest = {
  documentName: string;
  mimeType: string;
  documentDataUrl: string;
  documentSize: number;
};

type VerifyDocumentResponse = {
  message: string;
  user: AuthenticatedUser;
};

export type ProfileResponse = {
  message?: string;
  profile: UserProfile;
  user: AuthenticatedUser;
};

type CurrentUserResponse = {
  user: AuthenticatedUser;
};

export type UpdateProfileRequest = {
  firstName: string;
  lastName: string;
  countryCode: string;
  mobileNumber: string;
  email: string;
  profileImageDataUrl: string | null;
};

export type TravelDNAResponse = {
  message?: string;
  travelDNA: UserDNA;
};

const buildUrl = (path: string) => buildApiUrl(path);

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { message?: string };
    if (payload.message) {
      return payload.message;
    }
  } catch {
    return 'Request failed.';
  }

  return 'Request failed.';
};

type RequestMethod = 'GET' | 'POST' | 'PUT';

type RequestOptions = {
  method?: RequestMethod;
  body?: object;
  authToken?: string;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', body, authToken } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Unable to connect to the auth API. Check that the server is running.');
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as T;
};

const normalizeProfile = (profile: UserProfile): UserProfile => ({
  ...profile,
  travelDNA: normalizeTravelDNA(profile.travelDNA),
});

const normalizeProfileResponse = (response: ProfileResponse): ProfileResponse => ({
  ...response,
  profile: normalizeProfile(response.profile),
});

export const registerWithCredentials = async (requestBody: AuthRequest): Promise<RegisterResponse> =>
  request<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: requestBody,
  });

export const loginWithCredentials = async (requestBody: AuthRequest): Promise<LoginResponse> =>
  request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: requestBody,
  });

export const uploadVerificationDocument = async (
  requestBody: VerifyDocumentRequest,
  authToken: string,
): Promise<VerifyDocumentResponse> =>
  request<VerifyDocumentResponse>('/api/auth/verify-document', {
    method: 'POST',
    body: requestBody,
    authToken,
  });

export const fetchUserProfile = async (authToken: string): Promise<ProfileResponse> => {
  const profileResponse = await request<ProfileResponse>('/api/auth/profile', {
    method: 'GET',
    authToken,
  });

  return normalizeProfileResponse(profileResponse);
}; 

export const fetchCurrentUser = async (authToken: string): Promise<AuthenticatedUser> => {
  const response = await request<CurrentUserResponse>('/api/users/me', {
    method: 'GET',
    authToken,
  });

  return response.user;
};

export const updateUserProfile = async (
  requestBody: UpdateProfileRequest,
  authToken: string,
): Promise<ProfileResponse> => {
  const profileResponse = await request<ProfileResponse>('/api/auth/profile', {
    method: 'PUT',
    body: requestBody,
    authToken,
  });

  return normalizeProfileResponse(profileResponse);
};

export const fetchTravelDNA = async (authToken: string): Promise<TravelDNAResponse> => {
  const response = await request<TravelDNAResponse>('/api/auth/travel-dna', {
    method: 'GET',
    authToken,
  });

  return {
    ...response,
    travelDNA: normalizeTravelDNA(response.travelDNA),
  };
};

export const updateTravelDNA = async (travelDNA: UserDNA, authToken: string): Promise<TravelDNAResponse> => {
  const response = await request<TravelDNAResponse>('/api/auth/travel-dna', {
    method: 'PUT',
    body: {
      travelDNA,
    },
    authToken,
  });

  return {
    ...response,
    travelDNA: normalizeTravelDNA(response.travelDNA),
  };
};

