import MarketingPageLayout from '../components/marketing/MarketingPageLayout';
import { ShieldCheck } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <MarketingPageLayout
      title="Privacy Policy"
      description="Fourdoor AI Privacy Policy regarding data collection, protection, storage, and user privacy rights."
    >
      <div className="py-8 max-w-3xl mx-auto prose prose-invert">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400 mb-2">
          <ShieldCheck size={16} /> Privacy & Protection
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-neutral-50 mb-6">Privacy Policy</h1>
        <p className="text-xs text-neutral-400 mb-8">Last Updated: July 2026</p>

        <div className="space-y-6 text-sm text-neutral-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-neutral-100 mb-2">1. Overview</h2>
            <p>Fourdoor AI (“we”, “our”, or “us”) values your privacy. This Privacy Policy describes how we collect, process, store, and safeguard personal and business data when you use our autonomous AI growth engine software platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-100 mb-2">2. Information We Collect</h2>
            <p>We collect account credentials, contact information provided upon signup, and target prospect parameters defined by you for outbound campaigns. We process data strictly to provide AI generation, lead scoring, and meeting booking functionality.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-100 mb-2">3. Data Security & Storage</h2>
            <p>All sensitive information is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. We enforce automated secret scanning and vulnerability checks across all background processing nodes.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-100 mb-2">4. Your Privacy Rights</h2>
            <p>Under GDPR, CCPA, and global privacy standards, you have the right to request access to, deletion of, or export of your personal data at any time by contacting privacy@fourdoor.ai.</p>
          </section>
        </div>
      </div>
    </MarketingPageLayout>
  );
}
