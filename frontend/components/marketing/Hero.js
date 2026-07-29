import Link from 'next/link';

const AVATAR_COLORS = ['#F97316', '#14B8A6', '#3B82F6', '#22C55E', '#A855F7'];

export default function Hero() {
  return (
    <section
      style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '120px 40px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0, opacity: 0.35,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M0 40L40 0M-5 5L5-5M35 45L45 35' stroke='rgba(249,115,22,0.08)' stroke-width='0.5'/%3E%3C/svg%3E")`,
        }}
      />
      <div
        style={{
          position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(249,115,22,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div className="relative mb-8 inline-flex items-center gap-[7px] rounded-full border border-orange-500/20 bg-orange-500/10 px-3.5 py-1.5 text-[13px] font-medium text-orange-500">
        <span
          style={{
            width: 6, height: 6, borderRadius: '50%', background: '#F97316',
            display: 'inline-block', animation: 'pulse-dot 2s infinite',
          }}
        />
        AI Growth Engine — Now Live
      </div>

      <h1
        className="relative font-display text-5xl font-extrabold text-neutral-50 md:text-7xl"
        style={{ lineHeight: 1.08, letterSpacing: '-0.03em', maxWidth: 820, marginBottom: 24 }}
      >
        Your AI Team Works
        <br />
        <span className="text-orange-500">24/7 On Autopilot</span>
      </h1>

      <p className="relative mb-12 max-w-[560px] text-xl leading-relaxed text-neutral-500">
        Fourdoor AI generates content, distributes it across platforms, engages your audience,
        qualifies leads, and books sales calls — completely automatically.
      </p>

      <div className="relative mb-16 flex items-center gap-3">
        <Link
          href="/signup"
          className="flex items-center gap-2 rounded-[9px] bg-orange-500 px-7 py-3.5 text-base font-semibold text-neutral-950 shadow-glow transition-all duration-200 ease-snap hover:-translate-y-0.5 hover:bg-orange-400"
          style={{ textDecoration: 'none' }}
        >
          Book a Demo
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
        <a
          href="https://ag-agent-socialmedia-9ity9frba-hamids-projects-9526ba02.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-[9px] border border-white/10 px-6 py-3.5 text-base font-medium text-neutral-400 transition-colors hover:border-white/20 hover:text-neutral-50"
          style={{ textDecoration: 'none' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          See How It Works
        </a>
      </div>

      <div className="relative flex items-center gap-4">
        <div style={{ display: 'flex' }}>
          {AVATAR_COLORS.map((c, i) => (
            <div
              key={c}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: c, border: '2px solid #0A0A0B',
                marginLeft: i > 0 ? -10 : 0, opacity: 0.85,
              }}
            />
          ))}
        </div>
        <p className="text-left text-sm leading-snug text-neutral-600">
          <span className="font-semibold text-neutral-50">500+ companies</span>
          <br />
          running on Fourdoor AI
        </p>
      </div>
    </section>
  );
}
