import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Seo from '../components/Seo';
import { setToken } from '../lib/api';
import { useAuthStore } from '../lib/store';

export default function SsoCallbackPage() {
  const router = useRouter();
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    if (!router.isReady) return;
    const fragment = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const token = new URLSearchParams(fragment).get('token');
    if (!token) {
      router.replace('/login?error=sso_failed');
      return;
    }
    setToken(token);
    Promise.resolve(hydrate()).finally(() => router.replace('/dashboard'));
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
      <Seo title="Signing you in" noindex />
      {/* aria-live so assistive tech announces this transient state; the page
        * redirects on its own and has no other content to read. */}
      <p role="status" aria-live="polite" className="text-sm text-neutral-400">Signing you in…</p>
    </main>
  );
}
