
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
} from 'lucide-react';

type ActiveView = 'feed' | 'myPosts' | 'dashboard';

type SidebarProps = {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
  userName?: string;
  profileImageDataUrl?: string | null;
  badgeProgress?: number;
  activeTripId?: string | null;
  isActiveTripLoading?: boolean;
  onOpenAIExplorer?: () => void;
  onSettingsClick?: () => void;
  onLogoutClick?: () => void;
};

type NavLink = {
  id: ActiveView;
  label: string;
  helper: string;
  Icon: LucideIcon;
};

const links: NavLink[] = [
  { id: 'feed', label: 'Main Feed', helper: 'Social trip posts', Icon: Compass },
  { id: 'myPosts', label: 'My Posts', helper: 'Only your trip posts', Icon: FileText },
  { id: 'dashboard', label: 'Dashboard', helper: 'Analytics + wallet', Icon: LayoutDashboard },
];

const getSafeProgress = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function Sidebar({
  activeView,
  onChangeView,
  userName = 'Traveler',
  profileImageDataUrl = null,
  badgeProgress = 68,
  activeTripId = null,
  isActiveTripLoading = false,
  onOpenAIExplorer,
  onSettingsClick,
  onLogoutClick,
}: SidebarProps) {
  const [isMobile, setIsMobile] = useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  const [isIconOnly, setIsIconOnly] = useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncViewport = () => {
      const mobileView = window.innerWidth < 768;
      setIsMobile(mobileView);
      if (!mobileView) {
        setIsIconOnly(false);
      }
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  const profileInitial = useMemo(() => userName.trim().charAt(0).toUpperCase() || 'T', [userName]);
  const profileImageSrc = useMemo(() => {
    if (typeof profileImageDataUrl !== 'string') {
      return null;
    }

    const normalizedValue = profileImageDataUrl.trim();
    return normalizedValue || null;
  }, [profileImageDataUrl]);
  const safeProgress = getSafeProgress(badgeProgress);
  const canOpenAIExplorer = Boolean(activeTripId && onOpenAIExplorer);
  const shouldShowAIExplorer = Boolean(onOpenAIExplorer);

  return (
    <aside
      className={`relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-r-2xl border-r border-[#3D405B]/10 bg-[#F4F1DE]/80 py-5 backdrop-blur-lg ${
        isIconOnly ? 'px-3 max-md:w-[92px]' : 'px-6'
      }`}
    >
      {isMobile ? (
        <button
          type="button"
          onClick={() => setIsIconOnly((previous) => !previous)}
          className="interactive-btn mb-4 inline-flex h-9 w-9 items-center justify-center self-end rounded-xl border border-[#3D405B]/15 bg-white/60 text-[#3D405B]"
          aria-label={isIconOnly ? 'Expand sidebar labels' : 'Collapse sidebar labels'}
        >
          {isIconOnly ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      ) : null}

      <section
        className={`rounded-2xl border border-[#3D405B]/10 bg-white/35 py-4 ${
          isIconOnly ? 'px-2 text-center' : 'px-4'
        }`}
      >
        <div className={`flex items-center ${isIconOnly ? 'justify-center' : 'gap-3'}`}>
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#3D405B] text-sm font-bold text-[#F4F1DE]">
            {profileImageSrc ? (
              <img src={profileImageSrc} alt={`${userName} profile`} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              profileInitial
            )}
          </div>
          {!isIconOnly ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#3D405B]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {userName}
              </p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#81B29A]/20 px-2 py-0.5 text-[11px] font-semibold text-[#2F6A5A]">
                <BadgeCheck className="h-3.5 w-3.5" />
                Elite Traveler
              </span>
            </div>
          ) : null}
        </div>

        {!isIconOnly ? (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] font-medium text-[#3D405B]/80">
              <span style={{ fontFamily: 'Inter, sans-serif' }}>Next Badge Goal</span>
              <span style={{ fontFamily: 'Inter, sans-serif' }}>{safeProgress}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#3D405B]/12">
              <motion.div
                className="h-full rounded-full bg-[#E07A5F]"
                initial={{ width: 0 }}
                animate={{ width: `${safeProgress}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 24 }}
              />
            </div>
          </div>
        ) : null}
      </section>

      <nav className="mt-5 space-y-4">
        {links.map(({ id, label, helper, Icon }) => {
          const isActive = activeView === id;

          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => onChangeView(id)}
              initial="rest"
              animate="rest"
              whileHover="hover"
              variants={{
                rest: { scale: 1 },
                hover: { scale: 1.02 },
              }}
              whileTap={{ scale: 0.99 }}
              className={`group relative flex w-full overflow-hidden rounded-2xl border px-3 py-3 text-left ${
                isIconOnly ? 'justify-center' : 'items-center gap-3'
              } ${
                isActive
                  ? 'border-[#3D405B]/20 bg-[#3D405B]/10 shadow-[0_8px_20px_-16px_rgba(61,64,91,0.8)]'
                  : 'border-[#3D405B]/10 bg-white/40'
              }`}
              style={{ willChange: 'transform' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, mass: 0.4 }}
              whileFocus={{ scale: 1.02 }}
              title={isIconOnly ? label : undefined}
            >
              <motion.span
                className="pointer-events-none absolute inset-0 bg-[#3D405B]/10"
                style={{ originX: 0 }}
                variants={{
                  rest: { scaleX: isActive ? 1 : 0, opacity: isActive ? 1 : 0 },
                  hover: { scaleX: 1, opacity: 1 },
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 22, mass: 0.45 }}
              />
              <motion.span
                className="pointer-events-none absolute inset-y-2 left-1 w-1 rounded-full bg-[#E07A5F] shadow-[0_0_12px_rgba(224,122,95,0.6)]"
                animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : -4 }}
                transition={{ duration: 0.2 }}
              />
              <span className="relative z-10 flex items-center justify-center text-[#3D405B]">
                <Icon className="h-6 w-6" />
              </span>
              {!isIconOnly ? (
                <span className="relative z-10 min-w-0">
                  <p className="truncate text-[15px] font-bold text-[#3D405B]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {label}
                  </p>
                  <p className="truncate text-xs font-medium text-[#3D405B]/70" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {helper}
                  </p>
                </span>
              ) : null}
            </motion.button>
          );
        })}

        {isActiveTripLoading ? (
          <div
            className={`flex animate-pulse rounded-2xl border border-[#3D405B]/10 bg-white/40 px-3 py-3 ${
              isIconOnly ? 'justify-center' : 'items-center gap-3'
            }`}
            aria-hidden="true"
          >
            <span className="h-6 w-6 rounded-xl bg-[#3D405B]/10" />
            {!isIconOnly ? <span className="h-3 w-24 rounded-full bg-[#3D405B]/10" /> : null}
          </div>
        ) : shouldShowAIExplorer ? (
          <motion.button
            type="button"
            onClick={canOpenAIExplorer ? onOpenAIExplorer : undefined}
            disabled={!canOpenAIExplorer}
            initial="rest"
            animate="rest"
            whileHover={canOpenAIExplorer ? 'hover' : 'rest'}
            variants={{
              rest: { scale: 1 },
              hover: { scale: 1.02 },
            }}
            whileTap={canOpenAIExplorer ? { scale: 0.99 } : undefined}
            className={`group relative flex w-full overflow-hidden rounded-2xl border border-[#81B29A]/30 bg-[#81B29A]/12 px-3 py-3 text-left ${
              isIconOnly ? 'justify-center' : 'items-center gap-3'
            } ${canOpenAIExplorer ? '' : 'cursor-not-allowed opacity-75'}`}
            style={{ willChange: 'transform' }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, mass: 0.4 }}
            whileFocus={canOpenAIExplorer ? { scale: 1.02 } : undefined}
            title={isIconOnly ? (canOpenAIExplorer ? 'AI Explorer' : 'AI Explorer requires an active trip') : undefined}
          >
            <motion.span
              className="pointer-events-none absolute inset-0 bg-[#81B29A]/18"
              style={{ originX: 0 }}
              variants={{
                rest: { scaleX: 0, opacity: 0 },
                hover: { scaleX: 1, opacity: 1 },
              }}
              transition={{ type: 'spring', stiffness: 260, damping: 22, mass: 0.45 }}
            />
            <span
              className={`relative z-10 flex items-center justify-center ${
                canOpenAIExplorer ? 'text-[#2F6A5A]' : 'text-[#2F6A5A]/60'
              }`}
            >
              <Sparkles className="h-6 w-6" />
            </span>
            {!isIconOnly ? (
              <span className="relative z-10 min-w-0">
                <p
                  className={`truncate text-[15px] font-bold ${
                    canOpenAIExplorer ? 'text-[#2F6A5A]' : 'text-[#2F6A5A]/70'
                  }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  AI Explorer
                </p>
                <p className="truncate text-xs font-medium text-[#2F6A5A]/75" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {canOpenAIExplorer ? 'Open your active trip assistant' : 'Available once an active trip is loaded'}
                </p>
              </span>
            ) : null}
          </motion.button>
        ) : null}
      </nav>

      <div className="mt-auto border-t border-[#3D405B]/10 pt-4">
        <div className="space-y-3">
          <button
            type="button"
            onClick={onSettingsClick}
            className={`interactive-btn flex w-full items-center rounded-xl border border-[#3D405B]/12 bg-white/45 px-3 py-2.5 text-[#3D405B] ${
              isIconOnly ? 'justify-center' : 'gap-2'
            }`}
            title={isIconOnly ? 'Settings' : undefined}
          >
            <Settings className="h-6 w-6" />
            {!isIconOnly ? (
              <span className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                Settings
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={onLogoutClick}
            className={`interactive-btn flex w-full items-center rounded-xl border border-[#E07A5F]/25 bg-[#E07A5F]/10 px-3 py-2.5 text-[#8C4633] ${
              isIconOnly ? 'justify-center' : 'gap-2'
            }`}
            title={isIconOnly ? 'Log Out' : undefined}
          >
            <LogOut className="h-6 w-6" />
            {!isIconOnly ? (
              <span className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                Log Out
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

