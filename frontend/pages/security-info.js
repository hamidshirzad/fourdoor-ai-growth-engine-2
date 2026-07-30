import Link from 'next/link';
import MarketingPageLayout from '../components/marketing/MarketingPageLayout';
import { CheckCircle2, Lock, ShieldAlert, ShieldCheck, Zap } from 'lucide-react';

const SECURITY_PILLARS = [
  {
    title: 'Automated Real-Time Secret Scanning',
    desc: 'Every single AI-generated output and campaign text is scanned before outbound release to ensure zero API key leaks, credentials, or sensitive data exposure.'
  },
  {
    title: 'Isolated Cloud Infrastructure',
    desc: 'Hosted in isolated containerized environments with network isolation and continuous monitoring. We are not currently SOC2 or ISO 27001 certified.'
  },
  {
    title: 'End-to-End Encryption',
    desc: 'AES-256 encryption at rest and TLS 1.3 in transit across all database connections and third-party CRM webhooks.'
  },
  {
    title: 'Rate Throttling & Account Safety',
    desc: 'Integrated human-like pacing algorithms keep your social channels and SMTP mailboxes within healthy rate limits.'
  }
];

export default function SecurityInfoPage() {
  return (
    <MarketingPageLayout
      title="Security Trust Center"
      description="Learn about Fourdoor AI platform security, secret scanning, encryption, and data protection standards."
    >
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400 mb-4">
            <ShieldCheck size={14} />
            Enterprise Trust & Security
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-neutral-50 mb-4">
            Bank-Grade Platform Security
          </h1>
          <p className="text-neutral-400 text-sm sm:text-base">
            We prioritize data confidentiality, zero secret leaks, and robust compliance for every business customer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {SECURITY_PILLARS.map((p, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-[#111113] p-6 hover:border-white/20 transition-all">
              <div className="flex items-center gap-2 text-emerald-400 font-bold mb-3 text-sm">
                <CheckCircle2 size={18} />
                {p.title}
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#141416] p-8 text-center">
          <h3 className="font-display text-xl font-bold text-neutral-50 mb-2">Need to Run a Security Review?</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto mb-6">
            We will answer a vendor security questionnaire directly and in writing. We hold no SOC2 or ISO 27001 certification and will not claim one.
          </p>
          <Link href="/contact" className="inline-flex rounded-lg bg-orange-500 px-6 py-2.5 text-xs font-bold text-neutral-950 hover:bg-orange-400 transition-all">
            Contact Security Team
          </Link>
        </div>
      </div>
    </MarketingPageLayout>
  );
}
