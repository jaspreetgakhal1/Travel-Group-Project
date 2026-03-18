import { useEffect, useMemo, useState } from 'react';
import { Send, X } from 'lucide-react';
import { isRealtimeChatConfigured, listenForMessages, sendMessage, type ChatMessage } from '../services/firebaseChat';

type ChatRoomProps = {
  isOpen: boolean;
  roomId: string;
  tripTitle: string;
  currentUserId: string | null;
  currentUserName: string;
  isHost: boolean;
  onClose: () => void;
};

const timestampFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

function ChatRoom({ isOpen, roomId, tripTitle, currentUserId, currentUserName, isHost, onClose }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState('');

  const isChatConfigured = useMemo(() => isRealtimeChatConfigured(), []);

  useEffect(() => {
    if (!isOpen || !isChatConfigured) {
      setMessages([]);
      return;
    }

    const unsubscribe = listenForMessages(
      roomId,
      (nextMessages) => {
        setMessages(nextMessages);
      },
      (error) => {
        setChatError(error.message || 'Unable to load chat messages right now.');
      },
    );

    return unsubscribe;
  }, [isChatConfigured, isOpen, roomId]);

  const handleSend = async () => {
    if (!currentUserId) {
      setChatError('Sign in is required before sending messages.');
      return;
    }

    if (!draftMessage.trim()) {
      return;
    }

    setIsSending(true);
    setChatError('');

    try {
      await sendMessage(roomId, {
        senderId: currentUserId,
        senderName: currentUserName || 'Traveler',
        role: isHost ? 'host' : 'participant',
        text: draftMessage,
      });
      setDraftMessage('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send message right now.';
      setChatError(message);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[130]">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-[#3D405B]/45 backdrop-blur-[2px]"
        aria-label="Close chat room"
      />

      <section className="relative mx-auto mt-10 flex h-[min(84vh,760px)] w-[min(96vw,840px)] flex-col overflow-hidden rounded-3xl border border-primary/15 bg-[#F4F1DE] shadow-2xl">
        <header className="flex items-center justify-between border-b border-primary/10 bg-white/55 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Trip Chat</p>
            <h3 className="text-lg font-black text-primary">{tripTitle}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="interactive-btn inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/15 bg-white/70 text-primary"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {!isChatConfigured ? (
          <div className="m-4 rounded-2xl border border-[#E07A5F]/25 bg-white/70 px-4 py-3 text-sm text-[#8C4633]">
            Firebase chat is not configured. Add `VITE_FIREBASE_*` variables to enable realtime chat.
          </div>
        ) : null}

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-primary/75">
              No messages yet. Start the conversation for this trip room.
            </div>
          ) : (
            messages.map((message) => {
              const isCurrentUserMessage = Boolean(currentUserId && message.senderId === currentUserId);
              const bubbleColorClass =
                message.role === 'host' ? 'bg-[#3D405B] text-white' : 'bg-[#81B29A] text-[#1F3F34]';

              return (
                <article
                  key={message.id}
                  className={`flex ${isCurrentUserMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${bubbleColorClass}`}>
                    <p className="text-[11px] font-semibold opacity-90">{message.senderName}</p>
                    <p className="mt-0.5 text-sm leading-relaxed">{message.text}</p>
                    <p className="mt-1 text-[10px] opacity-75">{timestampFormatter.format(new Date(message.createdAt))}</p>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <footer className="border-t border-primary/10 bg-white/55 px-4 py-3">
          {chatError ? <p className="mb-2 text-xs font-semibold text-[#8C4633]">{chatError}</p> : null}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              disabled={!isChatConfigured || isSending}
              placeholder="Send a message to your trip room..."
              className="interactive-input w-full rounded-xl border border-primary/15 bg-white px-3 py-2 text-sm text-primary outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />
            <button
              type="button"
              onClick={() => {
                void handleSend();
              }}
              disabled={!isChatConfigured || isSending || !draftMessage.trim()}
              className="interactive-btn inline-flex items-center gap-1 rounded-xl bg-[#3D405B] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default ChatRoom;

