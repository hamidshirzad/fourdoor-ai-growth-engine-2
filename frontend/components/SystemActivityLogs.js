import { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Flame,
  Zap,
  Terminal,
  Database,
  Radio,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Bot,
  Copy,
  Check,
  Plus
} from 'lucide-react';
import { apiCall } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { toast } from '../lib/toastStore';
import ActivitySummaryDashboard from './ActivitySummaryDashboard';

const AGENT_LIST = [
  { key: 'all', label: 'All Agents' },
  { key: 'contentAgent', label: 'Content Agent' },
  { key: 'salesAgent', label: 'Sales Agent' },
  { key: 'outreachAgent', label: 'Outreach Agent' },
  { key: 'engagementAgent', label: 'Engagement Agent' },
  { key: 'analyticsAgent', label: 'Analytics Agent' },
  { key: 'securityAgent', label: 'Security Agent' },
  { key: 'scheduler', label: 'Scheduler' }
];

const SAMPLE_SIMULATED_ACTIONS = [
  {
    agent: 'contentAgent',
    action: 'campaign_content_generation',
    status: 'completed',
    input: { niche: 'SaaS B2B Automation', goal: 'Lead Lead Gen', postsCount: 3 },
    output: { status: 'success', draftsGenerated: 3, channels: ['LinkedIn', 'Twitter'] }
  },
  {
    agent: 'salesAgent',
    action: 'lead_qualification_score',
    status: 'completed',
    input: { leadId: 'lead_9812', email: 'v.chen@techcorp.com', company: 'TechCorp Solutions' },
    output: { score: 92, qualified: true, tier: 'HOT', recommendation: 'Schedule Demo Immediately' }
  },
  {
    agent: 'outreachAgent',
    action: 'dispatch_template_sequence',
    status: 'completed',
    input: { templateId: 'tpl_intro_01', leadEmail: 's.jenkins@aetheria.io' },
    output: { sent: true, provider: 'Nodemailer/SMTP', messageId: 'msg_881923' }
  },
  {
    agent: 'analyticsAgent',
    action: 'daily_funnel_optimization',
    status: 'completed',
    input: { period: 'last_24h', metric: 'conversion_rate' },
    output: { optimalPostingTime: '10:00 AM EST', projectedConversionDelta: '+14.2%' }
  },
  {
    agent: 'securityAgent',
    action: 'content_compliance_scan',
    status: 'completed',
    input: { type: 'social_post', length: 420 },
    output: { passed: true, score: 98, flags: 0, recommendations: [] }
  }
];

// How often the auto-refresh poll re-reads the log endpoint.
//
// This used to be a Firestore onSnapshot subscription, which pushed updates the
// instant a document changed. The browser no longer talks to Firestore directly
// — activity_logs is closed to clients because an open read exposed every user's
// logs to everyone — so "live" is now a poll against GET /api/activity/logs,
// where the JWT scopes the query to the signed-in user.
const REFRESH_INTERVAL_MS = 15_000;

export default function SystemActivityLogs() {
  const { token } = useAuthStore();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveStream, setLiveStream] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedActionType, setSelectedActionType] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchLogs = async ({ showSpinner = true } = {}) => {
    if (!token) return;
    if (showSpinner) setLoading(true);
    try {
      const data = await apiCall(`/api/activity/logs?limit=100`, 'GET', null, token);
      setLogs(data);
    } catch (err) {
      console.error('Activity log fetch error:', err);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    fetchLogs();
    if (!liveStream) return undefined;
    // Background polls do not raise the spinner — a refresh every 15s that
    // blanks the table would make the list unreadable.
    const id = setInterval(() => fetchLogs({ showSpinner: false }), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [liveStream, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSimulateAutomatedAction = async () => {
    setIsSimulating(true);
    const randomIndex = Math.floor(Math.random() * SAMPLE_SIMULATED_ACTIONS.length);
    const sample = SAMPLE_SIMULATED_ACTIONS[randomIndex];

    try {
      // Trigger real backend work rather than writing a log document directly.
      // The browser used to call addFirestoreActivityLog() here, which only
      // worked while activity_logs accepted unauthenticated writes — i.e. while
      // anyone on the internet could forge entries in it. Driving a real agent
      // run produces a genuine log through the backend instead.
      //
      // All three fields are required: generateSchema on /api/content/generate
      // declares niche, audience and goal as `z.string().min(2)`. Omitting
      // audience made every click a 400, so the button could never produce the
      // log it promises.
      await apiCall(
        '/api/content/generate',
        'POST',
        { niche: 'SaaS Demo', audience: 'B2B SaaS founders', goal: 'Test Trigger' },
        token
      );

      toast.success(
        'Automated Action Logged',
        `Triggered a real [${sample.agent}] run; its log will appear on the next sync.`
      );

      await fetchLogs({ showSpinner: false });
    } catch (err) {
      toast.error('Simulation Error', err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopyPayload = (log) => {
    const payload = JSON.stringify({ input: log.input, output: log.output }, null, 2);
    navigator.clipboard.writeText(payload);
    setCopiedId(log.id);
    toast.info('Payload Copied', 'JSON payload copied to clipboard.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtering
  const filteredLogs = logs.filter((log) => {
    const matchesAgent = selectedAgent === 'all' || log.agent === selectedAgent;
    const matchesStatus = selectedStatus === 'all' || log.status === selectedStatus;

    const matchesActionType =
      selectedActionType === 'all' ||
      (log.action && log.action.toLowerCase().includes(selectedActionType.toLowerCase())) ||
      (log.action && log.action.replace(/_/g, ' ').toLowerCase().includes(selectedActionType.toLowerCase()));

    const query = searchQuery.toLowerCase();
    const strInput = typeof log.input === 'string' ? log.input : JSON.stringify(log.input || '');
    const strOutput = typeof log.output === 'string' ? log.output : JSON.stringify(log.output || '');

    const matchesSearch =
      !searchQuery ||
      (log.agent && log.agent.toLowerCase().includes(query)) ||
      (log.action && log.action.toLowerCase().includes(query)) ||
      strInput.toLowerCase().includes(query) ||
      strOutput.toLowerCase().includes(query);

    return matchesAgent && matchesStatus && matchesActionType && matchesSearch;
  });

  const totalCount = logs.length;
  const completedCount = logs.filter((l) => l.status === 'completed' || l.status === 'success').length;
  const failedCount = logs.filter((l) => l.status === 'failed' || l.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Top Banner: source indicator & controls */}
      <div className="rounded-2xl border border-white/10 bg-[#141416] p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Flame size={18} />
              </span>
              <h2 className="text-lg font-bold text-neutral-50">System Automated Activity Logs</h2>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                <Radio size={12} className="animate-pulse" />
                <span>{liveStream ? 'Auto-refreshing' : 'Manual refresh'}</span>
              </span>
            </div>

            <p className="text-xs text-neutral-400 font-mono">
              Source:{' '}
              <span className="text-orange-400 font-bold font-mono">
                GET /api/activity/logs
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Simulate Trigger Button */}
            <button
              onClick={handleSimulateAutomatedAction}
              disabled={isSimulating}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3.5 py-2 text-xs font-bold text-neutral-950 hover:brightness-110 transition shadow-lg disabled:opacity-50"
            >
              <Zap size={14} className={isSimulating ? 'animate-spin' : ''} />
              <span>{isSimulating ? 'Logging...' : 'Simulate Action Log'}</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => fetchLogs()}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0A0A0B] px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
              title="Reload activity logs now"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-orange-400' : ''} />
              <span>Sync Now</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/5 text-xs">
          <div className="rounded-xl bg-[#0A0A0B] p-3 border border-white/5 space-y-0.5">
            <span className="text-neutral-500 text-[11px]">Total Action Logs</span>
            <div className="text-base font-bold text-neutral-100">{totalCount}</div>
          </div>

          <div className="rounded-xl bg-[#0A0A0B] p-3 border border-white/5 space-y-0.5">
            <span className="text-neutral-500 text-[11px]">Successfully Executed</span>
            <div className="text-base font-bold text-emerald-400">{completedCount}</div>
          </div>

          <div className="rounded-xl bg-[#0A0A0B] p-3 border border-white/5 space-y-0.5">
            <span className="text-neutral-500 text-[11px]">Failed / Warnings</span>
            <div className="text-base font-bold text-red-400">{failedCount}</div>
          </div>

          <div className="rounded-xl bg-[#0A0A0B] p-3 border border-white/5 space-y-0.5">
            <span className="text-neutral-500 text-[11px]">Last Sync Timestamp</span>
            <div className="text-xs font-mono text-neutral-300 pt-0.5">
              {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Dashboard Component with Pie Chart Event Visualization */}
      <ActivitySummaryDashboard
        logs={logs}
        activeFilter={selectedActionType !== 'all' ? selectedActionType : null}
        onFilterAction={(type) => setSelectedActionType((prev) => (prev === type ? 'all' : type))}
      />

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#141416] p-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-3 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by agent, action name, or JSON input/output..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0A0A0B] pl-10 pr-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Agent Filter Dropdown */}
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#0A0A0B] px-3 py-2 text-xs text-neutral-200 focus:border-orange-500 focus:outline-none font-medium"
          >
            {AGENT_LIST.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#0A0A0B] px-3 py-2 text-xs text-neutral-200 focus:border-orange-500 focus:outline-none font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed / Success</option>
            <option value="failed">Failed / Error</option>
          </select>

          {/* Live Stream Toggle */}
          <button
            onClick={() => setLiveStream(!liveStream)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              liveStream
                ? 'bg-orange-500/15 text-orange-400 border-orange-500/40'
                : 'bg-[#0A0A0B] text-neutral-400 border-white/10 hover:text-white'
            }`}
          >
            <Radio size={13} className={liveStream ? 'animate-pulse text-orange-400' : ''} />
            <span>{liveStream ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
          </button>
        </div>
      </div>

      {/* Activity Logs Table */}
      <div className="rounded-2xl border border-white/10 bg-[#141416] shadow-xl overflow-hidden">
        <div className="hidden md:grid md:grid-cols-[180px_220px_1fr_120px_100px] border-b border-white/10 bg-[#0A0A0B] px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-neutral-400">
          <span>Agent</span>
          <span>Action</span>
          <span>Output Summary</span>
          <span>Status</span>
          <span className="text-right">Details</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-orange-400" />
            <p className="text-xs text-neutral-400 font-mono">Fetching activity logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 p-6">
            <Bot size={36} className="text-neutral-600" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-neutral-200">No Activity Logs Found</h3>
              <p className="text-xs text-neutral-400 max-w-md">
                No logs matched your search or filters. Click "Simulate Action Log" to trigger a real agent run and generate one.
              </p>
            </div>
            <button
              onClick={handleSimulateAutomatedAction}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-orange-500/20 border border-orange-500/30 px-3.5 py-2 text-xs font-semibold text-orange-400 hover:bg-orange-500/30 transition"
            >
              <Plus size={14} />
              <span>Simulate Automated Action</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const isSuccess = log.status === 'completed' || log.status === 'success';
              // A missing timestamp reads as missing. This used to fall back to
              // `new Date()`, so an entry with no createdAt claimed to have
              // happened at the moment of render — and its time moved on every
              // 15s poll. The endpoint now normalises Postgres `created_at` to
              // `createdAt`, so this branch should be unreachable in practice.
              const createdDate = log.createdAt ? new Date(log.createdAt) : null;
              const hasValidTime = createdDate && !Number.isNaN(createdDate.getTime());

              const formattedTime = hasValidTime
                ? createdDate.toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })
                : 'time unknown';

              let outputStr = '';
              try {
                outputStr = typeof log.output === 'object' ? JSON.stringify(log.output) : String(log.output || '');
              } catch {
                outputStr = String(log.output || '');
              }

              return (
                <div key={log.id} className="transition hover:bg-white/[0.02]">
                  {/* Row Summary */}
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="grid grid-cols-1 md:grid-cols-[180px_220px_1fr_120px_100px] gap-3 px-5 py-3.5 text-xs items-center cursor-pointer"
                  >
                    {/* Agent */}
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <Bot size={13} />
                      </span>
                      <div>
                        <span className="font-bold text-neutral-100 block">{log.agent || 'systemAgent'}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">{formattedTime}</span>
                      </div>
                    </div>

                    {/* Action */}
                    <div>
                      <span className="font-semibold text-neutral-300 font-mono text-[11px]">
                        {log.action}
                      </span>
                    </div>

                    {/* Output summary */}
                    <div className="truncate text-neutral-400 font-mono text-[11px]">
                      {outputStr || '{ "status": "ok" }'}
                    </div>

                    {/* Status badge */}
                    <div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isSuccess
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {isSuccess ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                        <span>{log.status || 'done'}</span>
                      </span>
                    </div>

                    {/* Expand Toggle */}
                    <div className="text-right flex items-center justify-end gap-2 text-neutral-500">
                      <span className="text-[11px] font-medium hidden sm:inline">Inspect</span>
                      {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </div>
                  </div>

                  {/* Expanded JSON Inspector Drawer */}
                  {isExpanded && (
                    <div className="bg-[#0A0A0B] px-6 py-4 border-t border-white/5 text-xs space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <Terminal size={14} className="text-orange-400" />
                          <span className="font-bold text-neutral-200">Execution Context Payload Inspector</span>
                          <span className="text-neutral-500 font-mono">ID: {log.id}</span>
                        </div>

                        <button
                          onClick={() => handleCopyPayload(log)}
                          className="flex items-center gap-1 text-neutral-400 hover:text-white transition"
                        >
                          {copiedId === log.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span>{copiedId === log.id ? 'Copied JSON!' : 'Copy JSON'}</span>
                        </button>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 pt-1 font-mono text-[11px]">
                        {/* Input Payload */}
                        <div className="space-y-1">
                          <span className="text-neutral-500 font-sans font-semibold">Input Arguments:</span>
                          <pre className="rounded-xl border border-white/10 bg-[#141416] p-3 text-neutral-300 overflow-x-auto leading-relaxed max-h-48">
                            {typeof log.input === 'object'
                              ? JSON.stringify(log.input, null, 2)
                              : log.input || '{}'}
                          </pre>
                        </div>

                        {/* Output Payload */}
                        <div className="space-y-1">
                          <span className="text-neutral-500 font-sans font-semibold">Agent Result Payload:</span>
                          <pre className="rounded-xl border border-white/10 bg-[#141416] p-3 text-emerald-300 overflow-x-auto leading-relaxed max-h-48">
                            {typeof log.output === 'object'
                              ? JSON.stringify(log.output, null, 2)
                              : log.output || '{}'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
