import { useState } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';

const CHANNEL_OPTIONS = ['linkedin', 'x', 'instagram', 'email'];
const CADENCE_OPTIONS = ['hourly', 'daily', 'weekly'];
const DEFAULT_CADENCE = 'daily';

/**
 * The cadence to show for a stored value.
 *
 * `campaigns.cadence` is a free-form VARCHAR predating this feature, so a row
 * can hold something this select has no option for. Initialising the controlled
 * value from it directly rendered a select with nothing selected, and pressing
 * Start submitted the stored string unchanged — which the route's
 * `z.enum(['hourly','daily','weekly'])` rejects with a 400 the user has no way
 * to interpret. Fall back to the same daily default the backend's nextRunFor()
 * uses for values it does not recognise.
 */
export function displayCadence(stored) {
  const normalized = String(stored || '').toLowerCase();
  return CADENCE_OPTIONS.includes(normalized) ? normalized : DEFAULT_CADENCE;
}

/**
 * Configure the automation loop for one campaign.
 *
 * `status === 'active'` is the automation switch — the same column the
 * CONTENT_CRON scheduler filters on — so this toggle reflects real scheduler
 * state rather than a separate flag that could disagree with it.
 *
 * `next_run_at` is the second half of that test, and it is not optional.
 * `campaigns.status` defaults to 'active' at the database level, so every
 * campaign ever created — including all of them predating this feature — would
 * otherwise render as "automation running" over an empty job queue.
 * `next_run_at` is set only by activateCampaignAutomation and explicitly nulled
 * by the deactivate path, so it distinguishes a campaign someone actually
 * started from one that merely inherited the default.
 */
export default function CampaignMissionPanel({ campaign, onSubmit, isBusy = false }) {
  const isActive = campaign.status === 'active' && Boolean(campaign.next_run_at);
  const [form, setForm] = useState({
    objective: campaign.goal || '',
    targetAudience: campaign.audience || '',
    budgetRange: campaign.budget_range || '',
    cadence: displayCadence(campaign.cadence),
    channels: Array.isArray(campaign.channels) ? campaign.channels : []
  });

  const fieldId = (name) => `mission-${campaign.id}-${name}`;

  const toggleChannel = (channel) => {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(campaign.id, true, form);
  };

  return (
    <section className="rounded-xl border border-white/10 bg-[#141416] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-neutral-50">{campaign.name}</h3>
          <p className="mt-0.5 text-xs text-neutral-400">
            {campaign.niche} · {isActive ? 'automation running' : 'automation paused'}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isActive
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-neutral-500/10 text-neutral-400 border border-white/10'
          }`}
        >
          {isActive ? 'Active' : 'Paused'}
        </span>
      </div>

      <dl className="mb-4 grid grid-cols-3 gap-2 text-center">
        {[
          ['Pending', campaign.pending_jobs],
          ['Running', campaign.running_jobs],
          ['Completed', campaign.completed_jobs]
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/10 bg-[#0A0A0B] px-2 py-2">
            <dt className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</dt>
            <dd className="text-lg font-semibold text-neutral-100">{Number(value) || 0}</dd>
          </div>
        ))}
      </dl>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor={fieldId('objective')} className="mb-1 block text-xs font-medium text-neutral-300">
            Objective
          </label>
          <input
            id={fieldId('objective')}
            className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-orange-500"
            placeholder="e.g. book 20 qualified demos a month"
            value={form.objective}
            onChange={(e) => setForm({ ...form, objective: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor={fieldId('audience')} className="mb-1 block text-xs font-medium text-neutral-300">
            Target audience
          </label>
          <input
            id={fieldId('audience')}
            className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-orange-500"
            placeholder="e.g. heads of growth at B2B SaaS companies"
            value={form.targetAudience}
            onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={fieldId('budget')} className="mb-1 block text-xs font-medium text-neutral-300">
              Budget range
            </label>
            <input
              id={fieldId('budget')}
              className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-orange-500"
              placeholder="e.g. $2–5k / month"
              value={form.budgetRange}
              onChange={(e) => setForm({ ...form, budgetRange: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor={fieldId('cadence')} className="mb-1 block text-xs font-medium text-neutral-300">
              Cadence
            </label>
            <select
              id={fieldId('cadence')}
              className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3 py-2 text-sm text-neutral-100 focus:border-orange-500"
              value={form.cadence}
              onChange={(e) => setForm({ ...form, cadence: e.target.value })}
            >
              {CADENCE_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-neutral-300">Channels</legend>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_OPTIONS.map((channel) => {
              const selected = form.channels.includes(channel);
              return (
                <label
                  key={channel}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-orange-500/40 bg-orange-500/10 text-orange-400'
                      : 'border-white/10 bg-[#0A0A0B] text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {/* A real checkbox rather than a styled div, so the control is
                    * reachable by keyboard and announced with its state. */}
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selected}
                    onChange={() => toggleChannel(channel)}
                  />
                  {channel}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isBusy}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-orange-400 transition-colors disabled:opacity-50"
          >
            {isBusy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
            {isActive ? 'Update mission' : 'Start automation'}
          </button>
          {isActive && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onSubmit(campaign.id, false)}
              className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#0A0A0B] px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <Pause size={15} />
              Pause
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
