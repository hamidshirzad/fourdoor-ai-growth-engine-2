import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuthStore, useContentStore } from '../lib/store';

export default function ContentPage() {
  const { token } = useAuthStore();
  const { posts, getPosts, isLoading } = useContentStore();
  const [form, setForm] = useState({ niche: '', audience: '', goal: '', platforms: ['linkedin', 'x', 'instagram'] });

  useEffect(() => {
    if (token) getPosts(token);
  }, [token, getPosts]);

  const generate = async () => {
    await useContentStore.getState().generateContent(form.niche, form.audience, form.goal, token);
    await getPosts(token);
  };

  const schedule = async (postId) => {
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await useContentStore.getState().schedulePost(postId, scheduledAt, null, token);
    await getPosts(token);
  };

  return (
    <ProtectedRoute>
      <AppShell title="Content Calendar" subtitle="Generate platform-specific drafts, A/B captions, predicted scores, and scheduled posts.">
        <section className="rounded border border-white/10 bg-[#141416] p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <input className="focus-ring rounded border border-white/10 px-3 py-2" placeholder="Niche" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} />
            <input className="focus-ring rounded border border-white/10 px-3 py-2" placeholder="Audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
            <input className="focus-ring rounded border border-white/10 px-3 py-2" placeholder="Goal" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          </div>
          <button onClick={generate} disabled={isLoading || !form.niche || !form.audience || !form.goal} className="focus-ring mt-4 rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-50">
            {isLoading ? 'Generating...' : 'Generate daily content'}
          </button>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <article key={post.id} className="rounded border border-white/10 bg-[#141416] p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">{post.platform}</p>
                <span className="rounded bg-[#0A0A0B] px-2 py-1 text-xs text-neutral-400">{post.status}</span>
              </div>
              <h2 className="mt-3 text-base font-semibold text-neutral-50">{post.hook}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-300">{post.caption}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(post.hashtags || []).slice(0, 6).map((tag) => <span key={tag} className="rounded bg-orange-500/15 px-2 py-1 text-xs text-orange-400">{tag}</span>)}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-neutral-400">Predicted {post.predicted_score}/100</span>
                <button onClick={() => schedule(post.id)} className="focus-ring rounded border border-white/10 px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-white/5">Schedule +1h</button>
              </div>
            </article>
          ))}
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}
