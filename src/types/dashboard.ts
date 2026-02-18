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
