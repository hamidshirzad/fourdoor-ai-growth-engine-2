import Link from 'next/link';
import MarketingPageLayout from '../components/marketing/MarketingPageLayout';
import { ArrowUpRight, CheckCircle2, Layers, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';

const INTEGRATIONS = [
  {
    name: 'LinkedIn Platform',
    category: 'Social Channels',
    desc: 'Auto-publish posts, articles, and engage with prospect comments & connection messages.',
    status: 'Native Integration',
    popular: true
  },
  {
    name: 'X (Twitter)',
    category: 'Social Channels',
    desc: 'Schedule long-form posts, threads, and auto-reply to mentions from high-value prospects.',
    status: 'Native Integration',
    popular: true
  },
  {
    name: 'HubSpot CRM',
    category: 'CRMs',
    desc: 'Bi-directionally sync qualified leads, engagement history, and call booking status.',
    status: 'Native Integration',
    popular: true
  },
  {
    name: 'Salesforce',
    category: 'CRMs',
    desc: 'Stream lead intent scores and contact enrichment directly into enterprise pipeline stages.',
    status: 'Native Integration',
    popular: true
  },
  {
    name: 'Google Workspace & Gmail',
    category: 'Email & Outreach',
    desc: 'Send personalized cold outreach sequences and manage replies with warm custom domains.',
    status: 'Native Integration',
    popular: false
  },
  {
    name: 'Outlook & Office 365',
    category: 'Email & Outreach',
    desc: 'Connect Microsoft business accounts for corporate outbound and calendar booking.',
    status: 'Native Integration',
    popular: false
  },
  {
    name: 'Calendly & Google Calendar',
    category: 'Scheduling',
    desc: 'Direct calendar link insertion into conversational DMs for effortless booking.',
    status: 'Native Integration',
    popular: true
  },
  {
    name: 'Zapier & Make.com',
    category: 'Automation',
    desc: 'Trigger custom workflows across 5,000+ business tools whenever a lead reaches Hot score.',
    status: 'Webhook Supported',
    popular: false
  },
  {
    name: 'Slack & Microsoft Teams',
    category: 'Notifications',
    desc: 'Receive real-time channel alerts the second a hot prospect requests a discovery call.',
    status: 'Native Integration',
    popular: false
  }
];

export default function IntegrationsPage() {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');

  const categories = ['All', 'Social Channels', 'CRMs', 'Email & Outreach', 'Scheduling', 'Automation', 'Notifications'];

  const filtered = INTEGRATIONS.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.desc.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === 'All' || item.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <MarketingPageLayout
      title="Integrations Hub"
      description="Connect Fourdoor AI to your existing tech stack: LinkedIn, HubSpot, Salesforce, Gmail, Calendly, Zapier and more."
    >
      <div className="py-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-semibold text-teal-400 mb-4">
            <Layers size={14} />
            Ecosystem Connectivity
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-neutral-50 mb-6">
            Connects With Your Existing Stack
          </h1>
          <p className="text-lg text-neutral-400 leading-relaxed">
            Fourdoor integrates natively with the tools your team already uses every day. No code required.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCat === cat
                    ? 'bg-orange-500 text-neutral-950 shadow'
                    : 'border border-white/10 bg-[#111113] text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search integrations..."
              className="w-full rounded-lg border border-white/10 bg-[#111113] pl-9 pr-4 py-2 text-xs text-neutral-200 focus:border-orange-500"
            />
          </div>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {filtered.map((item) => (
            <div
              key={item.name}
              className="rounded-2xl border border-white/10 bg-[#111113] p-6 hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider">{item.category}</span>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    <CheckCircle2 size={12} />
                    {item.status}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-neutral-50 mb-2">{item.name}</h3>
                <p className="text-xs text-neutral-400 leading-relaxed mb-6">{item.desc}</p>
              </div>

              <Link
                href="/settings"
                className="inline-flex items-center justify-between text-xs font-semibold text-neutral-300 hover:text-orange-400 transition-colors pt-4 border-t border-white/5"
              >
                <span>Connect in Settings</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center rounded-2xl border border-white/10 bg-[#141416] p-8">
          <h3 className="font-display text-xl font-bold text-neutral-50 mb-2">Need a Custom API or Webhook Integration?</h3>
          <p className="text-xs text-neutral-400 max-w-lg mx-auto mb-6">
            Fourdoor provides RESTful API endpoints and real-time webhook event triggers for enterprise setups.
          </p>
          <Link href="/contact" className="inline-flex rounded-lg bg-white/10 px-6 py-2.5 text-xs font-semibold text-neutral-200 hover:bg-white/20 transition-all">
            Request API Docs
          </Link>
        </div>
      </div>
    </MarketingPageLayout>
  );
}
