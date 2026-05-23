
const SignalHealthBadge = ({ health }: { health?: string }) => {
  const isOnline = health !== 'broken';
  return (
    <div className={`flex gap-1 items-center bg-black/60 px-2 py-1 rounded text-[8px] font-black tracking-widest border border-[var(--md-sys-color-outline-variant)]`}>
      <div className={`w-1.5 h-1.5 rounded-full ${!isOnline ? 'bg-red-500 shadow-[0_0_5px_#ef4444]' : 'bg-brand-green animate-pulse shadow-[0_0_5px_#22c55e]'}`} />
      {!isOnline ? 'SIGNAL_IO_LOST' : 'NODE_STABLE'}
    </div>
  );
};

export default SignalHealthBadge;
