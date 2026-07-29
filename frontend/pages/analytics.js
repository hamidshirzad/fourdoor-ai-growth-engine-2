import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import StatCard from '../components/StatCard';
import { apiCall } from '../lib/api';
import { useAuthStore } from '../lib/store';

export default function AnalyticsPage() {
  const { token } = useAuthStore();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (token) apiCall('/api/analytics/optimization', 'GET', null, token).then(setData).catch(console.error);
  }, [token]);

  const totals = data?.analytics?.totals || {};
  const sourceData = data?.analytics?.leadsBySource || [];

  return (
    <ProtectedRoute>
      <AppShell title="Analytics" subtitle="Track engagement rate, CTR, conversion, top posts, and AI-selected next experiments.">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Impressions" value={totals.impressions || 0} />
          <StatCard label="CTR" value={`${totals.ctr || 0}%`} />
          <StatCard label="Conversion" value={`${totals.conversion_rate || 0}%`} />
          <StatCard label="Qualified Leads" value={totals.qualified_leads || 0} />
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded border border-white/10 bg-[#141416] p-5">
            <h2 className="text-lg font-semibold text-neutral-50">Leads by Source</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="source" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#047857" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="rounded border border-white/10 bg-[#141416] p-5">
            <h2 className="text-lg font-semibold text-neutral-50">Recommendations</h2>
            <div className="mt-4 space-y-2">
              {(data?.optimization?.recommendations || []).map((item) => (
                <p key={item} className="rounded bg-[#111113] px-3 py-2 text-sm text-neutral-300">{item}</p>
              ))}
            </div>
          </section>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
