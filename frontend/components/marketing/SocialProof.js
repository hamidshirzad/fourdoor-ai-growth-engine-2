import { useEffect, useState } from 'react';

const TESTIMONIALS = [
  {
    quote: 'We replaced our entire SDR team with Fourdoor. Pipeline is up 340% in 60 days.',
    name: 'Marcus Chen',
    role: 'VP of Sales, TechFlow',
    initials: 'MC', color: '#F97316',
  },
  {
    quote: 'The content is indistinguishable from human-written. Our engagement tripled week one.',
    name: 'Sarah Okonkwo',
    role: 'Head of Growth, Verdi Labs',
    initials: 'SO', color: '#14B8A6',
  },
  {
    quote: "10 booked calls in the first week. I didn't touch a single thing. It just works.",
    name: 'Daniel Park',
    role: 'Founder, Arclight SaaS',
    initials: 'DP', color: '#3B82F6',
  },
];

const LOGOS = ['TechFlow', 'Verdi Labs', 'Arclight', 'Momentum', 'Capsule', 'NorthStar'];

export default function SocialProof() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % TESTIMONIALS.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      id="social-proof"
      style={{
        padding: '96px 40px',
        background: 'linear-gradient(180deg, transparent 0%, rgba(249,115,22,0.03) 50%, transparent 100%)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <div className="mb-7 text-xs font-medium uppercase tracking-[0.1em] text-neutral-700">
          Trusted by fast-growing teams
        </div>
        <div className="flex flex-wrap items-center justify-center gap-10">
          {LOGOS.map((l) => (
            <span key={l} className="font-display text-[15px] font-semibold text-neutral-700">
              {l}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          width: 1, height: 48, margin: '0 auto 64px',
          background: 'linear-gradient(to bottom,transparent,rgba(255,255,255,0.1),transparent)',
        }}
      />

      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ position: 'relative', minHeight: 160 }}>
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              style={{
                position: i === 0 ? 'relative' : 'absolute', top: 0, left: 0, right: 0,
                opacity: active === i ? 1 : 0,
                transform: active === i ? 'translateY(0)' : 'translateY(8px)',
                transition: 'all 400ms cubic-bezier(0.16,1,0.3,1)',
                pointerEvents: active === i ? 'auto' : 'none',
              }}
            >
              <svg width="28" height="20" viewBox="0 0 28 20" fill="none" style={{ marginBottom: 20, opacity: 0.3 }}>
                <path d="M0 20V12C0 5.373 4.477 1.12 13.43 0l1.14 2.4C10.1 3.587 7.88 5.84 7.88 9.36H12V20H0zm16 0V12c0-6.627 4.477-10.88 13.43-11.6L30.57 2.8C26.1 3.987 23.88 6.24 23.88 9.36H28V20H16z" fill="#F97316" />
              </svg>
              <p
                className="mb-6 font-display text-[22px] text-neutral-50"
                style={{ lineHeight: 1.5, letterSpacing: '-0.01em' }}
              >
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center justify-center gap-3">
                <div
                  className="flex items-center justify-center rounded-full font-display text-sm font-semibold text-neutral-950"
                  style={{ width: 40, height: 40, background: t.color }}
                >
                  {t.initials}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-neutral-50">{t.name}</div>
                  <div className="mt-1 text-[13px] text-neutral-600">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center gap-2">
          {TESTIMONIALS.map((t, i) => (
            <button
              key={t.name}
              type="button"
              aria-label={`Show testimonial ${i + 1}`}
              onClick={() => setActive(i)}
              style={{
                width: active === i ? 24 : 8, height: 8, borderRadius: 9999,
                background: active === i ? '#F97316' : 'rgba(255,255,255,0.15)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 250ms cubic-bezier(0.16,1,0.3,1)',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
