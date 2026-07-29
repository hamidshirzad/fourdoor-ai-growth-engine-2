import Link from 'next/link';
import MarketingPageLayout from '../components/marketing/MarketingPageLayout';
import { Download, FileText, Newspaper, Sparkles } from 'lucide-react';
import Logo from '../components/marketing/Logo';

export default function PressPage() {
  return (
    <MarketingPageLayout
      title="Press & Brand Kit"
      description="Download Fourdoor AI brand assets, media guidelines, press releases, and company facts."
    >
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400 mb-4">
            <Newspaper size={14} />
            Media & Brand Center
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-neutral-50 mb-4">
            Press Resources & Assets
          </h1>
          <p className="text-neutral-400 text-sm sm:text-base">
            Official logos, brand guidelines, product screenshots, and press contact info.
          </p>
        </div>

        {/* Brand Assets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="rounded-2xl border border-white/10 bg-[#111113] p-8 flex flex-col items-center justify-center text-center">
            <div className="mb-6 p-6 rounded-xl bg-[#0A0A0B] border border-white/5">
              <Logo size={32} />
            </div>
            <h3 className="font-display text-lg font-bold text-neutral-50 mb-1">Primary Logo Assets</h3>
            <p className="text-xs text-neutral-400 mb-4">Vector SVG and PNG logos in dark & light themes.</p>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-white/20 transition-all">
              <Download size={14} /> Download Brand Kit (.ZIP)
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111113] p-8">
            <h3 className="font-display text-lg font-bold text-neutral-50 mb-3">Company Overview</h3>
            <p className="text-xs text-neutral-400 leading-relaxed mb-4">
              Fourdoor AI is an autonomous growth engine that automates multi-channel content generation, audience engagement, lead scoring, and sales call booking for B2B teams.
            </p>
            <div className="text-xs text-neutral-300 space-y-1">
              <p><strong className="text-neutral-100">Founded:</strong> 2025</p>
              <p><strong className="text-neutral-100">Headquarters:</strong> San Francisco, CA & Remote</p>
              <p><strong className="text-neutral-100">Press Contact:</strong> press@fourdoor.ai</p>
            </div>
          </div>
        </div>
      </div>
    </MarketingPageLayout>
  );
}
