import React from 'react';
import { chatMessages } from '../data/chatMessages';

const ChatInterface: React.FC = () => {
  return (
    <section className="rounded-card bg-white p-5 shadow-sm ring-1 ring-primary/10">
      <header className="mb-4 flex items-center justify-between gap-3 border-b border-primary/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Group Chat</p>
          <h3 className="text-lg font-semibold text-primary">Lisbon Food + Nightlife Week</h3>
        </div>

        <button
          type="button"
          className="rounded-card bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
        >
          SOS
        </button>
      </header>

      <div className="space-y-3">
        {chatMessages.map((message) => (
          <div
            key={message.id}
            className={message.isCurrentUser ? 'flex justify-end' : 'flex justify-start'}
          >
            <div
              className={
                message.isCurrentUser
                  ? 'max-w-[85%] rounded-card bg-accent px-4 py-3 text-background'
                  : 'max-w-[85%] rounded-card bg-background px-4 py-3 text-primary ring-1 ring-primary/10'
              }
            >
              <p className="text-xs font-semibold opacity-80">{message.sender}</p>
              <p className="mt-1 text-sm leading-relaxed">{message.content}</p>
              <p className="mt-1 text-right text-[11px] opacity-70">{message.sentAt}</p>
            </div>
          </div>
        ))}
      </div>

      <form className="mt-4 flex gap-2 border-t border-primary/10 pt-4">
        <input
          type="text"
          placeholder="Message your group..."
          className="w-full rounded-card border border-primary/20 bg-background px-4 py-2.5 text-sm text-primary outline-none ring-accent/40 transition focus:ring-2"
        />
        <button
          type="submit"
          className="rounded-card bg-primary px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
        >
          Send
        </button>
      </form>
    </section>
  );
};

export default ChatInterface;
