import { useState } from 'react';
import MarketingPageLayout from '../components/marketing/MarketingPageLayout';
import { Mail, MessageSquare, Phone, Send, Sparkles } from 'lucide-react';
import { toast } from '../lib/toastStore';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
    inquiryType: 'Demo Request'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success('Thank you! Our growth team will reach out within 2 hours.');
      setFormData({ name: '', email: '', company: '', message: '', inquiryType: 'Demo Request' });
    }, 800);
  };

  return (
    <MarketingPageLayout
      title="Contact Fourdoor AI"
      description="Get in touch with our AI growth team for custom enterprise demos, pricing inquiries, or technical support."
    >
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400 mb-4">
            <MessageSquare size={14} />
            Let’s Talk Pipeline
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-neutral-50 mb-4">
            Get in Touch with Our Team
          </h1>
          <p className="text-neutral-400 text-sm sm:text-base">
            Have questions about Fourdoor AI or want a custom enterprise walkthrough? Send us a message below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Info Sidebar */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#111113] p-6">
              <Mail className="text-orange-400 mb-3" size={20} />
              <h3 className="font-display font-semibold text-neutral-100 text-sm mb-1">Email Us</h3>
              <p className="text-xs text-neutral-400">growth@fourdoor.ai</p>
              <p className="text-xs text-neutral-400">support@fourdoor.ai</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111113] p-6">
              <Phone className="text-teal-400 mb-3" size={20} />
              <h3 className="font-display font-semibold text-neutral-100 text-sm mb-1">Enterprise Hotline</h3>
              <p className="text-xs text-neutral-400">+1 (800) 555-4400</p>
              <p className="text-xs text-neutral-500 mt-1">Mon - Fri, 8am - 6pm PST</p>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-2 rounded-2xl border border-white/10 bg-[#111113] p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Jane Doe"
                    className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-xs text-neutral-100 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jane@company.com"
                    className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-xs text-neutral-100 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Company / Organization</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Acme SaaS Inc."
                  className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-xs text-neutral-100 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Inquiry Type</label>
                <select
                  value={formData.inquiryType}
                  onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-xs text-neutral-200 focus:border-orange-500"
                >
                  <option value="Demo Request">Request Personal Demo</option>
                  <option value="Enterprise Pricing">Enterprise Custom Plan</option>
                  <option value="Partnership">Agency & Reseller Partnership</option>
                  <option value="Support">Technical Support</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Message *</label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us about your target ICP and current outbound goals..."
                  className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-xs text-neutral-100 focus:border-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-orange-500 py-3 text-xs font-bold text-neutral-950 hover:bg-orange-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send size={14} />
                {submitting ? 'Sending Message...' : 'Send Inquiry'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </MarketingPageLayout>
  );
}
