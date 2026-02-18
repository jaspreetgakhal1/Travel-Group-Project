export type ChatMessage = {
  id: string;
  sender: string;
  content: string;
  isCurrentUser: boolean;
  sentAt: string;
};

export type ExpenseCategory = 'Transport' | 'Stay' | 'Food' | 'Tickets';

export type NavIcon = 'trips' | 'safety' | 'wallet' | 'support';

export type NavItem = {
  id: string;
  label: string;
  icon: NavIcon;
};

export const chatMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'Maya',
    content: 'Landing in Lisbon around 3 PM. Should we split a van from the airport?',
    isCurrentUser: false,
    sentAt: '09:14',
  },
  {
    id: 'msg-2',
    sender: 'You',
    content: 'Yes, that works. I can book and add it to shared transport.',
    isCurrentUser: true,
    sentAt: '09:18',
  },
  {
    id: 'msg-3',
    sender: 'Andre',
    content: 'Perfect. Also pinned a few food spots near our stay.',
    isCurrentUser: false,
    sentAt: '09:20',
  },
];

export const navItems: NavItem[] = [
  { id: 'my-trips', label: 'My Trips', icon: 'trips' },
  { id: 'safety-center', label: 'Safety Center', icon: 'safety' },
  { id: 'wallet', label: 'Wallet', icon: 'wallet' },
  { id: 'support', label: 'Support', icon: 'support' },
];

export const expenseCategories: ExpenseCategory[] = ['Transport', 'Stay', 'Food', 'Tickets'];

export const initialCosts: Record<ExpenseCategory, number> = {
  Transport: 220,
  Stay: 960,
  Food: 320,
  Tickets: 180,
};
