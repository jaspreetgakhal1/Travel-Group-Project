const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';

type ExpenseMember = {
  id: string;
  name: string;
  avatar: string | null;
  isHost: boolean;
};

type ExpenseSettlement = {
  userId: string;
  name: string;
  avatar: string | null;
  owesToUserId: string;
  owesToName: string;
  amount: number;
};

export type TripExpenseSummary = {
  trip: {
    id: string;
    title: string;
    location: string;
    imageUrl: string;
  };
  members: ExpenseMember[];
  expenses: Array<{
    id: string;
    description: string;
    amount: number;
    splitAmount: number;
    memberCount: number;
    paidBy: {
      userId: string;
      name: string;
      avatar: string | null;
    };
    settlements: ExpenseSettlement[];
    createdAt: string;
  }>;
  totalExpenses: number;
  settlementSummary: Array<{
    fromUserId: string;
    fromName: string;
    toUserId: string;
    toName: string;
    amount: number;
  }>;
  balances: Array<{
    userId: string;
    name: string;
    avatar: string | null;
    totalOwed: number;
    totalReceivable: number;
    netBalance: number;
  }>;
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

const request = async <T>(path: string, init: RequestInit, authToken: string): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new Error('Unable to connect to the expense API.');
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as T;
};

export const fetchTripExpenseSummary = async (tripId: string, authToken: string): Promise<TripExpenseSummary> =>
  request<TripExpenseSummary>(`/api/expenses/trips/${encodeURIComponent(tripId)}`, { method: 'GET' }, authToken);

export const splitTripExpense = async (
  payload: { tripId: string; description: string; amount: number },
  authToken: string,
): Promise<TripExpenseSummary> =>
  request<TripExpenseSummary>(
    '/api/expenses/split',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    authToken,
  );
