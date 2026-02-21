import React, { useEffect, useRef, useState } from 'react';

type ChatRole = 'user' | 'ai';

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  sentAt: string;
};

const formatTime = (): string =>
  new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

const getAiReply = (prompt: string): string => {
  const normalized = prompt.toLowerCase();

  if (normalized.includes('price') || normalized.includes('cost')) {
    return 'For pricing details, share your use case and expected group size. We can guide the best plan.';
  }

  if (normalized.includes('bug') || normalized.includes('issue') || normalized.includes('problem')) {
    return 'Please describe the issue step-by-step and mention the screen name so support can reproduce it quickly.';
  }

  if (normalized.includes('verification') || normalized.includes('verified')) {
    return 'Verification support is available in the profile flow. If blocked, share your exact error message here.';
  }

  if (normalized.includes('trip') || normalized.includes('host')) {
    return 'To host a trip, use the Host section on landing, sign in, and complete the Create Trip form.';
  }

  return 'Thanks for contacting us. Share a bit more context and I will guide you to the right support path.';
};

const ContactUsView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'ai-welcome',
      role: 'ai',
      text: 'Hi, I am SplitNGo AI Support. How can I help you today?',
      sentAt: formatTime(),
    },
  ]);
  const [draft, setDraft] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [isWidgetOpen, setIsWidgetOpen] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isWidgetOpen) {
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isResponding, isWidgetOpen]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || isResponding) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      sentAt: formatTime(),
    };

    setMessages((previous) => [...previous, userMessage]);
    setDraft('');
    setIsResponding(true);

    window.setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: getAiReply(text),
        sentAt: formatTime(),
      };
      setMessages((previous) => [...previous, aiMessage]);
      setIsResponding(false);
    }, 650);
  };

  return (
    <>
      <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
        <article className="rounded-card bg-white/95 p-8 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Contact Us</p>
          <h2 className="mt-1 text-3xl font-black text-primary">Talk To SplitNGo Support</h2>
          <p className="mt-3 text-sm leading-relaxed text-primary/85">
            Need help with hosting, verification, onboarding, or a product issue? Use the AI support chat
            at the bottom-right. It opens by default and stays available while you browse.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <article className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
              <p className="text-sm font-semibold text-primary">Response Type</p>
              <p className="mt-1 text-sm text-primary/80">Instant AI guidance for common questions and flows.</p>
            </article>
            <article className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
              <p className="text-sm font-semibold text-primary">Best Way To Get Help</p>
              <p className="mt-1 text-sm text-primary/80">
                Mention the screen name and the exact issue so support steps can be precise.
              </p>
            </article>
          </div>
        </article>
      </section>

      <div className="fixed bottom-5 right-5 z-[90] w-[min(92vw,390px)]">
        {isWidgetOpen ? (
          <article className="overflow-hidden rounded-[22px] border border-primary/15 bg-white shadow-2xl ring-1 ring-black/5">
            <header className="flex items-center justify-between bg-gradient-to-r from-primary to-accent px-4 py-3 text-white">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">Live Support</p>
                <h3 className="text-sm font-semibold">SplitNGo AI Assistant</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWidgetOpen(false)}
                className="interactive-btn rounded-full border border-white/30 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/15"
                aria-label="Minimize support chat"
              >
                Hide
              </button>
            </header>

            <div ref={messagesContainerRef} className="h-80 space-y-3 overflow-y-auto bg-background/40 p-3">
              {messages.map((message) => (
                <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={
                      message.role === 'user'
                        ? 'max-w-[86%] rounded-2xl rounded-br-md bg-accent px-4 py-3 text-white'
                        : 'max-w-[86%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-primary ring-1 ring-primary/10'
                    }
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide opacity-75">
                      {message.role === 'user' ? 'You' : 'AI Support'}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">{message.text}</p>
                    <p className="mt-1 text-right text-[11px] opacity-70">{message.sentAt}</p>
                  </div>
                </div>
              ))}

              {isResponding ? (
                <div className="flex justify-start">
                  <div className="max-w-[86%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-primary ring-1 ring-primary/10">
                    <p className="text-[11px] font-semibold uppercase tracking-wide opacity-75">AI Support</p>
                    <p className="mt-1 text-sm">Typing...</p>
                  </div>
                </div>
              ) : null}
            </div>

            <form
              className="flex gap-2 border-t border-primary/10 bg-white p-3"
              onSubmit={(event) => {
                event.preventDefault();
                handleSend();
              }}
            >
              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask anything..."
                className="interactive-input w-full rounded-card border border-primary/20 bg-white px-3 py-2.5 text-sm text-primary outline-none"
              />
              <button
                type="submit"
                disabled={!draft.trim() || isResponding}
                className="interactive-btn rounded-card bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send
              </button>
            </form>
          </article>
        ) : (
          <button
            type="button"
            onClick={() => setIsWidgetOpen(true)}
            className="interactive-btn w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-xl hover:opacity-95"
          >
            Open AI Support Chat
          </button>
        )}
      </div>
    </>
  );
};

export default ContactUsView;
