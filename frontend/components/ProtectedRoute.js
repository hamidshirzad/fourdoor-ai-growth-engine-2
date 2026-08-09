import Head from 'next/head';
import { useAuthStore } from '../lib/store';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children }) {
  const { token, hydrate } = useAuthStore();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    hydrate().then(() => setIsReady(true));
  }, []);

  useEffect(() => {
    if (isReady && !token) {
      router.push('/login');
    }
  }, [isReady, token]);

  // Emitted from here rather than only from AppShell, because AppShell is a
  // *child* of this gate. On the server render and for any unauthenticated
  // visitor — which is what a crawler always is — the branch below returns the
  // placeholder and never renders children, so AppShell's noindex was never in
  // the HTML a crawler received. Every protected URL was therefore indexable as
  // a "Loading..." page. Keyed to match Seo.js so the two never duplicate.
  const noindex = (
    <Head>
      <meta name="robots" content="noindex,nofollow" key="robots" />
    </Head>
  );

  if (!isReady || !token) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] p-8 text-neutral-400">
        {noindex}
        Loading...
      </div>
    );
  }

  return (
    <>
      {noindex}
      {children}
    </>
  );
}
