import { useState } from 'react';
import Link from 'next/link';
import MarketingPageLayout from '../components/marketing/MarketingPageLayout';
import { Check, HelpCircle, Sparkles, Zap } from 'lucide-react';

const PLANS = [
  {
    name: 'Starter Engine',
    priceMonthly: 199,
    priceYearly: 159,
    desc: 'Perfect for solo founders, consultants, and boutique agencies taking outbound from 0 to 1.',
    features: [
      '1 Autonomous AI Persona',
      'Up to 500 Qualified Leads / mo',
      'LinkedIn & Twitter Distribution',
      'Automated Comment & DM Replies',
      'Google Calendar Integration',
      'Standard AI Generation Models',
      'Community Support'
    ],
    cta: 'Start 14-Day Trial',
    popular: false
  },
  {
    name: 'Growth Scale',
    priceMonthly: 499,
    priceYearly: 399,
    desc: 'Built for high-growth B2B SaaS and sales teams scaling pipeline without adding SDR headcounts.',
    features: [
      '3 Autonomous AI Personas',
      'Up to 2,500 Qualified Leads / mo',
      'All Platforms (LinkedIn, X, Email, IG)',
      'Real-Time Intent Scoring & CRM Sync',
      'Direct Sales Call Booking Agent',
      'Advanced Custom Brand Calibration',
      'Priority Support & Onboarding'
    ],
    cta: 'Book Growth Demo',
    popular: true
  },
  {
    name: 'Enterprise Autopilot',
    priceMonthly: 1299,
    priceYearly: 999,
    desc: 'Custom infrastructure for mid-market and enterprise organizations requiring bespoke AI guardrails.',
    features: [
      'Unlimited AI Growth Agents',
      'Unlimited Qualified Leads & Volume',
      'Custom LLM Fine-Tuning on Brand Copy',
      'Dedicated IP & Custom SMTP Nodes',
      'SOC2 Compliance & Audit Logs',
      'Dedicated Account Director',
      'SLA Guarantee & 24/7 Phone Support'
    ],
    cta: 'Contact Sales',
    popular: false
  }
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <MarketingPageLayout
      title="Simple Transparent Pricing"
      description="Choose the right Fourdoor AI plan for your acquisition team. Save 20% with annual billing."
    >
      <div className="py-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400 mb-4">
            <Sparkles size={14} />
            Predictable ROI Architecture
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-neutral-50 mb-6">
            Invest in Pipeline, Not SDR Overhead
          </h1>
          <p className="text-lg text-neutral-400 leading-relaxed mb-8">
            One Fourdoor growth engine costs a fraction of a single SDR salary while delivering 10x the monthly qualified pipeline.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center rounded-xl border border-white/10 bg-[#111113] p-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                !annual ? 'bg-orange-500 text-neutral-950 shadow-md' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all flex items-center gap-2 ${
                annual ? 'bg-orange-500 text-neutral-950 shadow-md' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Annual Billing
              <span className="rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-16">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 flex flex-col justify-between transition-all ${
                plan.popular
                  ? 'border-orange-500/50 bg-[#141416] shadow-2xl shadow-orange-500/10 scale-102'
                  : 'border-white/10 bg-[#111113] hover:border-white/20'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-950">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="font-display text-2xl font-bold text-neutral-50 mb-2">{plan.name}</h3>
                <p className="text-xs text-neutral-400 min-h-[36px] mb-6">{plan.desc}</p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="font-display text-4xl sm:text-5xl font-extrabold text-neutral-50">
                    ${annual ? plan.priceYearly : plan.priceMonthly}
                  </span>
                  <span className="text-sm text-neutral-400">/ month</span>
                  {annual && <span className="text-[11px] text-neutral-500 ml-1">(billed annually)</span>}
                </div>

                <div className="space-y-3 border-t border-white/10 pt-6 mb-8 text-sm text-neutral-300">
                  {plan.features.map((feat) => (
                    <div key={feat} className="flex items-start gap-3">
                      <Check size={16} className="text-orange-400 mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/signup"
                className={`w-full rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                  plan.popular
                    ? 'bg-orange-500 text-neutral-950 hover:bg-orange-400 shadow-glow'
                    : 'border border-white/20 bg-white/5 text-neutral-100 hover:bg-white/10'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto rounded-2xl border border-white/10 bg-[#111113] p-8">
          <h2 className="font-display text-2xl font-bold text-neutral-50 mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6 text-sm">
            <div>
              <h4 className="font-semibold text-neutral-200 mb-1">How quickly can I launch my first autonomous campaign?</h4>
              <p className="text-neutral-400">Setup takes under 5 minutes. Connect your social channels or SMTP inbox, define your ICP parameters, and the AI starts crafting content immediately.</p>
            </div>
            <div>
              <h4 className="font-semibold text-neutral-200 mb-1">Is my social account or domain protected against spam flags?</h4>
              <p className="text-neutral-400">Yes. Fourdoor uses rate-limited throttling, human-like pacing algorithms, and security scanners to keep your accounts 100% compliant and healthy.</p>
            </div>
            <div>
              <h4 className="font-semibold text-neutral-200 mb-1">Can I cancel or upgrade my plan anytime?</h4>
              <p className="text-neutral-400">Absolutely. You can change plans or cancel right inside your Billing dashboard with zero long-term commitments on monthly subscriptions.</p>
            </div>
          </div>
        </div>
      </div>
    </MarketingPageLayout>
  );
}
