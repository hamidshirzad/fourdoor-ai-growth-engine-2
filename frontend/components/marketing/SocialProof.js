const PRINCIPLES = [
  {
    label: 'Built by an operator',
    body: 'Fourdoor is built and run from Belgium by someone managing live Meta Ads and lead pipelines for real local clients — not a team that has never sold anything.',
  },
  {
    label: 'Early access, stated plainly',
    body: 'The platform is in active development. You are early. We would rather tell you that than invent a customer count.',
  },
  {
    label: 'You can see it work first',
    body: 'Book a call and we will run the engine against your own ICP and show you the output before you pay for anything.',
  },
];

export default function SocialProof() {
  return (
    <section
      id="social-proof"
      style={{
        padding: '96px 40px',
        background: 'linear-gradient(180deg, transparent 0%, rgba(249,115,22,0.03) 50%, transparent 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div className="mb-7 text-xs font-medium uppercase tracking-[0.1em] text-neutral-700">
          Where we actually stand
        </div>
        <p
          className="mx-auto max-w-[560px] font-display text-[22px] text-neutral-50"
          style={{ lineHeight: 1.5, letterSpacing: '-0.01em' }}
        >
          No logo wall. No invented case studies. Here is the honest position.
        </p>
      </div>

      <div
        style={{
          width: 1,
          height: 48,
          margin: '0 auto 56px',
          background: 'linear-gradient(to bottom,transparent,rgba(255,255,255,0.1),transparent)',
        }}
      />

      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
          gap: 32,
        }}
      >
        {PRINCIPLES.map((p) => (
          <div key={p.label} className="text-left">
            <div
              style={{
                width: 28,
                height: 2,
                background: '#F97316',
                marginBottom: 20,
                borderRadius: 2,
              }}
            />
            <div className="mb-3 text-sm font-semibold text-neutral-50">{p.label}</div>
            <p className="text-[15px] text-neutral-400" style={{ lineHeight: 1.6 }}>
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
