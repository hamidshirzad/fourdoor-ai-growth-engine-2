import MarketingPageLayout from '../components/marketing/MarketingPageLayout';
import { Cookie } from 'lucide-react';

export default function CookiesPage() {
  return (
    <MarketingPageLayout
      title="Cookie Policy"
      description="Information on how Fourdoor AI uses cookies and similar session technologies."
    >
      <div className="py-8 max-w-3xl mx-auto prose prose-invert">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400 mb-2">
          <Cookie size={16} /> Cookie Policy
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-neutral-50 mb-6">Cookie Policy</h1>
        <p className="text-xs text-neutral-400 mb-8">Last Updated: July 2026</p>

        <div className="space-y-6 text-sm text-neutral-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-neutral-100 mb-2">1. What Are Cookies?</h2>
            <p>Cookies are small text files stored on your browser when you visit websites. They help remember your login session, preferences, and security authorization state.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-100 mb-2">2. Types of Cookies We Use</h2>
            <ul className="list-disc pl-5 space-y-2 text-xs">
              <li><strong>Essential Cookies:</strong> Required for authentication, security session tokens, and CSRF protection.</li>
              <li><strong>Analytics Cookies:</strong> Used to measure platform performance, page load times, and campaign conversion rates.</li>
              <li><strong>Preference Cookies:</strong> Remember UI state, active dashboard filters, and custom display settings.</li>
            </ul>
          </section>
        </div>
      </div>
    </MarketingPageLayout>
  );
}
