import type { ChatMessage } from '../types/dashboard';

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
