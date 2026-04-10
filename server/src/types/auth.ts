export interface AuthenticatedUser {
  id: string;
  userId?: string;
  provider?: string;
  role?: 'user' | 'admin';
}
