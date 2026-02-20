const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';

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

export const loginWithCredentials = async (requestBody: AuthRequest): Promise<LoginResponse> =>
  request<LoginResponse>('/api/auth/login', requestBody);

export const uploadVerificationDocument = async (
  requestBody: VerifyDocumentRequest,
  authToken: string,
): Promise<VerifyDocumentResponse> => request<VerifyDocumentResponse>('/api/auth/verify-document', requestBody, authToken);
