import MarketingPageLayout from '../components/marketing/MarketingPageLayout';
import { Calendar, GitPullRequest, Sparkles, Tag } from 'lucide-react';

const RELEASES = [
  {
    version: 'v2.4.0',
    date: 'July 2026',
    title: 'Autonomous Multi-Agent Collaboration Engine',
    badge: 'Major Release',
    items: [
      'Introduced specialized sub-agents for lead scoring, comment response, and call booking.',
      'Added pg-mem resilience and automated fallback database mechanisms.',
      'Enhanced Recharts data visualizers for live lead growth tracking.',
      'Added secret scanner protection for outbound campaign assets.'
    ]
  },
  {
    version: 'v2.2.0',
    date: 'June 2026',
    title: 'LinkedIn & X Deep Conversational Memory',
    badge: 'Feature Update',
    items: [
      'Fourdoor AI now remembers prior multi-turn conversations across platforms.',
      'Added automated Calendly and Google Calendar link insertion in DMs.',
      'Support for custom brand voice upload via PDF/Doc guidelines.'
    ]
  },
  {
    version: 'v2.0.0',
    date: 'May 2026',
    title: 'Next.js App Engine & Lead Qualification Pipeline',
    badge: 'Platform Upgrade',
    items: [
      'Complete overhaul to responsive dark-theme design system.',
      'Added real-time ICP lead scoring algorithm.',
      'Integrated Stripe & PayPal subscription webhooks.'
    ]
  }
];

export default function ChangelogPage() {
  return (
    <MarketingPageLayout
      title="Product Changelog"
      description="Stay updated with the latest features, engine enhancements, and improvements to Fourdoor AI."
    >
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1 text-xs font-semibold text-purple-400 mb-4">
            <Sparkles size={14} />
            Product Evolution
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-neutral-50 mb-4">
            Changelog & Release Notes
          </h1>
          <p className="text-neutral-400 text-sm sm:text-base">
            We deploy new autonomous growth improvements every single week. Here is what we have built recently.
          </p>
        </div>

        <div className="space-y-10 relative before:absolute before:left-4 sm:before:left-32 before:top-3 before:bottom-3 before:w-[1px] before:bg-white/10">
          {RELEASES.map((rel) => (
            <div key={rel.version} className="relative pl-10 sm:pl-44">
              {/* Timeline marker */}
              <div className="absolute left-2.5 sm:left-[122px] top-1.5 h-3 w-3 rounded-full border-2 border-orange-500 bg-[#0A0A0B]" />

              {/* Left date header on desktop */}
              <div className="hidden sm:block absolute left-0 top-0 w-28 text-right text-xs font-medium text-neutral-500">
                <p className="font-mono text-neutral-300">{rel.version}</p>
                <p className="mt-1">{rel.date}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111113] p-6 hover:border-white/20 transition-all">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="sm:hidden font-mono text-xs text-orange-400 font-bold">{rel.version} · {rel.date}</span>
                  <span className="rounded bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                    {rel.badge}
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold text-neutral-50 mb-4">{rel.title}</h3>
                <ul className="space-y-2 text-sm text-neutral-300">
                  {rel.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-400 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MarketingPageLayout>
  );
}
