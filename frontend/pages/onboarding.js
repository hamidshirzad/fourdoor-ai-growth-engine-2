import { useState } from 'react';
import { useRouter } from 'next/router';
import Navigation from '../components/Navigation';
import Seo from '../components/Seo';
import ProtectedRoute from '../components/ProtectedRoute';
import { apiCall } from '../lib/api';
import { useAuthStore } from '../lib/store';

export default function OnboardingPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [form, setForm] = useState({ niche: '', audience: '', goal: '' });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      await apiCall('/api/auth/onboarding', 'PUT', form, token);
      const result = await apiCall('/api/content/generate', 'POST', form, token);
      setPosts(result.posts);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <Seo title="Onboarding" description="Tell Fourdoor AI about your niche, audience and goal to generate your first posts." noindex />
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navigation />
      <main id="main-content" className="min-h-screen bg-[#0A0A0B] px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-semibold text-neutral-50">Set Up Your Growth Engine</h1>
          <p className="mt-1 text-sm text-neutral-400">Add your market context, generate your first post, then connect channels.</p>
          <section className="mt-6 rounded border border-white/10 bg-[#141416] p-5">
            <div className="grid gap-3 md:grid-cols-3">
              <input className="focus-ring rounded border border-white/10 px-3 py-2" placeholder="Niche" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} />
              <input className="focus-ring rounded border border-white/10 px-3 py-2" placeholder="Audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
              <input className="focus-ring rounded border border-white/10 px-3 py-2" placeholder="Goal" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
            </div>
            <button onClick={generate} disabled={loading || !form.niche || !form.audience || !form.goal} className="focus-ring mt-4 rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-50">
              {loading ? 'Generating...' : 'Generate first AI post'}
            </button>
          </section>
          {posts.length > 0 && (
            <section className="mt-6 rounded border border-white/10 bg-[#141416] p-5">
              <h2 className="text-lg font-semibold text-neutral-50">Your first post is ready</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-300">{posts[0].caption}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button onClick={() => router.push('/settings')} className="focus-ring rounded border border-white/10 px-4 py-2 text-sm font-semibold text-neutral-200">Connect social accounts</button>
                <button onClick={() => router.push('/dashboard')} className="focus-ring rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-neutral-950">Open dashboard</button>
              </div>
            </section>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
