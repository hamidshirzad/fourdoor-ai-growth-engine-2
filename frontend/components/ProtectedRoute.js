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

  if (!isReady || !token) return <div className="min-h-screen bg-[#0A0A0B] p-8 text-neutral-400">Loading...</div>;

  return children;
}
