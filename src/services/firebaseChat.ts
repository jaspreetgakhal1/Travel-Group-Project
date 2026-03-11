import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getDatabase,
  limitToLast,
  off,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  serverTimestamp,
} from 'firebase/database';

export type ChatSenderRole = 'host' | 'participant';

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  role: ChatSenderRole;
  text: string;
  createdAt: number;
};

type PersistedChatMessage = {
  senderId?: unknown;
  senderName?: unknown;
  role?: unknown;
  text?: unknown;
  createdAt?: unknown;
};

type SendMessagePayload = {
  senderId: string;
  senderName: string;
  role: ChatSenderRole;
  text: string;
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => typeof value === 'string' && value.trim().length > 0,
);

const getDatabaseInstance = () => {
  if (!isFirebaseConfigured) {
    return null;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getDatabase(app);
};

const normalizeTimestamp = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return Date.now();
};

const normalizeRole = (value: unknown): ChatSenderRole => {
  if (value === 'host') {
    return 'host';
  }

  return 'participant';
};

const toChatMessage = (roomId: string, id: string, value: PersistedChatMessage): ChatMessage | null => {
  if (typeof value.text !== 'string' || !value.text.trim()) {
    return null;
  }

  if (typeof value.senderId !== 'string' || !value.senderId.trim()) {
    return null;
  }

  return {
    id,
    roomId,
    senderId: value.senderId,
    senderName: typeof value.senderName === 'string' && value.senderName.trim() ? value.senderName : 'Traveler',
    role: normalizeRole(value.role),
    text: value.text.trim(),
    createdAt: normalizeTimestamp(value.createdAt),
  };
};

export const sendMessage = async (roomId: string, payload: SendMessagePayload): Promise<void> => {
  const database = getDatabaseInstance();
  if (!database) {
    throw new Error('Firebase Realtime Database is not configured.');
  }

  const trimmedText = payload.text.trim();
  if (!trimmedText) {
    return;
  }

  const roomMessagesRef = ref(database, `groups/${roomId}/messages`);
  await push(roomMessagesRef, {
    senderId: payload.senderId,
    senderName: payload.senderName,
    role: payload.role,
    text: trimmedText,
    createdAt: serverTimestamp(),
  });
};

export const listenForMessages = (
  roomId: string,
  onMessages: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void,
): (() => void) => {
  const database = getDatabaseInstance();
  if (!database) {
    onMessages([]);
    return () => undefined;
  }

  const roomMessagesQuery = query(ref(database, `groups/${roomId}/messages`), orderByChild('createdAt'), limitToLast(200));

  const handleValue = (snapshot: import('firebase/database').DataSnapshot) => {
    const messages: ChatMessage[] = [];

    snapshot.forEach((childSnapshot) => {
      const parsed = toChatMessage(roomId, childSnapshot.key ?? '', childSnapshot.val() as PersistedChatMessage);
      if (parsed) {
        messages.push(parsed);
      }
      return false;
    });

    messages.sort((left, right) => left.createdAt - right.createdAt);
    onMessages(messages);
  };

  const handleError = (error: Error) => {
    if (onError) {
      onError(error);
    }
  };

  onValue(roomMessagesQuery, handleValue, handleError);

  return () => {
    off(roomMessagesQuery, 'value', handleValue);
  };
};

export const isRealtimeChatConfigured = (): boolean => isFirebaseConfigured;
