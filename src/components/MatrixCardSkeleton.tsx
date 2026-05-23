
const MatrixCardSkeleton = () => {
  return (
    <div className="bento-card p-4 bg-white/[0.02] rounded-3xl border border-[var(--md-sys-color-outline-variant)] space-y-4 animate-pulse h-[184px]">
      <div className="flex justify-between items-start">
        <div className="w-10 h-10 bg-[var(--md-sys-color-surface-container)] rounded-lg border border-[var(--md-sys-color-outline-variant)]" />
        <div className="flex flex-col items-end gap-1.5">
          <div className="h-3 w-16 bg-white/10 rounded" />
          <div className="h-2.5 w-8 bg-[var(--md-sys-color-surface-container)] rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-3/4 bg-white/10 rounded" />
        <div className="h-8 w-full bg-[var(--md-sys-color-surface-container)] rounded-lg border border-[var(--md-sys-color-outline-variant)]" />
        <div className="h-3 w-1/2 bg-[var(--md-sys-color-surface-container)] rounded" />
      </div>
    </div>
  );
};

export default MatrixCardSkeleton;
