const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';
const DUMMY_USER_ID = 'test@gmail.com';
const DUMMY_PASSWORD = '123456';
const DUMMY_AUTH_TOKEN = 'splitngo_dummy_auth_token';

type AuthRequest = {
  userId: string;
  password: string;
};

export type AuthenticatedUser = {
  id: string;
  userId: string;
  provider: 'Email';
  isVerified: boolean;
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

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

const isDummyCredentials = (userId: string, password: string): boolean =>
  userId.trim().toLowerCase() === DUMMY_USER_ID && password === DUMMY_PASSWORD;

const createDummyUser = (isVerified = false): AuthenticatedUser => ({
  id: 'dummy-user',
  userId: DUMMY_USER_ID,
  provider: 'Email',
  isVerified,
});

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

const request = async <T>(path: string, body: object, authToken?: string): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
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

export const registerWithCredentials = async (requestBody: AuthRequest): Promise<RegisterResponse> =>
  request<RegisterResponse>('/api/auth/register', requestBody);

export const loginWithCredentials = async (requestBody: AuthRequest): Promise<LoginResponse> => {
  if (isDummyCredentials(requestBody.userId, requestBody.password)) {
    return {
      token: DUMMY_AUTH_TOKEN,
      user: createDummyUser(false),
    };
  }

  return request<LoginResponse>('/api/auth/login', requestBody);
};

export const uploadVerificationDocument = async (
  requestBody: VerifyDocumentRequest,
  authToken: string,
): Promise<VerifyDocumentResponse> => {
  if (authToken === DUMMY_AUTH_TOKEN) {
    return {
      message: 'Document uploaded and profile verified.',
      user: createDummyUser(true),
    };
  }

  return request<VerifyDocumentResponse>('/api/auth/verify-document', requestBody, authToken);
};
