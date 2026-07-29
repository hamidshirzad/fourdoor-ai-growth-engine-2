import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import StatCard from '../components/StatCard';
import GrowthDashboard from '../components/GrowthDashboard';
import { apiCall } from '../lib/api';
import { useAuthStore } from '../lib/store';

export default function DashboardPage() {
  const { token } = useAuthStore();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (token) apiCall('/api/analytics/optimization', 'GET', null, token).then(setData).catch(console.error);
  }, [token]);

  const totals = data?.analytics?.totals || {};

  return (
    <ProtectedRoute>
      <AppShell title="Growth Command Center" subtitle="A live read on content, pipeline, bookings, and the next optimization moves.">
        <GrowthDashboard liveData={data} />

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-xl border border-white/10 bg-[#141416] p-5">
            <h2 className="text-lg font-semibold text-neutral-50">Top High-Performing Content</h2>
            <div className="mt-4 space-y-3">
              {(data?.analytics?.topPosts || []).map((post) => (
                <div key={post.id} className="rounded-lg border border-white/10 bg-[#0A0A0B] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-500">{post.platform}</p>
                    <span className="rounded bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-xs font-semibold text-orange-400">Predicted Score {post.predicted_score}</span>
                  </div>
                  <p className="mt-2 text-sm text-neutral-200">{post.hook || post.caption}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-white/10 bg-[#141416] p-5">
            <h2 className="text-lg font-semibold text-neutral-50">AI Optimization Agent Directives</h2>
            <div className="mt-4 space-y-4">
              {['insights', 'recommendations', 'nextExperiments'].map((key) => (
                <div key={key}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <ul className="mt-2 space-y-2">
                    {(data?.optimization?.[key] || []).map((item) => (
                      <li key={item} className="rounded-lg border border-white/5 bg-[#111113] px-3.5 py-2 text-xs text-neutral-300 flex items-center gap-2">
                        <span className="text-orange-500">❖</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
