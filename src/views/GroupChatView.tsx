import React, { useEffect, useMemo, useState } from 'react';
import type { ChatMessage } from '../models/dashboardModel';
import type { Trip } from '../models/tripModel';
import type { EscrowSummary, TripLifecycleStatus } from '../utils/paymentProcessor';

type GroupChatViewProps = {
  trip: Trip;
  messages: ChatMessage[];
  introEndsAt: number | null;
  status: TripLifecycleStatus;
  escrowSummary: EscrowSummary | null;
  hasReleasedCheckInFunds: boolean;
  onCommitAndPay: () => void;
  onReleaseCheckInFunds: () => void;
  onOpenReview: () => void;
};

const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const GroupChatView: React.FC<GroupChatViewProps> = ({
  trip,
  messages,
  introEndsAt,
  status,
  escrowSummary,
  hasReleasedCheckInFunds,
  onCommitAndPay,
  onReleaseCheckInFunds,
  onOpenReview,
}) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status !== 'Introductory' || !introEndsAt) {
      return;
    }

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [introEndsAt, status]);

  const remainingIntroMs = useMemo(() => {
    if (!introEndsAt) {
      return 0;
    }
    return Math.max(0, introEndsAt - now);
  }, [introEndsAt, now]);

  const canCommitAndPay = status === 'Introductory' && remainingIntroMs === 0;

  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-16 pt-8">
      <article className="rounded-card bg-white/95 p-6 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
        <header className="mb-5 border-b border-primary/10 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Vibe Check Hub</p>
          <h2 className="text-2xl font-bold text-primary">{trip.title}</h2>
          <p className="mt-1 text-sm text-primary/80">Status: {status}</p>
        </header>

        {status === 'Introductory' ? (
          <div className="mb-5 rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
            <p className="text-sm font-semibold text-primary">24-Hour Introductory Chat Lock</p>
            <p className="mt-1 text-sm text-primary/75">
              Escrow payment unlocks after: <span className="font-bold text-primary">{formatDuration(remainingIntroMs)}</span>
            </p>
            <button
              type="button"
              onClick={onCommitAndPay}
              disabled={!canCommitAndPay}
              className="interactive-btn mt-3 rounded-card bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              Commit & Pay
            </button>
          </div>
        ) : null}

        {escrowSummary ? (
          <div className="mb-5 rounded-card bg-primary p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/75">Escrow Summary</p>
            <p className="mt-1 text-sm">Base: ${escrowSummary.baseAmount.toFixed(2)}</p>
            <p className="text-sm">Platform Fee (5%): ${escrowSummary.platformFee.toFixed(2)}</p>
            <p className="text-sm font-semibold">Total Paid: ${escrowSummary.totalAmount.toFixed(2)}</p>
            <p className="mt-2 text-sm">
              Released to organizer: ${escrowSummary.releasedToOrganizer.toFixed(2)}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onReleaseCheckInFunds}
                disabled={hasReleasedCheckInFunds}
                className="interactive-btn rounded-card bg-success px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {hasReleasedCheckInFunds ? 'Check-In Released' : 'Check-In & Release 50%'}
              </button>
              <button
                type="button"
                onClick={onOpenReview}
                className="interactive-btn rounded-card border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
              >
                Open Review System
              </button>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {messages.map((message) => (
            <div key={message.id} className={message.isCurrentUser ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  message.isCurrentUser
                    ? 'max-w-[85%] rounded-card bg-accent px-4 py-3 text-white'
                    : 'max-w-[85%] rounded-card bg-background/80 px-4 py-3 text-primary ring-1 ring-primary/10'
                }
              >
                <p className="text-xs font-semibold opacity-80">{message.sender}</p>
                <p className="mt-1 text-sm leading-relaxed">{message.content}</p>
                <p className="mt-1 text-right text-[11px] opacity-70">{message.sentAt}</p>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
};

export default GroupChatView;
