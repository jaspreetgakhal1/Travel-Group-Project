
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import ChatRoom from './ChatRoom';
import FastImage from './FastImage';

import type { Trip } from '../types/trip';

type TripCardProps = {
  trip: Trip;
  currentUserId?: string | null;
  currentUserName?: string;
  onJoin?: (trip: Trip) => void;
  onManageRequests?: (trip: Trip) => void;
};

const tripDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const TripCard: React.FC<TripCardProps> = ({
  trip,
  currentUserId = null,
  currentUserName = 'Traveler',
  onJoin,
  onManageRequests,
}) => {
  const isHostView = Boolean(currentUserId && trip.hostId && trip.hostId === currentUserId);
  const participantIds = Array.isArray(trip.participantIds) ? trip.participantIds : [];
  const isParticipant = Boolean(currentUserId && participantIds.includes(currentUserId));
  const maxParticipants =
    typeof trip.maxParticipants === 'number' && trip.maxParticipants > 0 ? trip.maxParticipants : null;
  const spotsFilled = typeof trip.spotsFilled === 'number' ? trip.spotsFilled : participantIds.length;
  const isTripFull = Boolean(maxParticipants !== null && spotsFilled >= maxParticipants);
  const pendingRequestCount = trip.pendingRequestCount ?? 0;
  const [isChatOpen, setIsChatOpen] = useState(false);
  const canOpenChat = isHostView || isParticipant;
  const formattedStartDate =
    typeof trip.startDate === 'string' && trip.startDate.trim()
      ? (() => {
          const parsedDate = new Date(trip.startDate);
          return Number.isNaN(parsedDate.getTime()) ? '' : tripDateFormatter.format(parsedDate);
        })()
      : '';

  const openWhatsAppIfAvailable = (): boolean => {
    if (typeof window === 'undefined') {
      return false;
    }

    const countryDigits = (trip.hostCountryCode ?? '').replace(/\D/g, '');
    const mobileDigits = (trip.hostMobileNumber ?? '').replace(/\D/g, '');
    if (!mobileDigits) {
      return false;
    }

    const phoneNumber = mobileDigits.startsWith(countryDigits) ? mobileDigits : `${countryDigits}${mobileDigits}`;
    const message = `Hi ${trip.hostName}, I am interested in "${trip.title}" on SplitNGo.`;
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    return true;
  };

  return (
    <>
      <article className="relative overflow-hidden rounded-card bg-white shadow-sm ring-1 ring-primary/10">
        <div className="relative h-52 w-full overflow-hidden">
          <FastImage
            src={trip.imageUrl}
            alt={trip.title}
            className="h-full w-full object-cover"
          />
          <span className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-background">
            {trip.matchPercentage}% Match
          </span>
        </div>

        <div className="space-y-3 p-5 text-primary">
          <h3 className="text-lg font-semibold leading-snug">{trip.title}</h3>
          {formattedStartDate ? (
            <p className="text-sm font-medium text-primary/75">Starts {formattedStartDate}</p>
          ) : null}

          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Host: {trip.hostName}</span>
            {trip.isVerified ? (
              <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs font-semibold text-primary ring-1 ring-success/40">
                Verified
              </span>
            ) : null}
          </div>

          <p className="text-sm text-primary/80">
            Price per share: <span className="text-base font-bold text-primary">${trip.priceShare}</span>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {!isHostView ? (
              <>
                {isParticipant ? (
                  <div className="flex w-full items-center gap-2">
                    <span className="inline-flex flex-1 items-center justify-center rounded-card border border-success/40 bg-success/20 px-4 py-2.5 text-sm font-semibold text-primary">
                      Joined Trip
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (openWhatsAppIfAvailable()) {
                          return;
                        }
                        if (typeof window !== 'undefined') {
                          window.history.pushState(
                            { tripId: trip.id, tripTitle: trip.title },
                            '',
                            `/chat/${encodeURIComponent(trip.id)}`,
                          );
                        }
                        setIsChatOpen(true);
                      }}
                      className="interactive-btn inline-flex items-center gap-1 rounded-card border border-primary/20 bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary"
                      aria-label={`Open chat for ${trip.title}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Chat
                    </button>
                  </div>
                ) : isTripFull ? (
                  <span className="inline-flex w-full items-center justify-center rounded-card border border-[#E07A5F]/35 bg-[#F4F1DE] px-4 py-2.5 text-sm font-semibold text-[#8C4633]">
                    Trip Full
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onJoin?.(trip)}
                    className="w-full rounded-card bg-accent px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
                  >
                    Join Request
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => onManageRequests?.(trip)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-card border border-[#E07A5F]/35 bg-[#F4F1DE] px-4 py-2.5 text-sm font-semibold text-[#8C4633]"
              >
                Manage Requests
                <span className="rounded-full bg-[#E07A5F]/20 px-2 py-0.5 text-xs font-bold text-[#8C4633]">
                  {pendingRequestCount}
                </span>
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {canOpenChat && !isParticipant ? (
            <motion.div
              key="trip-chat-icon"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="group absolute bottom-3 right-3 z-10"
            >
              <motion.button
                type="button"
                onClick={() => {
                  if (openWhatsAppIfAvailable()) {
                    return;
                  }
                  if (typeof window !== 'undefined') {
                    window.history.pushState(
                      { tripId: trip.id, tripTitle: trip.title },
                      '',
                      `/chat/${encodeURIComponent(trip.id)}`,
                    );
                  }
                  setIsChatOpen(true);
                }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                className="interactive-btn inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/25 bg-white text-primary shadow-lg"
                aria-label={`Open chat for ${trip.title}`}
              >
                <MessageCircle className="h-5 w-5" />
              </motion.button>
              <span className="pointer-events-none absolute -top-10 right-0 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                Join Trip Discussion.
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </article>

      <ChatRoom
        isOpen={isChatOpen}
        roomId={trip.id}
        tripTitle={trip.title}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        isHost={isHostView}
        onClose={() => setIsChatOpen(false)}
      />
    </>
  );
};

export default TripCard;

