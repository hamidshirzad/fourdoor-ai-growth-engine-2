import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Navigation from '../components/Navigation';
import Seo from '../components/Seo';
import { useAuthStore } from '../lib/store';

export default function SignupPage() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', company: '' });
  const [error, setError] = useState('');
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const { signup, login, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    const raw = router.query.email;
    const emailFromQuery = (Array.isArray(raw) ? raw[0] : raw || '').trim();
    if (emailFromQuery) {
      setFormData((prev) => (prev.email ? prev : { ...prev, email: emailFromQuery }));
    }
  }, [router.isReady, router.query.email]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const result = await signup(formData.email, formData.password, formData.name, formData.company);
    if (result.success) router.push('/onboarding');
    else setError(result.error);
  };

  const handleDemoLogin = async () => {
    setError('');
    setIsDemoLoading(true);
    // Must match the account created by backend/src/db/seed.js.
    const result = await login('demo@fourdoor.ai', 'demo@password123');
    setIsDemoLoading(false);
    if (result.success) router.push('/dashboard');
    else setError(result.error || 'Failed to enter demo mode.');
  };

  return (
    <>
      <Seo title="Create an account" description="Start your Fourdoor AI Growth workspace and put lead generation on autopilot." />
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navigation />
      <main id="main-content" className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-[#0A0A0B] px-4 py-8">
        <section className="w-full max-w-md rounded-xl border border-white/10 bg-[#141416] p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <Link href="/" className="inline-flex items-center text-xs font-medium text-neutral-400 hover:text-white transition-colors">
              ← Back to Homepage
            </Link>
            <span className="rounded bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-400 border border-orange-500/20">
              Free Trial
            </span>
          </div>

          <h1 className="text-2xl font-bold text-neutral-50">Create Account</h1>
          <p className="mt-1 text-sm text-neutral-400">Get instant access to AI content generation & B2B lead pipeline.</p>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading || isDemoLoading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <span>⚡</span>
            <span>{isDemoLoading ? 'Entering Demo Workspace...' : 'Skip Sign Up — Try Demo Workspace'}</span>
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">or register new account</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {error && <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="signup-name" className="mb-1 block text-xs font-medium text-neutral-300">Full Name</label>
              <input
                id="signup-name"
                name="name"
                autoComplete="name"
                className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:border-orange-500"
                type="text"
                placeholder="Alex Morgan"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="mb-1 block text-xs font-medium text-neutral-300">Work Email</label>
              <input
                id="signup-email"
                name="email"
                autoComplete="email"
                className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:border-orange-500"
                type="email"
                placeholder="alex@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="mb-1 block text-xs font-medium text-neutral-300">Password</label>
              <input
                id="signup-password"
                name="password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:border-orange-500"
                type="password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
              />
            </div>

            <div>
              <label htmlFor="signup-company" className="mb-1 block text-xs font-medium text-neutral-300">Company Name (Optional)</label>
              <input
                id="signup-company"
                name="organization"
                autoComplete="organization"
                className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:border-orange-500"
                type="text"
                placeholder="Acme Growth Co."
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>

            <button
              disabled={isLoading || isDemoLoading}
              className="mt-2 w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-orange-400 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating account...' : 'Create Account & Start Trial'}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-4 text-center text-sm text-neutral-400">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-orange-500 hover:underline">
              Log in
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
