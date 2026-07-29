import Link from 'next/link';
import MarketingPageLayout from '../components/marketing/MarketingPageLayout';
import { Award, Bot, Cpu, Globe, Heart, ShieldCheck, Sparkles, Users } from 'lucide-react';

const STATS = [
  { label: 'Qualified Leads Generated', value: '2.4M+' },
  { label: 'Sales Calls Booked', value: '185K+' },
  { label: 'Active Business Customers', value: '1,400+' },
  { label: 'Uptime Reliability', value: '99.99%' },
];

const VALUES = [
  {
    icon: Bot,
    title: 'Autonomous Precision',
    desc: 'We build AI systems that act with surgical precision, maintaining brand authority without hallucinating or spamming.'
  },
  {
    icon: ShieldCheck,
    title: 'Uncompromised Security',
    desc: 'Every message and content asset undergoes strict automated security scanning before hitting recipient inboxes.'
  },
  {
    icon: Users,
    title: 'Customer Velocity',
    desc: 'Our success is measured by the actual booked meetings and closed revenue added to our customers’ pipelines.'
  }
];

export default function AboutPage() {
  return (
    <MarketingPageLayout
      title="About Fourdoor AI"
      description="Fourdoor AI is building the future of autonomous growth engineering for modern B2B businesses."
    >
      <div className="py-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400 mb-4">
            <Sparkles size={14} />
            Our Mission & Story
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-neutral-50 mb-6">
            Pioneering Autonomous Customer Acquisition
          </h1>
          <p className="text-lg text-neutral-400 leading-relaxed">
            Fourdoor AI was founded to eliminate the friction, manual cold calling, and SDR burnout in B2B sales. We empower companies to put pipeline generation on 24/7 autopilot.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-[#111113] p-6 text-center">
              <span className="font-display text-3xl sm:text-4xl font-extrabold text-orange-400 block mb-2">{s.value}</span>
              <span className="text-xs text-neutral-400 font-medium">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Company Vision & Values */}
        <div className="mb-16">
          <h2 className="font-display text-2xl font-bold text-neutral-50 text-center mb-8">Our Core Principles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="rounded-2xl border border-white/10 bg-[#111113] p-6">
                  <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 inline-block mb-4">
                    <Icon size={24} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-neutral-50 mb-2">{v.title}</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-orange-500/10 via-teal-500/10 to-purple-500/10 p-8 text-center">
          <h3 className="font-display text-2xl font-bold text-neutral-50 mb-3">Join Thousands of Businesses Growing with Fourdoor</h3>
          <p className="text-xs text-neutral-400 max-w-lg mx-auto mb-6">Experience the power of autonomous AI lead generation today.</p>
          <Link href="/signup" className="inline-flex rounded-lg bg-orange-500 px-6 py-3 text-xs font-bold text-neutral-950 hover:bg-orange-400 transition-all">
            Get Started Free
          </Link>
        </div>
      </div>
    </MarketingPageLayout>
  );
}
