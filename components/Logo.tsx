export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--bg-elev-1)" stroke="var(--border-accent)" />
      <path d="M7 21 L13 14 L17 18 L25 9" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 9 H25 V14" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="24" r="1.6" fill="var(--positive)" />
    </svg>
  );
}
