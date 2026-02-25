interface Action {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
}

interface HoverActionBarProps {
  actions: Action[];
}

export default function HoverActionBar({ actions }: HoverActionBarProps) {
  return (
    <div className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
      <div className="flex items-center gap-0.5 bg-[var(--bg-secondary)] rounded-md shadow-md border border-[var(--border-primary)] px-1 py-0.5">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            title={action.label}
            className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded text-xs"
          >
            {action.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
