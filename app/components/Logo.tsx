// Brand mark: three memory nodes joined by a rising flow line - "your learning, connected."
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="rf-brand" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#5d6dfa" />
          <stop offset="1" stopColor="#b07cff" />
        </linearGradient>
      </defs>
      <path
        d="M6 24C13 24 12 9 19 9L26 9"
        stroke="url(#rf-brand)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="6" cy="24" r="3.2" fill="url(#rf-brand)" />
      <circle cx="26" cy="9" r="3.2" fill="url(#rf-brand)" />
      <circle cx="15.5" cy="14" r="2.1" fill="url(#rf-brand)" opacity="0.65" />
    </svg>
  );
}
