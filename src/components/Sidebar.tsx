type ActiveView = 'feed' | 'dashboard';

type SidebarProps = {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
};

const links: { id: ActiveView; label: string; helper: string }[] = [
  { id: 'feed', label: 'Main Feed', helper: 'Social trip posts' },
  { id: 'dashboard', label: 'Dashboard', helper: 'Analytics + wallet' },
];

function Sidebar({ activeView, onChangeView }: SidebarProps) {
  return (
    <aside className="rounded-card border border-primary/10 bg-white/90 p-4 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/65">Navigation</p>
      <nav className="mt-3 space-y-2">
        {links.map((link) => {
          const isActive = activeView === link.id;
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onChangeView(link.id)}
              className={
                isActive
                  ? 'interactive-btn w-full rounded-card border border-primary/20 bg-primary px-3 py-2 text-left text-background'
                  : 'interactive-btn w-full rounded-card border border-primary/10 bg-background/70 px-3 py-2 text-left text-primary'
              }
            >
              <p className="text-sm font-semibold">{link.label}</p>
              <p className={isActive ? 'text-xs text-background/80' : 'text-xs text-primary/70'}>{link.helper}</p>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
