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
    expectedBudget: number;
    durationDays: number;
  };
  members: ExpenseMember[];
  expenses: Array<{
    id: string;
    description: string;
    amount: number;
    splitAmount: number;
    memberCount: number;
    createdBy: string;
    lastUpdatedBy: string | null;
    lastUpdatedByName: string | null;
    paidBy: {
      userId: string;
      name: string;
      avatar: string | null;
    };
    settlements: ExpenseSettlement[];
    createdAt: string;
    updatedAt: string;
  }>;
  totalExpenses: number;
  budgetSummary: {
    expectedBudget: number;
    totalExpenses: number;
    remainingBudget: number;
    overBudgetAmount: number;
    budgetUtilizationPercent: number;
    budgetUtilizationDisplayPercent: number;
    budgetStatus: 'healthy' | 'at_risk' | 'over_budget';
  };
  liquidationSummary: {
    participantCount: number;
    individualResponsibility: number;
    remainingBudget: number;
    statuses: Array<{
      userId: string;
      name: string;
      avatar: string | null;
      totalSpent: number;
      individualResponsibility: number;
      varianceFromResponsibility: number;
      amountToContribute: number;
      aheadBy: number;
      status: 'needs_to_contribute' | 'ahead_of_target' | 'paid_in_full';
      label: string;
    }>;
  };
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
    totalSpent?: number;
    equalShare?: number;
    totalOwed: number;
    totalReceivable: number;
    netBalance: number;
  }>;
};

export type WalletSummaryEntry = {
  id: string;
  tripId: string;
  tripTitle: string;
  recipientUserId: string;
  recipientName: string;
  recipientAvatar: string | null;
  amount: number;
};

export type WalletSummary = {
  paidTotal: number;
  releasedTotal: number;
  escrowBalance: number;
  paidEntries: WalletSummaryEntry[];
  releasedEntries: WalletSummaryEntry[];
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

export const fetchActiveTripExpenseSummary = async (authToken: string): Promise<TripExpenseSummary> =>
  request<TripExpenseSummary>('/api/trips/active/settlement', { method: 'GET' }, authToken);

export const fetchTripExpenseSummary = async (tripId: string, authToken: string): Promise<TripExpenseSummary> =>
  request<TripExpenseSummary>(`/api/trips/${encodeURIComponent(tripId)}/settlement`, { method: 'GET' }, authToken);

export const splitTripExpense = async (
  payload: { tripId: string; description: string; amount: number; debtorIds: string[] },
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

export const updateTripExpense = async (
  expenseId: string,
  payload: { description: string; amount: number; debtorIds: string[] },
  authToken: string,
): Promise<TripExpenseSummary> =>
  request<TripExpenseSummary>(
    `/api/expenses/${encodeURIComponent(expenseId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    authToken,
  );

export const deleteTripExpense = async (expenseId: string, authToken: string): Promise<TripExpenseSummary> =>
  request<TripExpenseSummary>(
    `/api/expenses/${encodeURIComponent(expenseId)}`,
    {
      method: 'DELETE',
    },
    authToken,
  );

export const fetchWalletSummary = async (authToken: string): Promise<WalletSummary> =>
  request<WalletSummary>('/api/wallet/summary', { method: 'GET' }, authToken);

export const releaseWalletPayment = async (
  payload: { tripId: string; recipientUserId: string; amount: number },
  authToken: string,
): Promise<WalletSummary> =>
  request<WalletSummary>(
    '/api/wallet/release',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    authToken,
  );
