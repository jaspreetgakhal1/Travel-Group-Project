import React from 'react';
import { navItems } from '../data/navItems';
import type { NavIcon } from '../types/dashboard';
import ChatInterface from './ChatInterface';
import ExpenseTracker from './ExpenseTracker';

const renderNavIcon = (icon: NavIcon): React.ReactNode => {
  if (icon === 'trips') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 8l9-5 9 5-9 5-9-5z" />
        <path d="M3 16l9 5 9-5" />
        <path d="M3 12l9 5 9-5" />
      </svg>
    );
  }

  if (icon === 'safety') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
        <path d="M9.5 12.5l1.8 1.8 3.4-3.8" />
      </svg>
    );
  }

  if (icon === 'wallet') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M16 12h3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 12a8 8 0 1116 0v4a2 2 0 01-2 2h-2v-5h4" />
      <path d="M4 18h4v-5H4" />
    </svg>
  );
};

const UserDashboard: React.FC = () => {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-6" id="trips">
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-card bg-white p-4 shadow-sm ring-1 ring-primary/10">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-primary/70">Workspace</p>
          <nav>
            <ul className="space-y-2">
              {navItems.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={
                      index === 0
                        ? 'flex w-full items-center gap-3 rounded-card bg-primary px-3 py-2.5 text-sm font-semibold text-background'
                        : 'flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-sm font-semibold text-primary transition hover:bg-background'
                    }
                  >
                    {renderNavIcon(item.icon)}
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="rounded-card bg-white p-5 shadow-sm ring-1 ring-primary/10">
          <header className="mb-5 border-b border-primary/10 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Group Hub</p>
            <h2 className="text-2xl font-bold text-primary">Plan, Chat, and Split Costs</h2>
          </header>

          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <ChatInterface />
            <ExpenseTracker />
          </div>
        </main>
      </div>
    </section>
  );
};

export default UserDashboard;
