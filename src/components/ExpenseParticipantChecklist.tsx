import React from 'react';
import { motion } from 'framer-motion';
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
    <div className="rounded-3xl border border-white/20 bg-white/80 p-5 shadow-xl shadow-slate-950/10 backdrop-blur-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/55">
            <Users className="h-3.5 w-3.5" />
            Included Members
          </div>
          <h5 className="mt-3 text-lg font-bold text-primary">{title}</h5>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-primary/60">{helperText}</p>
        </div>

        <div className="self-start rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-primary/70">
          {selectedCountLabel}
        </div>
      </div>

      <div className="mt-5 space-y-3">
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
            className={`relative flex w-full items-center gap-4 overflow-hidden rounded-[28px] px-4 py-4 text-left shadow-lg shadow-slate-950/8 transition ${
              member.isSelected
                ? 'border border-success/30 bg-[linear-gradient(145deg,rgba(240,250,245,0.98),rgba(244,241,222,0.95))]'
                : 'border border-white/20 bg-white/82'
            } ${member.isCurrentUser ? 'cursor-default' : 'cursor-pointer'} ${
              member.isSelected ? 'ring-2 ring-success/30' : ''
            }`}
            animate={{ scale: member.isSelected ? 1.01 : 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 18 }}
          >
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary shadow-inner shadow-white/60">
              {member.avatar ? (
                <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
              ) : (
                member.name.charAt(0).toUpperCase()
              )}
              {member.isCurrentUser ? (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white shadow-md">
                  Paid
                </span>
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-primary">{member.name}</p>
                <span className="rounded-full bg-primary/6 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/45">
                  {member.isCurrentUser ? 'Payer' : member.isHost ? 'Host' : 'Traveler'}
                </span>
              </div>
              <p className={`mt-1 text-xs leading-5 ${member.isSelected ? 'text-primary/70' : 'text-primary/48'}`}>{member.detail}</p>
            </div>

            <div className="shrink-0">
              {member.isCurrentUser ? (
                <div className="inline-flex items-center rounded-xl bg-primary/8 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/55">
                  Paid
                </div>
              ) : (
                <motion.div
                  className="inline-flex min-w-[106px] items-center justify-center rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em]"
                  animate={{
                    backgroundColor: member.isSelected ? 'rgba(129,178,154,0.18)' : 'rgba(61,64,91,0.06)',
                    color: member.isSelected ? 'rgb(47,96,77)' : 'rgba(61,64,91,0.55)',
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {member.isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                    {member.isSelected ? 'Included' : 'Excluded'}
                  </span>
                </motion.div>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default ExpenseParticipantChecklist;
