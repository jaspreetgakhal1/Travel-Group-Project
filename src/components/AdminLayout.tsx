import { useState, type ReactNode } from 'react';
import {
  Activity,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Route,
  ScrollText,
  ShieldCheck,
  UserCircle2,
  Users,
} from 'lucide-react';

type AdminLayoutNavKey = 'dashboard' | 'users' | 'trips' | 'logs';

type AdminLayoutProps = {
  adminName: string;
  adminEmail: string;
  breadcrumbs: string[];
  activeNav: AdminLayoutNavKey;
  onOpenDashboard: () => void;
  onOpenUsers: () => void;
  onOpenTrips: () => void;
  onOpenLogs: () => void;
  onLogout: () => void;
  children: ReactNode;
};

const NAV_ITEMS: Array<{
  key: AdminLayoutNavKey;
  label: string;
  Icon: typeof LayoutDashboard;
}> = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'users', label: 'Users', Icon: Users },
  { key: 'trips', label: 'Trips', Icon: Route },
  { key: 'logs', label: 'Logs', Icon: ScrollText },
];

function AdminLayout({
  adminName,
  adminEmail,
  breadcrumbs,
  activeNav,
  onOpenDashboard,
  onOpenUsers,
  onOpenTrips,
  onOpenLogs,
  onLogout,
  children,
}: AdminLayoutProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navActions: Record<AdminLayoutNavKey, () => void> = {
    dashboard: onOpenDashboard,
    users: onOpenUsers,
    trips: onOpenTrips,
    logs: onOpenLogs,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
        <aside className="relative flex w-20 shrink-0 flex-col justify-between border-r border-slate-800/90 bg-slate-950 px-3 py-5 text-slate-100 sm:w-24 sm:px-4">
          <div>
            <button
              type="button"
              onClick={onOpenDashboard}
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-3xl border border-slate-700 bg-slate-900 text-xs font-black tracking-[0.22em] text-white shadow-lg shadow-black/20"
              aria-label="Open admin dashboard"
              title="Dashboard"
            >
              ADM
            </button>

            <nav className="mt-8">
              <ul className="space-y-3">
                {NAV_ITEMS.map(({ key, label, Icon }) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={navActions[key]}
                      className={
                        activeNav === key
                          ? 'mx-auto flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-slate-950 shadow-lg shadow-black/20'
                          : 'mx-auto flex h-12 w-12 items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/90 text-slate-300 transition hover:border-slate-700 hover:bg-slate-900 hover:text-white'
                      }
                      aria-label={label}
                      title={label}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileOpen((current) => !current)}
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-3xl border border-slate-700 bg-slate-900 text-slate-100 shadow-lg shadow-black/20 transition hover:border-slate-600"
              aria-label="Open admin profile controls"
              title="Admin profile"
            >
              <UserCircle2 className="h-5 w-5" />
            </button>

            {isProfileOpen ? (
              <div className="absolute bottom-16 left-0 z-30 w-64 rounded-3xl border border-slate-800 bg-slate-900 p-4 text-left text-white shadow-2xl shadow-black/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{adminName}</p>
                    <p className="truncate text-xs text-slate-400">{adminEmail || 'Admin account'}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onOpenDashboard();
                    }}
                    className="flex w-full items-center gap-2 rounded-2xl border border-slate-800 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-white transition hover:border-slate-700 hover:bg-slate-800"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Open Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout Admin
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-400">
                  {breadcrumbs.map((crumb, index) => (
                    <div key={`${crumb}-${index}`} className="flex items-center gap-2">
                      {index > 0 ? <ChevronRight className="h-4 w-4 text-slate-300" /> : null}
                      <span className={index === breadcrumbs.length - 1 ? 'text-slate-950' : 'text-slate-400'}>{crumb}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Control Mode</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  <Activity className="h-4 w-4" />
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Server Online
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout Admin
                </button>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
