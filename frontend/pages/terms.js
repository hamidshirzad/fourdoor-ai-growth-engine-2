import MarketingPageLayout from '../components/marketing/MarketingPageLayout';
import { FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <MarketingPageLayout
      title="Terms of Service"
      description="Fourdoor AI Terms of Service governing platform usage, account rules, and service level agreements."
    >
      <div className="py-8 max-w-3xl mx-auto prose prose-invert">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400 mb-2">
          <FileText size={16} /> Legal Agreement
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-neutral-50 mb-6">Terms of Service</h1>
        <p className="text-xs text-neutral-400 mb-8">Last Updated: July 2026</p>

        <div className="space-y-6 text-sm text-neutral-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-neutral-100 mb-2">1. Acceptance of Terms</h2>
            <p>By creating an account or subscribing to Fourdoor AI, you agree to comply with and be legally bound by these Terms of Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-100 mb-2">2. Acceptable Use Policy</h2>
            <p>You agree to use Fourdoor AI solely for legitimate B2B communication, marketing, and sales engagement. Spamming, harassment, distribution of malware, or illegal data scraping is strictly prohibited and results in immediate account termination.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-100 mb-2">3. Subscriptions & Billing</h2>
            <p>Services are billed on a recurring monthly or annual basis. You may cancel your subscription at any time via the Billing dashboard prior to your next billing cycle renewal date.</p>
          </section>
        </div>
      </div>
    </MarketingPageLayout>
  );
}
