
// Added by Codex: project documentation comment for src\services\postApi.ts
import type { FeedPost, FeedPostStatus } from '../types/feed';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';

export type CreateFeedPostPayload = {
  authorKey: string;
  status?: FeedPostStatus;
  onlyVerifiedUsers: boolean;
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
export type PostStats = {
  activeCount: number;
  completedCount: number;
  totalCount: number;
};

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

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

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(buildUrl(path), init);
  } catch {
    throw new Error('Unable to connect to the post API. Check that the server is running.');
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as T;
};

type FetchFeedPostsOptions = {
  viewerVerified: boolean;
  viewerAuthorKey?: string | null;
};

export const fetchFeedPosts = async (options: FetchFeedPostsOptions): Promise<FeedPost[]> => {
  const query = new URLSearchParams({
    status: 'Active',
    viewerVerified: options.viewerVerified ? 'true' : 'false',
  });

  if (options.viewerAuthorKey) {
    query.set('viewerAuthorKey', options.viewerAuthorKey);
  }

  return request<FeedPost[]>(`/api/posts?${query.toString()}`, {
    method: 'GET',
  });
};

export const createFeedPost = async (payload: CreateFeedPostPayload): Promise<FeedPost> =>
  request<FeedPost>('/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

export const updateFeedPost = async (postId: string, payload: CreateFeedPostPayload): Promise<FeedPost> =>
  request<FeedPost>(`/api/posts/${postId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

export const updateFeedPostStatus = async (
  postId: string,
  status: FeedPostStatus,
  authorKey: string,
): Promise<FeedPost> =>
  request<FeedPost>(`/api/posts/${postId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status,
      authorKey,
    }),
  });

export const deleteFeedPost = async (postId: string, authorKey: string): Promise<{ message: string }> =>
  request<{ message: string }>(`/api/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      authorKey,
    }),
  });

export const fetchPostStats = async (authorKey?: string): Promise<PostStats> => {
  const query = authorKey ? `?authorKey=${encodeURIComponent(authorKey)}` : '';
  return request<PostStats>(`/api/posts/stats${query}`, {
    method: 'GET',
  });
};

