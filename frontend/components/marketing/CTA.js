import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

const CORNERS = [
  { top: -1, left: -1, borderTop: '2px solid #F97316', borderLeft: '2px solid #F97316', borderRadius: '24px 0 0 0' },
  { top: -1, right: -1, borderTop: '2px solid #F97316', borderRight: '2px solid #F97316', borderRadius: '0 24px 0 0' },
  { bottom: -1, left: -1, borderBottom: '2px solid #F97316', borderLeft: '2px solid #F97316', borderRadius: '0 0 0 24px' },
  { bottom: -1, right: -1, borderBottom: '2px solid #F97316', borderRight: '2px solid #F97316', borderRadius: '0 0 24px 0' },
];

export default function CTA() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();
  const redirectTimer = useRef(null);

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || submitted) return;
    setSubmitted(true);
    redirectTimer.current = setTimeout(() => router.push(`/signup?email=${encodeURIComponent(email)}`), 800);
  };

  return (
    <section style={{ padding: '96px 40px 120px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', bottom: -100, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 400, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(249,115,22,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          maxWidth: 680, margin: '0 auto', position: 'relative',
          background: '#111113', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24, padding: '64px 48px',
          boxShadow: '0 0 80px rgba(249,115,22,0.08)',
        }}
      >
        {CORNERS.map((style, i) => (
          <div key={i} style={{ position: 'absolute', width: 20, height: 20, ...style }} />
        ))}

        <div className="mb-6 inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-[5px] text-xs font-medium text-orange-500">
          No credit card required
        </div>

        <h2
          className="mb-4 font-display text-4xl font-bold text-neutral-50 md:text-[44px]"
          style={{ lineHeight: 1.15, letterSpacing: '-0.02em' }}
        >
          Stop Hiring.
          <br />
          Start Scaling.
        </h2>
        <p className="mb-9 text-[17px] leading-relaxed text-neutral-500">
          Get a live demo and see your AI team book its first call within 48 hours.
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-[420px] gap-2.5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@company.com"
              required
              className="flex-1 rounded-[9px] border border-white/10 bg-[#0A0A0B] px-4 py-[13px] text-[15px] text-neutral-50 outline-none transition-colors focus:border-orange-500"
            />
            <button
              type="submit"
              className="whitespace-nowrap rounded-[9px] bg-orange-500 px-[22px] py-[13px] text-[15px] font-semibold text-neutral-950 shadow-glow transition-colors hover:bg-orange-400"
            >
              Book Demo →
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-center gap-2 text-base font-medium text-green-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            We&rsquo;ll be in touch shortly.
          </div>
        )}

        <p className="mt-4 text-xs text-neutral-700">Join 500+ companies already on autopilot</p>
      </div>
    </section>
  );
}
