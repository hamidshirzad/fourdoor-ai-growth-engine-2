export default function Logo({ size = 28 }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect x="2" y="2" width="16" height="36" rx="2" stroke="#F97316" strokeWidth="1.5" />
        <line x1="10" y1="2" x2="10" y2="38" stroke="#F97316" strokeWidth="1.5" />
        <line x1="2" y1="20" x2="18" y2="20" stroke="#F97316" strokeWidth="1.5" />
      </svg>
      <span style={{ font: "700 17px/1 'Syne',sans-serif", color: '#FAFAFA', letterSpacing: '-0.02em' }}>
        fourdoor<span style={{ color: '#F97316' }}>ai</span>
      </span>
    </span>
  );
}
