
const ListCardSkeleton = () => {
  return (
    <div className="p-4 bg-white/[0.02] rounded-3xl border border-[var(--md-sys-color-outline-variant)] flex items-center gap-6 overflow-hidden h-[116px] animate-pulse">
      <div className="w-12 h-12 bg-[var(--md-sys-color-surface-container)] rounded-xl border border-[var(--md-sys-color-outline-variant)] shrink-0" />
      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-10 bg-white/10 rounded-md" />
          <div className="h-3.5 w-16 bg-white/10 rounded-md" />
        </div>
        <div className="h-4 w-1/2 bg-white/10 rounded-md" />
        <div className="h-3 w-5/6 bg-[var(--md-sys-color-surface-container)] rounded-md" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 bg-[var(--md-sys-color-surface-container)] rounded-xl border border-[var(--md-sys-color-outline-variant)]" />
        <div className="w-8 h-8 bg-[var(--md-sys-color-surface-container)] rounded-xl border border-[var(--md-sys-color-outline-variant)]" />
        <div className="w-8 h-8 bg-[var(--md-sys-color-surface-container)] rounded-xl border border-[var(--md-sys-color-outline-variant)]" />
      </div>
    </div>
  );
};

export default ListCardSkeleton;
