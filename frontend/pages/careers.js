import Link from 'next/link';
import MarketingPageLayout from '../components/marketing/MarketingPageLayout';
import { ArrowUpRight, Briefcase, Globe, Heart, Sparkles, Zap } from 'lucide-react';

const ROLES = [
  { title: 'Senior AI / LLM Engineer', dept: 'Engineering', location: 'Remote (US / EU / APAC)', type: 'Full-Time' },
  { title: 'Full-Stack Next.js Developer', dept: 'Engineering', location: 'Remote', type: 'Full-Time' },
  { title: 'Growth Marketing Lead', dept: 'Marketing', location: 'Remote', type: 'Full-Time' },
  { title: 'Customer Success & Onboarding Director', dept: 'Operations', location: 'Remote', type: 'Full-Time' },
];

export default function CareersPage() {
  return (
    <MarketingPageLayout
      title="Careers at Fourdoor AI"
      description="Help us build the next generation of autonomous customer acquisition systems. View open positions."
    >
      <div className="py-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-semibold text-teal-400 mb-4">
            <Briefcase size={14} />
            We Are Hiring
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-neutral-50 mb-6">
            Build the Future of Autonomous Sales
          </h1>
          <p className="text-lg text-neutral-400 leading-relaxed">
            We are a high-velocity, distributed team of engineers, researchers, and builders reimagining B2B pipeline growth.
          </p>
        </div>

        {/* Roles List */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="font-display text-2xl font-bold text-neutral-50 mb-6">Open Positions</h2>
          <div className="space-y-4">
            {ROLES.map((r) => (
              <div key={r.title} className="rounded-2xl border border-white/10 bg-[#111113] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-white/20 transition-all">
                <div>
                  <h3 className="font-display text-lg font-bold text-neutral-50 mb-1">{r.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-neutral-400">
                    <span className="text-orange-400 font-semibold">{r.dept}</span>
                    <span>•</span>
                    <span>{r.location}</span>
                    <span>•</span>
                    <span>{r.type}</span>
                  </div>
                </div>

                <Link href="/contact" className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-orange-500 hover:text-neutral-950 transition-all">
                  Apply Now
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MarketingPageLayout>
  );
}
