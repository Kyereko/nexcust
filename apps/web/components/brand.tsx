/**
 * NEXCUST wordmark. "NEX" in Deep Forest Green, "CUST" in Muted Gold, beside a geometric mark:
 * two institution nodes joined through one shared node (connected institutions, one trusted record).
 * `inverse` is the lockup for the green navigation (NEX in warm white). No gradients, shadows or insignia.
 */
export function Symbol({ size = 28, inverse = false }: { size?: number; inverse?: boolean }) {
  const node = inverse ? '#FAFAF7' : '#174D38';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M9 16 L23 8.5 M9 16 L23 23.5 M23 8.5 L23 23.5" stroke={node} strokeWidth="2" strokeLinecap="round" opacity={inverse ? 0.5 : 0.35} />
      <circle cx="9" cy="16" r="4" fill="#C5A34A" />
      <circle cx="23" cy="8.5" r="3.5" fill={node} />
      <circle cx="23" cy="23.5" r="3.5" fill={node} />
    </svg>
  );
}

export function Wordmark({ inverse = false, size = 'md' }: { inverse?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const text = { sm: 'text-lg', md: 'text-xl', lg: 'text-4xl' }[size]; const sym = { sm: 22, md: 26, lg: 44 }[size];
  return (
    <span className="inline-flex items-center gap-2" aria-label="NEXCUST">
      <Symbol size={sym} inverse={inverse} />
      <span className={`${text} font-semibold tracking-[0.08em]`} aria-hidden="true"><span className={inverse ? 'text-canvas' : 'text-brand'}>NEX</span><span className="text-gold">CUST</span></span>
    </span>
  );
}

export const TAGLINE = 'Connected Institutions. Trusted Records.';
