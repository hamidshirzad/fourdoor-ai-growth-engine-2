import { useEffect } from 'react';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import CampaignMissionPanel from '../components/CampaignMissionPanel';
import { useAuthStore, useAutomationStore } from '../lib/store';

// Buckets shown in the jobs list. `running` and `pending` are separate because
// they mean different things operationally: one is in flight, the other is
// waiting for its scheduled time.
const GROUPS = [
  { key: 'running', label: 'Active', tone: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { key: 'pending', label: 'Pending', tone: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { key: 'completed', label: 'Completed', tone: 'text-neutral-400 border-white/10 bg-white/5' }
];

const TYPE_LABELS = {
  content_creation: 'Content creation',
  lead_follow_up: 'Lead follow-up',
  performance_review: 'Performance review'
};

function JobRow({ job }) {
  const when = job.scheduled_for ? new Date(job.scheduled_for) : null;
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0A0A0B] px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-neutral-200">
          {TYPE_LABELS[job.type] || job.type}
        </p>
        <p className="truncate text-[11px] text-neutral-500">
          {job.campaign_name}
          {when && ` · ${when.toLocaleString()}`}
        </p>
      </div>
      {job.result_summary && (
        <span className="shrink-0 max-w-[45%] truncate text-[11px] text-neutral-400">
          {job.result_summary}
        </span>
      )}
    </li>
  );
}

export default function CampaignsPage() {
  const { token } = useAuthStore();
  const { campaigns, jobs, isLoading, fetchCampaigns, fetchJobs, setAutomation } = useAutomationStore();

  useEffect(() => {
    if (!token) return;
    fetchCampaigns(token);
    fetchJobs(token);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (campaignId, active, mission) =>
    setAutomation(campaignId, active, mission, token);

  return (
    <ProtectedRoute>
      <AppShell
        title="Campaigns"
        subtitle="Define a mission per campaign and let the automation loop run it."
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            {campaigns.length === 0 && !isLoading && (
              <p className="rounded-xl border border-white/10 bg-[#141416] p-5 text-sm text-neutral-400">
                No campaigns yet. Generating content from the dashboard creates your first one.
              </p>
            )}
            {campaigns.map((campaign) => (
              <CampaignMissionPanel
                key={campaign.id}
                campaign={campaign}
                onSubmit={handleSubmit}
                isBusy={isLoading}
              />
            ))}
          </div>

          <div className="space-y-4">
            {GROUPS.map(({ key, label, tone }) => {
              const bucket = jobs.filter((j) => j.status === key);
              return (
                <section key={key} className="rounded-xl border border-white/10 bg-[#141416] p-4">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-100">
                    {label}
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
                      {bucket.length}
                    </span>
                  </h2>
                  {bucket.length === 0 ? (
                    <p className="text-xs text-neutral-500">Nothing here yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {bucket.map((job) => <JobRow key={job.id} job={job} />)}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
