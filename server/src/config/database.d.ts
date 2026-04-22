export const connectDatabase: () => Promise<void>;
export const getDatabaseHealth: () => {
  connected: boolean;
  readyState: number;
  state: string;
  lastError: string | null;
};
