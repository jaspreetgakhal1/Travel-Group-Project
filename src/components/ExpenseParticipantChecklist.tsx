import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Users } from 'lucide-react';

export type ExpenseParticipantChecklistItem = {
  id: string;
  name: string;
  avatar: string | null;
  isCurrentUser: boolean;
  isHost: boolean;
  isSelected: boolean;
  detail: string;
};

type ExpenseParticipantChecklistProps = {
  helperText: string;
  items: ExpenseParticipantChecklistItem[];
  onToggle: (memberId: string) => void;
  selectedCountLabel: string;
  title: string;
};

const ExpenseParticipantChecklist: React.FC<ExpenseParticipantChecklistProps> = ({
  helperText,
  items,
  onToggle,
  selectedCountLabel,
  title,
}) => {
  return (
    <div className="rounded-[32px] bg-white/70 p-5 shadow-xl shadow-slate-950/10 backdrop-blur-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/55">
            <Users className="h-3.5 w-3.5" />
            Included Members
          </div>
          <h5 className="mt-3 text-lg font-bold text-primary">{title}</h5>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-primary/60">{helperText}</p>
        </div>

        <div className="self-start rounded-full bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary/65">
          {selectedCountLabel}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((member) => (
          <motion.button
            key={member.id}
            type="button"
            layout
            whileHover={member.isCurrentUser ? undefined : { y: -2 }}
            whileTap={member.isCurrentUser ? undefined : { scale: 0.98 }}
            onClick={() => onToggle(member.id)}
            disabled={member.isCurrentUser}
            aria-pressed={member.isSelected}
            className={`relative overflow-hidden rounded-[28px] px-4 py-4 text-left shadow-lg shadow-slate-950/8 transition ${
              member.isSelected
                ? 'bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(244,241,222,0.95))]'
                : 'bg-white/88'
            } ${member.isCurrentUser ? 'cursor-default' : 'cursor-pointer'} ${
              member.isSelected ? 'ring-2 ring-success/35' : 'ring-1 ring-primary/6'
            }`}
            animate={{ scale: member.isSelected ? 1.05 : 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 18 }}
          >
            <div className="flex items-start gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary shadow-inner shadow-white/60">
                {member.avatar ? (
                  <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                ) : (
                  member.name.charAt(0).toUpperCase()
                )}
                <AnimatePresence>
                  {member.isSelected ? (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.4, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: 6 }}
                      transition={{ type: 'spring', stiffness: 340, damping: 20 }}
                      className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-white shadow-lg"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-primary">{member.name}</p>
                  <span className="rounded-full bg-primary/6 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/45">
                    {member.isCurrentUser ? 'You paid' : member.isHost ? 'Host' : 'Traveler'}
                  </span>
                </div>
                <p className={`mt-2 text-xs leading-5 ${member.isSelected ? 'text-primary/70' : 'text-primary/48'}`}>
                  {member.detail}
                </p>
              </div>
            </div>

            {!member.isCurrentUser ? (
              <motion.div
                className="mt-4 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
                animate={{
                  backgroundColor: member.isSelected ? 'rgba(129,178,154,0.16)' : 'rgba(61,64,91,0.06)',
                  color: member.isSelected ? 'rgb(47,96,77)' : 'rgba(61,64,91,0.55)',
                }}
                transition={{ duration: 0.2 }}
              >
                {member.isSelected ? 'Included' : 'Tap to include'}
              </motion.div>
            ) : null}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default ExpenseParticipantChecklist;
