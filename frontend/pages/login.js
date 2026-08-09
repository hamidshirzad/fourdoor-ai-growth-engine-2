import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Navigation from '../components/Navigation';
import Seo from '../components/Seo';
import { useAuthStore } from '../lib/store';
import { API_BASE_URL, isApiConfigured } from '../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('demo@fourdoor.ai');
  const [password, setPassword] = useState('demo@password123');
  const [error, setError] = useState('');
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (router.query.error === 'sso_failed') {
      setError('Single sign-on failed. Please try again or log in with your password.');
    }
  }, [router.query.error]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.success) router.push('/dashboard');
    else setError(result.error);
  };

  const handleDemoLogin = async () => {
    setError('');
    setIsDemoLoading(true);
    setEmail('demo@fourdoor.ai');
    setPassword('demo@password123');
    const result = await login('demo@fourdoor.ai', 'demo@password123');
    setIsDemoLoading(false);
    if (result.success) router.push('/dashboard');
    else setError(result.error || 'Failed to login with demo account.');
  };

  const handleSso = () => {
    if (!isApiConfigured) {
      setError('Single sign-on is unavailable: this deployment has no API server configured.');
      return;
    }
    window.location.href = `${API_BASE_URL}/api/auth/sso/authorize`;
  };

  return (
    <>
      <Seo title="Log in" description="Sign in to your Fourdoor AI Growth operations workspace." />
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navigation />
      <main id="main-content" className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-[#0A0A0B] px-4 py-8">
        <section className="w-full max-w-md rounded-xl border border-white/10 bg-[#141416] p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <Link href="/" className="inline-flex items-center text-xs font-medium text-neutral-400 hover:text-white transition-colors">
              ← Back to Homepage
            </Link>
            <span className="rounded bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-400 border border-orange-500/20">
              Fourdoor AI Growth
            </span>
          </div>

          <h1 className="text-2xl font-bold text-neutral-50">Welcome Back</h1>
          <p className="mt-1 text-sm text-neutral-400">Sign in to your AI Growth operations workspace.</p>

          {!isApiConfigured && (
            <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
              Sign-in is unavailable: this deployment has no API server configured.
              Set <code className="font-mono text-xs">NEXT_PUBLIC_API_URL</code> to the
              backend URL and redeploy.
            </div>
          )}

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading || isDemoLoading || !isApiConfigured}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <span>⚡</span>
            <span>{isDemoLoading ? 'Loading Demo Workspace...' : 'Try Demo Mode (Instant Login)'}</span>
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">or log in with credentials</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* role="alert" so screen readers announce a failed sign-in attempt;
            * without it the message appears silently and a non-sighted user is
            * left waiting on a form that looks like it did nothing. */}
          {error && <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1 block text-xs font-medium text-neutral-300">Email Address</label>
              <input
                id="login-email"
                name="email"
                autoComplete="email"
                className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:border-orange-500"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="login-password" className="mb-1 block text-xs font-medium text-neutral-300">Password</label>
              <input
                id="login-password"
                name="password"
                autoComplete="current-password"
                className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:border-orange-500"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              disabled={isLoading || isDemoLoading || !isApiConfigured}
              className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-orange-400 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleSso}
            className="mt-3 w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-4 py-2.5 text-sm font-semibold text-neutral-300 hover:bg-white/5 transition-colors"
          >
            Continue with SSO
          </button>

          <div className="mt-6 border-t border-white/10 pt-4 text-center text-sm text-neutral-400">
            Don't have an account yet?{' '}
            <Link href="/signup" className="font-semibold text-orange-500 hover:underline">
              Create an account
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
