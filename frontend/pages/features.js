import Link from 'next/link';
import MarketingPageLayout from '../components/marketing/MarketingPageLayout';
import { Bot, Calendar, Cpu, Flame, Inbox, Layers, MessageSquare, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { motion } from 'motion/react';

const ENGINES = [
  {
    icon: Sparkles,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    title: '1. Autonomous Content Generation Engine',
    desc: 'Writes high-converting LinkedIn posts, Twitter threads, cold email sequences, and ad copy tailored specifically to your ICP and brand tone.',
    bullets: ['Brand voice calibration', 'Multi-format post creation', 'Automated media attachment', 'A/B testing hook variations']
  },
  {
    icon: Cpu,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/20',
    title: '2. Multi-Platform Distribution Hub',
    desc: 'Publishes and schedules posts seamlessly across LinkedIn, X/Twitter, Instagram, and cold outreach inboxes at peak engagement hours.',
    bullets: ['Smart queue scheduling', 'Timezone optimization', 'Cross-platform formatting', 'Automated link wrapping']
  },
  {
    icon: MessageSquare,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    title: '3. Audience Engagement Agent',
    desc: 'Monitors inbound comments, direct messages, and quote tweets. Replies in real-time to build trust and qualify interested prospects.',
    bullets: ['24/7 comment monitoring', 'Contextual AI replies', 'DM lead handoff', 'Sentiment filtering']
  },
  {
    icon: Flame,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    title: '4. Lead Qualification & ICP Scoring',
    desc: 'Evaluates inbound engagement against your buyer persona. Scores leads based on company size, job title, tech stack, and intent signals.',
    bullets: ['Real-time intent scoring', 'Enrichment via Clearbit/Apollo', 'Hot prospect flags', 'Automated CRM sync']
  },
  {
    icon: Calendar,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: '5. Calendar & Sales Call Booking',
    desc: 'Engages qualified leads via automated conversational follow-ups and books discovery calls straight into your sales team calendar.',
    bullets: ['Google & Outlook calendar sync', 'Zero SDR required', 'Automated pre-call reminders', 'No back-and-forth scheduling']
  },
  {
    icon: ShieldCheck,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    title: '6. Security & Policy Enforcement',
    desc: 'Scans every single generated asset and outbound message for compliance, confidentiality, and brand safety before publishing.',
    bullets: ['Hardcoded secret detection', 'Compliance filter', 'Brand guardrails', 'Audit trail logs']
  }
];

export default function FeaturesPage() {
  return (
    <MarketingPageLayout
      title="Platform Features"
      description="Explore all 6 engines driving Fourdoor AI: Content generation, multi-platform distribution, engagement, lead scoring, and sales call booking."
    >
      <div className="py-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400 mb-4">
            <Zap size={14} />
            Full-Stack Autonomous Engine
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-neutral-50 mb-6">
            Engineered for Exponential Pipeline Velocity
          </h1>
          <p className="text-lg text-neutral-400 leading-relaxed">
            Fourdoor AI replaces manual SDR labor with a self-learning autonomous growth system that handles every step of prospect acquisition.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ENGINES.map((e) => {
            const Icon = e.icon;
            return (
              <div key={e.title} className="rounded-2xl border border-white/10 bg-[#111113] p-6 hover:border-white/20 transition-all">
                <div className={`inline-flex p-3 rounded-xl border ${e.bg} ${e.color} mb-4`}>
                  <Icon size={24} />
                </div>
                <h3 className="font-display text-xl font-semibold text-neutral-50 mb-2">{e.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed mb-6">{e.desc}</p>
                <ul className="space-y-2 border-t border-white/5 pt-4 text-xs text-neutral-300">
                  {e.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center rounded-2xl border border-white/10 bg-gradient-to-b from-[#141416] to-[#0A0A0B] p-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-50 mb-4">Ready to Put Outbound on Autopilot?</h2>
          <p className="text-neutral-400 max-w-xl mx-auto mb-8 text-sm sm:text-base">
            Set up your custom ICP rules in 3 minutes and start booking meetings on day 1.
          </p>
          <Link href="/signup" className="inline-flex rounded-lg bg-orange-500 px-8 py-3 text-sm font-semibold text-neutral-950 hover:bg-orange-400 transition-all">
            Get Started Free
          </Link>
        </div>
      </div>
    </MarketingPageLayout>
  );
}
