import { useState, useMemo } from 'react';
import {
  MoreHorizontal,
  ArrowRight,
  ArrowLeft,
  Mail,
  Building,
  Sparkles,
  CheckCircle2,
  Settings2,
  Search,
  Filter,
  Plus,
  GripVertical,
  DollarSign,
  TrendingUp,
  UserCheck,
  X,
  Layers
} from 'lucide-react';
import { apiCall } from '../lib/api';
import { toast } from '../lib/toastStore';
import LeadDetailModal from './LeadDetailModal';

const COLUMNS = [
  { id: 'new', label: 'New Leads', color: 'border-blue-500/30 bg-blue-500/10 text-blue-400', badgeColor: 'bg-blue-500/20 text-blue-300' },
  { id: 'contacted', label: 'Contacted', color: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400', badgeColor: 'bg-yellow-500/20 text-yellow-300' },
  { id: 'qualified', label: 'Qualified', color: 'border-orange-500/30 bg-orange-500/10 text-orange-400', badgeColor: 'bg-orange-500/20 text-orange-300' },
  { id: 'converted', label: 'Converted', color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', badgeColor: 'bg-emerald-500/20 text-emerald-300' }
];

export default function LeadKanbanBoard({ leads = [], token, onLeadUpdated }) {
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('score_desc');

  // Quick Add Lead Modal State
  const [quickAddColumn, setQuickAddColumn] = useState(null);
  const [quickLeadForm, setQuickLeadForm] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
    budget: '$10,000'
  });
  const [isSubmittingQuickLead, setIsSubmittingQuickLead] = useState(false);

  const normalizeStatus = (status) => {
    if (!status || status === 'new') return 'new';
    if (status === 'contacted') return 'contacted';
    if (status === 'qualified' || status === 'hot' || status === 'warm') return 'qualified';
    if (status === 'converted' || status === 'booked') return 'converted';
    return 'new';
  };

  const getPriority = (lead) => {
    return lead.qualification?.priority || (lead.score >= 80 ? 'High' : lead.score >= 50 ? 'Medium' : 'Low');
  };

  const getPriorityBadgeStyle = (priority) => {
    switch ((priority || '').toLowerCase()) {
      case 'high':
        return 'bg-rose-500/15 text-rose-300 border border-rose-500/30';
      case 'medium':
        return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
      case 'low':
      default:
        return 'bg-slate-500/15 text-slate-300 border border-slate-500/30';
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    setUpdatingId(leadId);
    try {
      await apiCall(`/api/leads/qualify`, 'POST', { leadId, answers: { status: newStatus } }, token);
      toast.success('Lead Pipeline Updated', `Moved lead to stage: ${newStatus.toUpperCase()}`);
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      toast.error('Update Failed', err.message);
    } finally {
      setUpdatingId(null);
      setDraggedLeadId(null);
      setDragOverColumnId(null);
    }
  };

  const moveLead = (lead, direction) => {
    const stages = ['new', 'contacted', 'qualified', 'converted'];
    const currentStage = normalizeStatus(lead.status);
    const currentIndex = stages.indexOf(currentStage);
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < stages.length) {
      handleStatusChange(lead.id, stages[nextIndex]);
    }
  };

  const handlePriorityChange = async (leadId, newPriority) => {
    setUpdatingId(leadId);
    try {
      await apiCall(`/api/leads/qualify`, 'POST', { leadId, answers: { priority: newPriority } }, token);
      toast.success('Priority Updated', `Set priority to ${newPriority}`);
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      toast.error('Update Failed', err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Quick Add Lead Handler
  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();
    if (!quickLeadForm.name && !quickLeadForm.email) {
      toast.error('Validation Error', 'Please enter at least a lead name or email address.');
      return;
    }

    setIsSubmittingQuickLead(true);
    try {
      const res = await apiCall('/api/leads/create', 'POST', {
        name: quickLeadForm.name,
        email: quickLeadForm.email,
        company: quickLeadForm.company,
        message: quickLeadForm.message,
        budget: quickLeadForm.budget,
        source: 'Kanban Quick Add'
      }, token);

      const createdLead = res.lead;
      if (createdLead && quickAddColumn && quickAddColumn !== 'new') {
        await apiCall('/api/leads/qualify', 'POST', {
          leadId: createdLead.id,
          answers: { status: quickAddColumn }
        }, token);
      }

      toast.success('Lead Added to Pipeline', `Created ${quickLeadForm.name || 'Lead'} in ${quickAddColumn.toUpperCase()}`);
      setQuickAddColumn(null);
      setQuickLeadForm({ name: '', email: '', company: '', message: '', budget: '$10,000' });
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      toast.error('Failed to create lead', err.message);
    } finally {
      setIsSubmittingQuickLead(false);
    }
  };

  // Filtered and Sorted Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (lead.name && lead.name.toLowerCase().includes(q)) ||
        (lead.email && lead.email.toLowerCase().includes(q)) ||
        (lead.company && lead.company.toLowerCase().includes(q)) ||
        (lead.message && lead.message.toLowerCase().includes(q));

      // Priority filter
      const p = getPriority(lead).toUpperCase();
      const matchesPriority = priorityFilter === 'ALL' || p === priorityFilter;

      return matchesSearch && matchesPriority;
    }).sort((a, b) => {
      if (sortBy === 'score_desc') return (b.score || 0) - (a.score || 0);
      if (sortBy === 'score_asc') return (a.score || 0) - (b.score || 0);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });
  }, [leads, searchQuery, priorityFilter, sortBy]);

  // Overall Board Stats
  const stats = useMemo(() => {
    const total = leads.length;
    const converted = leads.filter((l) => normalizeStatus(l.status) === 'converted').length;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;
    const highPriorityCount = leads.filter((l) => getPriority(l) === 'High').length;
    const avgScore = total > 0 ? Math.round(leads.reduce((acc, l) => acc + (l.score || 70), 0) / total) : 0;

    return { total, converted, conversionRate, highPriorityCount, avgScore };
  }, [leads]);

  return (
    <div className="space-y-5">
      {/* Search, Filter, and Pipeline Performance Summary Header */}
      <div className="rounded-xl border border-white/10 bg-[#141416] p-4 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Quick Metrics */}
          <div className="flex items-center gap-6 divide-x divide-white/10">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
                <Layers size={18} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Total Leads</p>
                <p className="text-sm font-bold text-neutral-50">{stats.total}</p>
              </div>
            </div>

            <div className="pl-6 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <TrendingUp size={18} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Conversion Rate</p>
                <p className="text-sm font-bold text-emerald-400">{stats.conversionRate}%</p>
              </div>
            </div>

            <div className="pl-6 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">High Priority</p>
                <p className="text-sm font-bold text-rose-400">{stats.highPriorityCount}</p>
              </div>
            </div>

            <div className="pl-6 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <UserCheck size={18} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Avg Lead Score</p>
                <p className="text-sm font-bold text-neutral-50">{stats.avgScore} / 100</p>
              </div>
            </div>
          </div>

          {/* Controls: Search, Priority Filter & Sorting */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-neutral-500" size={14} />
              <input
                type="text"
                placeholder="Search leads, email, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 rounded-lg border border-white/10 bg-[#0A0A0B] pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:border-orange-500 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0A0A0B] px-2.5 py-1.5 text-xs text-neutral-300">
              <Filter size={13} className="text-neutral-400" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-transparent text-xs text-neutral-200"
              >
                <option value="ALL" className="bg-[#141416]">All Priorities</option>
                <option value="HIGH" className="bg-[#141416]">High Priority</option>
                <option value="MEDIUM" className="bg-[#141416]">Medium Priority</option>
                <option value="LOW" className="bg-[#141416]">Low Priority</option>
              </select>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#0A0A0B] px-3 py-1.5 text-xs text-neutral-300 focus:border-orange-500"
            >
              <option value="score_desc" className="bg-[#141416]">Sort by Highest Score</option>
              <option value="score_asc" className="bg-[#141416]">Sort by Lowest Score</option>
              <option value="name" className="bg-[#141416]">Sort by Lead Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Kanban Columns */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const columnLeads = filteredLeads.filter((l) => normalizeStatus(l.status) === col.id);
          const isDragTarget = dragOverColumnId === col.id;

          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-xl border transition-all duration-200 bg-[#141416] ${
                isDragTarget
                  ? 'border-orange-500/80 ring-2 ring-orange-500/40 bg-orange-500/5 shadow-xl'
                  : 'border-white/10'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${col.color}`}>
                    {col.label}
                  </span>
                  <span className="text-xs font-bold text-neutral-400">({columnLeads.length})</span>
                </div>

                <button
                  onClick={() => setQuickAddColumn(col.id)}
                  className="flex items-center gap-1 rounded border border-white/10 bg-[#111113] px-2 py-1 text-[11px] font-semibold text-neutral-300 hover:border-orange-500/40 hover:text-orange-400 transition"
                  title={`Quick add lead to ${col.label}`}
                >
                  <Plus size={13} />
                  <span>Add Lead</span>
                </button>
              </div>

              {/* Column Cards Container (Drop Zone) */}
              <div
                className="flex-1 space-y-3 p-3 min-h-[460px] max-h-[680px] overflow-y-auto"
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverColumnId !== col.id) {
                    setDragOverColumnId(col.id);
                  }
                }}
                onDragLeave={(e) => {
                  // Ensure dragLeave wasn't triggered by moving over a child element
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setDragOverColumnId(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverColumnId(null);
                  const leadId = e.dataTransfer.getData('text/plain');
                  if (leadId) {
                    const leadToMove = leads.find((l) => l.id === leadId);
                    if (leadToMove && normalizeStatus(leadToMove.status) !== col.id) {
                      handleStatusChange(leadId, col.id);
                    }
                  }
                }}
              >
                {columnLeads.length === 0 ? (
                  <div
                    className={`flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed transition p-4 text-center ${
                      isDragTarget
                        ? 'border-orange-500/60 bg-orange-500/10 text-orange-300'
                        : 'border-white/10 text-neutral-500'
                    }`}
                  >
                    <p className="text-xs font-medium">No leads in {col.label}</p>
                    <p className="mt-1 text-[11px] text-neutral-500">Drag & drop cards here or click &quot;Add Lead&quot; above.</p>
                  </div>
                ) : (
                  columnLeads.map((lead) => {
                    const currentStage = normalizeStatus(lead.status);
                    const isUpdating = updatingId === lead.id;
                    const isBeingDragged = draggedLeadId === lead.id;

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedLeadId(lead.id);
                          e.dataTransfer.setData('text/plain', lead.id);
                        }}
                        onDragEnd={() => {
                          setDraggedLeadId(null);
                          setDragOverColumnId(null);
                        }}
                        className={`group relative rounded-xl border border-white/10 bg-[#111113] p-4 transition-all hover:border-orange-500/50 hover:shadow-lg cursor-grab active:cursor-grabbing ${
                          isUpdating ? 'opacity-40 pointer-events-none' : ''
                        } ${isBeingDragged ? 'opacity-30 scale-95 border-orange-500' : ''}`}
                      >
                        {/* Drag Handle & Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <GripVertical className="text-neutral-600 mt-0.5 group-hover:text-neutral-400 transition" size={14} />
                            <div className="cursor-pointer" onClick={() => setSelectedLead(lead)}>
                              <h3 className="font-semibold text-neutral-100 text-sm truncate max-w-[150px] group-hover:text-orange-400 transition">
                                {lead.name || 'Anonymous Lead'}
                              </h3>
                              <p className="text-[11px] text-neutral-400 truncate max-w-[150px]">
                                {lead.company || lead.email || lead.source || 'Inbound'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-orange-500/10 px-2 py-0.5 text-[11px] font-bold text-orange-400 border border-orange-500/20" title="Qualification Score">
                              {lead.score || 75}
                            </span>
                            <button
                              onClick={() => setSelectedLead(lead)}
                              className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-neutral-200 transition"
                              title="Lead Details & Actions"
                            >
                              <Settings2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Email or Source */}
                        {lead.email && (
                          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-neutral-400 truncate">
                            <Mail size={12} className="text-neutral-500" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                        )}

                        {/* Message Preview */}
                        {lead.message && (
                          <p className="mt-2 text-xs text-neutral-300 line-clamp-2 leading-relaxed bg-black/20 p-2 rounded border border-white/5 italic">
                            &ldquo;{lead.message}&rdquo;
                          </p>
                        )}

                        {/* Priority Pill & Selector */}
                        <div className="mt-3 flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold ${getPriorityBadgeStyle(getPriority(lead))}`}>
                            ● {getPriority(lead)} Priority
                          </span>

                          <select
                            value={getPriority(lead)}
                            onChange={(e) => handlePriorityChange(lead.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border border-white/10 bg-[#0A0A0B] px-1.5 py-0.5 text-[10px] text-neutral-300 focus:border-orange-500"
                          >
                            <option value="High" className="bg-[#141416]">High</option>
                            <option value="Medium" className="bg-[#141416]">Medium</option>
                            <option value="Low" className="bg-[#141416]">Low</option>
                          </select>
                        </div>

                        {/* Stage Controls & Direction Buttons */}
                        <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-white/5">
                          <button
                            onClick={() => moveLead(lead, 'prev')}
                            disabled={currentStage === 'new'}
                            className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-neutral-100 disabled:opacity-20 disabled:hover:bg-transparent transition"
                            title="Move to Previous Stage"
                          >
                            <ArrowLeft size={14} />
                          </button>

                          <select
                            value={currentStage}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className="rounded border border-white/10 bg-[#0A0A0B] px-2 py-1 text-[11px] text-neutral-200 focus:border-orange-500"
                          >
                            <option value="new" className="bg-[#141416]">New</option>
                            <option value="contacted" className="bg-[#141416]">Contacted</option>
                            <option value="qualified" className="bg-[#141416]">Qualified</option>
                            <option value="converted" className="bg-[#141416]">Converted</option>
                          </select>

                          <button
                            onClick={() => moveLead(lead, 'next')}
                            disabled={currentStage === 'converted'}
                            className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-neutral-100 disabled:opacity-20 disabled:hover:bg-transparent transition"
                            title="Move to Next Stage"
                          >
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Lead Creation Modal */}
      {quickAddColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141416] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Plus className="text-orange-500" size={18} />
                <h3 className="font-semibold text-neutral-50 text-base">
                  Add Lead to <span className="text-orange-400 uppercase">{quickAddColumn}</span> Stage
                </h3>
              </div>
              <button
                onClick={() => setQuickAddColumn(null)}
                className="rounded p-1 text-neutral-400 hover:bg-white/5 hover:text-neutral-200 transition"
            aria-label="Cancel quick add"
          >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Lead / Contact Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alexandra Vance"
                  value={quickLeadForm.name}
                  onChange={(e) => setQuickLeadForm({ ...quickLeadForm, name: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3 py-2 text-xs text-neutral-100 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="alex@acme.com"
                  value={quickLeadForm.email}
                  onChange={(e) => setQuickLeadForm({ ...quickLeadForm, email: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3 py-2 text-xs text-neutral-100 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Company / Organization</label>
                <input
                  type="text"
                  placeholder="Acme Growth Inc."
                  value={quickLeadForm.company}
                  onChange={(e) => setQuickLeadForm({ ...quickLeadForm, company: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3 py-2 text-xs text-neutral-100 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Buying Signal / Initial Notes</label>
                <textarea
                  rows={2}
                  placeholder="Requested demo for sales team automation..."
                  value={quickLeadForm.message}
                  onChange={(e) => setQuickLeadForm({ ...quickLeadForm, message: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#0A0A0B] px-3 py-2 text-xs text-neutral-100 focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setQuickAddColumn(null)}
                  className="rounded border border-white/10 bg-[#111113] px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuickLead}
                  className="rounded bg-orange-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-orange-400 disabled:opacity-50 transition"
                >
                  {isSubmittingQuickLead ? 'Saving...' : 'Add to Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Detail & Notification Settings Modal */}
      <LeadDetailModal
        lead={selectedLead}
        isOpen={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        token={token}
        onLeadUpdated={onLeadUpdated}
      />
    </div>
  );
}


