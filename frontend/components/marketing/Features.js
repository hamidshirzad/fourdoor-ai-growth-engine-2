import { motion } from 'motion/react';

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
    color: '#F97316', bg: 'rgba(249,115,22,0.1)',
    title: 'Content Generation',
    body: 'AI writes high-converting posts, emails, and ads — calibrated to your brand voice and ICP.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
      </svg>
    ),
    color: '#14B8A6', bg: 'rgba(20,184,166,0.1)',
    title: 'Multi-Platform Distribution',
    body: 'Publishes to LinkedIn, Twitter/X, Instagram, and email at the optimal time — automatically.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    color: '#F97316', bg: 'rgba(249,115,22,0.1)',
    title: 'Audience Engagement',
    body: 'Responds to comments, DMs, and replies in your voice — building trust at scale without manual effort.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    color: '#14B8A6', bg: 'rgba(20,184,166,0.1)',
    title: 'Lead Qualification',
    body: 'Scores every inbound lead against your ICP in real time. Only hot, verified prospects make it through.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    color: '#F97316', bg: 'rgba(249,115,22,0.1)',
    title: 'Sales Call Booking',
    body: 'Schedules discovery calls directly into your calendar. No SDRs. No back-and-forth. Just booked meetings.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    color: '#14B8A6', bg: 'rgba(20,184,166,0.1)',
    title: 'Real-Time Analytics',
    body: 'Track pipeline velocity, content performance, and lead quality in one live dashboard.',
  },
];

export default function Features() {
  return (
    <section id="features" style={{ padding: '96px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <div className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.1em] text-neutral-500">
          Everything you need
        </div>
        <h2
          className="mx-auto mb-5 max-w-[560px] font-display text-4xl font-bold text-neutral-50 md:text-[44px]"
          style={{ lineHeight: 1.15, letterSpacing: '-0.02em' }}
        >
          One Engine.
          <br />
          Full-Stack Growth.
        </h2>
        <p className="mx-auto max-w-[480px] text-lg leading-relaxed text-neutral-500">
          From first impression to booked call — Fourdoor handles the entire acquisition loop.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <motion.div
            key={f.title}
            className="group rounded-2xl border border-white/10 bg-[#111113] p-7 transition-colors hover:border-white/20 hover:bg-[#141416] cursor-default"
            whileHover={{ y: -4, scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
          >
            <motion.div
              style={{
                width: 44, height: 44, borderRadius: 11,
                background: f.bg, color: f.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18
              }}
              whileHover={{ scale: 1.1, rotate: 2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {f.icon}
            </motion.div>
            <h3 className="mb-2.5 font-display text-lg font-semibold text-neutral-50 group-hover:text-orange-400 transition-colors">{f.title}</h3>
            <p className="text-sm leading-relaxed text-neutral-400">{f.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
