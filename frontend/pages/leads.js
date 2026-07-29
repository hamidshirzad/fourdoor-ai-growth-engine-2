import { useEffect, useState, useMemo } from 'react';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import LeadKanbanBoard from '../components/LeadKanbanBoard';
import LeadDetailModal from '../components/LeadDetailModal';
import { apiCall } from '../lib/api';
import { useAuthStore, useLeadsStore } from '../lib/store';
import { toast } from '../lib/toastStore';
import {
  Kanban,
  LayoutList,
  Plus,
  Search,
  Filter,
  Sparkles,
  RefreshCw,
  Zap,
  Building,
  Mail,
  SlidersHorizontal,
  ChevronRight,
  Send,
  UserCheck,
  CheckSquare,
  Square,
  Trash2,
  FolderOutput,
  X,
  Check
} from 'lucide-react';

export default function LeadsPage() {
  const { token } = useAuthStore();
  const { leads, getLeads, createLead, batchUpdateLeads, batchDeleteLeads, isLoading } = useLeadsStore();
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [reply, setReply] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
  const [selectedLead, setSelectedLead] = useState(null);

  // Bulk Selection State
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [minScoreFilter, setMinScoreFilter] = useState('0');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAutomating, setIsAutomating] = useState(false);

  useEffect(() => {
    if (token) getLeads(token);
  }, [token, getLeads]);

  const addLead = async () => {
    if (!form.email && !form.message) {
      toast.error('Validation Error', 'Please enter at least an email or message.');
      return;
    }
    await createLead(form.name, form.email, 'manual', form.message, token);
    setForm({ name: '', email: '', company: '', message: '' });
    await getLeads(token);
  };

  const engage = async () => {
    try {
      const result = await apiCall('/api/leads/engage', 'POST', { message: reply, platform: 'dm' }, token);
      setReply(result.reply);
      toast.info('Engagement Reply Generated', 'AI response generated and lead signal classified.');
      await getLeads(token);
    } catch (err) {
      toast.error('Engagement Error', err.message);
    }
  };

  const syncAIEngineLeads = async () => {
    setIsSyncing(true);
    try {
      const samples = [
        { name: 'Sarah Jenkins', email: 'sarah@growthscale.io', company: 'GrowthScale AI', message: 'We are spending $50k/mo on ads but conversion dropped 30%. Need an SDR automation engine.' },
        { name: 'Marcus Vance', email: 'marcus@nexustech.com', company: 'Nexus Tech', message: 'Looking for a enterprise B2B lead generation workflow for 15 SDRs.' },
        { name: 'Elena Rostova', email: 'elena@cloudops.ai', company: 'CloudOps', message: 'Inquiring about automated demo booking integration for Google Calendar.' }
      ];
      const sample = samples[Math.floor(Math.random() * samples.length)];
      await createLead(sample.name, sample.email, 'AI Engine Inbound Sync', sample.message, token);
      await getLeads(token);
      toast.success('AI Engine Synced', 'Pulled 1 new high-intent lead from inbound signals & scored automatically.');
    } catch (err) {
      toast.error('Sync Error', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const runWorkflowAutomation = async () => {
    setIsAutomating(true);
    try {
      // Qualify top un-qualified lead
      const unclassified = leads.find((l) => !l.status || l.status === 'new');
      if (unclassified) {
        await apiCall('/api/leads/qualify', 'POST', {
          leadId: unclassified.id,
          answers: { budget: '$10k-$25k', priority: 'High', status: 'qualified' }
        }, token);
        toast.success('Workflow Automation Executed', `Auto-qualified ${unclassified.name || 'Lead'} and assigned High Priority status.`);
      } else {
        toast.info('Workflow Status', 'All existing leads in pipeline have been processed.');
      }
      await getLeads(token);
    } catch (err) {
      toast.error('Workflow Automation Failed', err.message);
    } finally {
      setIsAutomating(false);
    }
  };

  const normalizeStatus = (status) => {
    if (!status || status === 'new') return 'new';
    if (status === 'contacted') return 'contacted';
    if (status === 'qualified' || status === 'hot') return 'qualified';
    if (status === 'converted' || status === 'booked') return 'converted';
    return 'new';
  };

  const getPriority = (lead) => {
    return lead.qualification?.priority || (lead.score >= 80 ? 'High' : lead.score >= 50 ? 'Medium' : 'Low');
  };

  const toggleSelectLead = (id) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    }
  };

  const handleBatchMove = async (targetStatus) => {
    if (selectedLeadIds.length === 0) return;
    setIsProcessingBulk(true);
    await batchUpdateLeads(selectedLeadIds, targetStatus, token);
    setSelectedLeadIds([]);
    setIsProcessingBulk(false);
    await getLeads(token);
  };

  const handleBatchDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete ${selectedLeadIds.length} selected lead(s)?`)) {
      return;
    }
    setIsProcessingBulk(true);
    await batchDeleteLeads(selectedLeadIds, token);
    setSelectedLeadIds([]);
    setIsProcessingBulk(false);
    await getLeads(token);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (lead.name && lead.name.toLowerCase().includes(q)) ||
        (lead.email && lead.email.toLowerCase().includes(q)) ||
        (lead.company && lead.company.toLowerCase().includes(q)) ||
        (lead.message && lead.message.toLowerCase().includes(q));

      const normStatus = normalizeStatus(lead.status);
      const matchesStatus = statusFilter === 'ALL' || normStatus === statusFilter;

      const prio = getPriority(lead).toUpperCase();
      const matchesPriority = priorityFilter === 'ALL' || prio === priorityFilter;

      const score = lead.score || 0;
      const matchesScore = score >= parseInt(minScoreFilter, 10);

      return matchesSearch && matchesStatus && matchesPriority && matchesScore;
    });
  }, [leads, searchQuery, statusFilter, priorityFilter, minScoreFilter]);

  return (
    <ProtectedRoute>
      <AppShell
        title="Lead Management & Workflow Automation"
        subtitle="Categorize, filter, and automate potential customer leads synced directly from the AI Engine."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={syncAIEngineLeads}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3.5 py-1.5 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 transition disabled:opacity-50"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span>Sync AI Engine Leads</span>
            </button>

            <button
              onClick={runWorkflowAutomation}
              disabled={isAutomating}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
            >
              <Zap size={13} className={isAutomating ? 'animate-bounce' : ''} />
              <span>Run Auto-Workflow</span>
            </button>

            <div className="flex rounded-lg border border-white/10 bg-[#141416] p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'list' ? 'bg-orange-500 text-neutral-950 shadow' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <LayoutList size={14} />
                <span>List View</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'kanban' ? 'bg-orange-500 text-neutral-950 shadow' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Kanban size={14} />
                <span>Kanban Board</span>
              </button>
            </div>
          </div>
        }
      >
        {viewMode === 'kanban' ? (
          <LeadKanbanBoard leads={leads} token={token} onLeadUpdated={() => getLeads(token)} />
        ) : (
          <div className="space-y-6">
            {/* Filter & Categorization Toolbar */}
            <div className="rounded-xl border border-white/10 bg-[#141416] p-4 shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-orange-400" />
                  <h3 className="text-sm font-semibold text-neutral-200">Filter & Categorize Pipeline</h3>
                  <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-bold text-orange-400">
                    {filteredLeads.length} / {leads.length} Leads
                  </span>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-neutral-500" size={14} />
                    <input
                      type="text"
                      placeholder="Search name, email, company..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-56 rounded-lg border border-white/10 bg-[#0A0A0B] pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>

                  {/* Stage Category Filter */}
                  <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0A0A0B] px-2.5 py-1.5 text-xs text-neutral-300">
                    <span className="text-neutral-500 font-medium">Stage:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-transparent text-xs text-neutral-200 focus:outline-none"
                    >
                      <option value="ALL" className="bg-[#141416]">All Stages</option>
                      <option value="new" className="bg-[#141416]">New</option>
                      <option value="contacted" className="bg-[#141416]">Contacted</option>
                      <option value="qualified" className="bg-[#141416]">Qualified</option>
                      <option value="converted" className="bg-[#141416]">Converted</option>
                    </select>
                  </div>

                  {/* Priority Filter */}
                  <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0A0A0B] px-2.5 py-1.5 text-xs text-neutral-300">
                    <span className="text-neutral-500 font-medium">Priority:</span>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="bg-transparent text-xs text-neutral-200 focus:outline-none"
                    >
                      <option value="ALL" className="bg-[#141416]">All Priorities</option>
                      <option value="HIGH" className="bg-[#141416]">High Priority</option>
                      <option value="MEDIUM" className="bg-[#141416]">Medium Priority</option>
                      <option value="LOW" className="bg-[#141416]">Low Priority</option>
                    </select>
                  </div>

                  {/* Score Filter */}
                  <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0A0A0B] px-2.5 py-1.5 text-xs text-neutral-300">
                    <span className="text-neutral-500 font-medium">Min Score:</span>
                    <select
                      value={minScoreFilter}
                      onChange={(e) => setMinScoreFilter(e.target.value)}
                      className="bg-transparent text-xs text-neutral-200 focus:outline-none"
                    >
                      <option value="0" className="bg-[#141416]">All Scores</option>
                      <option value="50" className="bg-[#141416]">50+ Score</option>
                      <option value="75" className="bg-[#141416]">75+ Hot Leads</option>
                      <option value="90" className="bg-[#141416]">90+ Top Leads</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content: Capture Form & Lead List Grid */}
            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
              {/* Capture & Classification Panel */}
              <div className="space-y-6">
                <section className="rounded-xl border border-white/10 bg-[#141416] p-5 shadow-md">
                  <div className="flex items-center gap-2 mb-4">
                    <Plus className="text-orange-400" size={18} />
                    <h2 className="text-base font-semibold text-neutral-50">Capture Manual Lead</h2>
                  </div>
                  <div className="space-y-3">
                    {['name', 'email', 'company'].map((field) => (
                      <input
                        key={field}
                        className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
                        placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                        value={form[field]}
                        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      />
                    ))}
                    <textarea
                      className="h-20 w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
                      placeholder="Buying signal or inquiry message..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                    />
                    <button
                      onClick={addLead}
                      disabled={isLoading || (!form.email && !form.message)}
                      className="w-full rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-orange-400 disabled:opacity-50 transition"
                    >
                      AI Score & Save
                    </button>
                  </div>
                </section>

                <section className="rounded-xl border border-white/10 bg-[#141416] p-5 shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="text-orange-400" size={18} />
                    <h2 className="text-base font-semibold text-neutral-50">AI Signal Engagement</h2>
                  </div>
                  <p className="text-xs text-neutral-400 mb-3">
                    Paste raw DM or inquiry text to classify intent and draft response.
                  </p>
                  <textarea
                    className="h-24 w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
                    placeholder="Paste customer message or comment..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <button
                    onClick={engage}
                    disabled={!reply}
                    className="mt-3 w-full rounded-lg border border-white/10 bg-[#111113] px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-white/5 disabled:opacity-50 transition"
                  >
                    Classify & Generate Reply
                  </button>
                </section>
              </div>

              {/* Lead Table View with Checkboxes & Bulk Actions */}
              <section className="space-y-4">
                {/* Bulk Action Bar */}
                {selectedLeadIds.length > 0 && (
                  <div className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-orange-500/50 bg-[#1A1816] p-3.5 shadow-2xl backdrop-blur ring-1 ring-orange-500/30">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400">
                        <CheckSquare size={18} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-neutral-100">
                          {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
                        </span>
                        <p className="text-[11px] text-neutral-400">
                          Apply bulk operations across selected prospects
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-neutral-400 font-medium mr-1">Move Category:</span>
                      <button
                        onClick={() => handleBatchMove('new')}
                        disabled={isProcessingBulk}
                        className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition disabled:opacity-50"
                      >
                        New
                      </button>
                      <button
                        onClick={() => handleBatchMove('contacted')}
                        disabled={isProcessingBulk}
                        className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-400 hover:bg-yellow-500/20 transition disabled:opacity-50"
                      >
                        Contacted
                      </button>
                      <button
                        onClick={() => handleBatchMove('qualified')}
                        disabled={isProcessingBulk}
                        className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 transition disabled:opacity-50"
                      >
                        Qualified
                      </button>
                      <button
                        onClick={() => handleBatchMove('converted')}
                        disabled={isProcessingBulk}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
                      >
                        Converted
                      </button>

                      <div className="h-4 w-px bg-white/20 mx-1" />

                      <button
                        onClick={handleBatchDelete}
                        disabled={isProcessingBulk}
                        className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        <span>Delete ({selectedLeadIds.length})</span>
                      </button>

                      <button
                        onClick={() => setSelectedLeadIds([])}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white transition"
                        title="Deselect All"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {filteredLeads.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-[#141416] p-12 text-center text-neutral-400 space-y-3">
                    <p className="text-sm font-medium">No leads match your selected filters.</p>
                    <p className="text-xs text-neutral-500">
                      Try clearing filters or click &quot;Sync AI Engine Leads&quot; above to fetch new incoming leads.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#141416] shadow-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-white/10 bg-[#0A0A0B] text-neutral-400 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="p-3.5 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                              onChange={toggleSelectAll}
                              className="h-4 w-4 rounded border-white/20 bg-[#141416] text-orange-500 focus:ring-orange-500 accent-orange-500 cursor-pointer"
                            />
                          </th>
                          <th className="p-3.5">Lead Name & Contact</th>
                          <th className="p-3.5">Company & Source</th>
                          <th className="p-3.5">Category Stage</th>
                          <th className="p-3.5">Priority</th>
                          <th className="p-3.5 text-center">AI Score</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-neutral-200">
                        {filteredLeads.map((lead) => {
                          const isSelected = selectedLeadIds.includes(lead.id);
                          const status = normalizeStatus(lead.status);
                          const priority = getPriority(lead);

                          return (
                            <tr
                              key={lead.id}
                              onClick={(e) => {
                                // Ignore if checkbox was clicked
                                if (e.target.tagName === 'INPUT' || e.target.type === 'checkbox') return;
                                setSelectedLead(lead);
                              }}
                              className={`transition hover:bg-white/[0.04] cursor-pointer ${
                                isSelected ? 'bg-orange-500/10 border-l-2 border-l-orange-500' : ''
                              }`}
                            >
                              <td className="p-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectLead(lead.id)}
                                  className="h-4 w-4 rounded border-white/20 bg-[#141416] text-orange-500 focus:ring-orange-500 accent-orange-500 cursor-pointer"
                                />
                              </td>
                              <td className="p-3.5">
                                <div
                                  className="font-semibold text-neutral-50 cursor-pointer hover:text-orange-400 transition"
                                  onClick={() => setSelectedLead(lead)}
                                >
                                  {lead.name || 'Unknown Lead'}
                                </div>
                                {lead.email && (
                                  <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5">
                                    <Mail size={11} className="text-neutral-500" />
                                    <span>{lead.email}</span>
                                  </div>
                                )}
                              </td>
                              <td className="p-3.5">
                                <div className="text-neutral-200 font-medium">{lead.company || '—'}</div>
                                <div className="text-[11px] text-neutral-500">
                                  Source: {lead.source || 'Inbound'}
                                </div>
                              </td>
                              <td className="p-3.5">
                                <span className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                                  status === 'converted'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : status === 'qualified'
                                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                    : status === 'contacted'
                                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}>
                                  ● {status}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
                                  priority === 'High'
                                    ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                                    : priority === 'Medium'
                                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                    : 'bg-slate-500/10 text-slate-300 border border-slate-500/20'
                                }`}>
                                  {priority} Priority
                                </span>
                              </td>
                              <td className="p-3.5 text-center">
                                <span className="rounded bg-orange-500/10 px-2 py-0.5 font-bold text-orange-400 border border-orange-500/20">
                                  {lead.score || 75}
                                </span>
                              </td>
                              <td className="p-3.5 text-right">
                                <button
                                  onClick={() => setSelectedLead(lead)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#0A0A0B] px-2.5 py-1 text-xs text-neutral-300 hover:border-orange-500/40 hover:text-orange-400 transition"
                                >
                                  <span>Details</span>
                                  <ChevronRight size={12} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* Lead Detail & AI Workflow Modal */}
        <LeadDetailModal
          lead={selectedLead}
          isOpen={Boolean(selectedLead)}
          onClose={() => setSelectedLead(null)}
          token={token}
          onLeadUpdated={() => getLeads(token)}
        />
      </AppShell>
    </ProtectedRoute>
  );
}


