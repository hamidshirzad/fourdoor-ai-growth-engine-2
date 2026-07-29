import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Mail,
  Building,
  Sparkles,
  Bell,
  Calendar,
  Globe,
  MessageSquare,
  StickyNote,
  Send,
  Clock,
  User,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Sliders,
  DollarSign,
  Tag,
  TrendingUp
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { apiCall } from '../lib/api';
import { toast } from '../lib/toastStore';

export default function LeadDetailModal({ lead, isOpen, onClose, token, onLeadUpdated }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'engagement', 'notes'
  const [status, setStatus] = useState('new');
  const [priority, setPriority] = useState('Medium');
  const [notifyOnConverted, setNotifyOnConverted] = useState(true);

  // Notes State
  const [notesList, setNotesList] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');

  // Messages / Engagement State
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [messagePlatform, setMessagePlatform] = useState('email');

  const [isSaving, setIsSaving] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // 30-Day Engagement History Line Chart Data
  const engagementChartData = useMemo(() => {
    const now = new Date();
    const countMap = {};

    if (Array.isArray(messages)) {
      messages.forEach((msg) => {
        if (!msg.created_at) return;
        const d = new Date(msg.created_at);
        if (isNaN(d.getTime())) return;
        const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
        if (!countMap[key]) {
          countMap[key] = { total: 0, inbound: 0, outbound: 0 };
        }
        countMap[key].total += 1;
        if (msg.direction === 'inbound') {
          countMap[key].inbound += 1;
        } else {
          countMap[key].outbound += 1;
        }
      });
    }

    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const counts = countMap[key] || { total: 0, inbound: 0, outbound: 0 };

      result.push({
        date: label,
        fullDate: key,
        'Total Touchpoints': counts.total,
        'Inbound Signals': counts.inbound,
        'Outbound Engagements': counts.outbound
      });
    }

    return result;
  }, [messages]);

  useEffect(() => {
    if (lead) {
      setStatus(lead.status || 'new');
      setPriority(lead.qualification?.priority || (lead.score >= 80 ? 'High' : lead.score >= 50 ? 'Medium' : 'Low'));
      setNotifyOnConverted(lead.notifyOnConverted !== false);

      // Parse existing internal notes from lead qualification
      let parsedNotes = [];
      const qual = typeof lead.qualification === 'string' ? JSON.parse(lead.qualification || '{}') : (lead.qualification || {});
      if (Array.isArray(qual.notes)) {
        parsedNotes = qual.notes;
      } else if (qual.internalNotes) {
        parsedNotes = [{ id: 1, text: qual.internalNotes, author: 'SDR Agent', createdAt: new Date().toISOString() }];
      }
      setNotesList(parsedNotes);

      // Set engagement history messages
      setMessages(lead.recent_messages || []);
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const handleSaveOverview = async () => {
    setIsSaving(true);
    try {
      await apiCall('/api/leads/qualify', 'POST', {
        leadId: lead.id,
        answers: {
          status,
          priority,
          notifyOnConverted: notifyOnConverted ? 'true' : 'false',
          notes: JSON.stringify(notesList)
        }
      }, token);

      toast.success('Lead Saved', `Updated lead details for ${lead.name || 'Lead'}`);
      if (status === 'converted' && notifyOnConverted) {
        toast.info('Conversion Email Alert Sent', `Automated conversion email dispatched to ${lead.email || 'prospect'}.`);
      }
      if (onLeadUpdated) onLeadUpdated();
      onClose();
    } catch (err) {
      toast.error('Failed to update lead', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const noteItem = {
      id: Date.now(),
      text: newNoteText.trim(),
      author: 'Current User',
      createdAt: new Date().toISOString()
    };

    const updatedNotes = [noteItem, ...notesList];
    setNotesList(updatedNotes);
    setNewNoteText('');

    try {
      await apiCall('/api/leads/qualify', 'POST', {
        leadId: lead.id,
        answers: {
          status,
          priority,
          notes: JSON.stringify(updatedNotes)
        }
      }, token);

      toast.success('Note Added', 'Internal note saved to lead history.');
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      toast.error('Failed to save note', err.message);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    setIsSendingMessage(true);
    try {
      const res = await apiCall('/api/leads/engage', 'POST', {
        leadId: lead.id,
        platform: messagePlatform,
        sender: 'SDR Team',
        message: newMessageText.trim()
      }, token);

      const createdMsg = {
        id: Date.now(),
        lead_id: lead.id,
        direction: 'outbound',
        sender: 'SDR Team',
        content: newMessageText.trim(),
        platform: messagePlatform,
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [createdMsg, ...prev]);
      setNewMessageText('');
      toast.success('Message Logged', 'Engagement interaction logged to lead history.');
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      toast.error('Failed to log message', err.message);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#141416] p-6 shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
        {/* Header Section */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h3 className="font-bold text-neutral-50 text-lg">{lead.name || 'Anonymous Lead'}</h3>
              <span className="rounded bg-orange-500/10 px-2.5 py-0.5 text-xs font-bold text-orange-400 border border-orange-500/20">
                Score: {lead.score || 75}
              </span>
              <span className={`rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                status === 'converted'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : status === 'qualified'
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  : status === 'contacted'
                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
                {status}
              </span>
            </div>
            <p className="text-xs text-neutral-400 flex items-center gap-3">
              {lead.email && <span className="flex items-center gap-1"><Mail size={12} /> {lead.email}</span>}
              {lead.company && <span className="flex items-center gap-1"><Building size={12} /> {lead.company}</span>}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white transition"
            title="Close Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-[#0A0A0B] p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition ${
              activeTab === 'overview'
                ? 'bg-[#141416] text-orange-400 shadow-sm border border-white/10'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sliders size={14} />
            <span>Lead Overview & Pipeline</span>
          </button>

          <button
            onClick={() => setActiveTab('engagement')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition ${
              activeTab === 'engagement'
                ? 'bg-[#141416] text-orange-400 shadow-sm border border-white/10'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <MessageSquare size={14} />
            <span>Engagement History ({messages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition ${
              activeTab === 'notes'
                ? 'bg-[#141416] text-orange-400 shadow-sm border border-white/10'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <StickyNote size={14} />
            <span>Internal Notes ({notesList.length})</span>
          </button>
        </div>

        {/* Tab Contents Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* TAB 1: OVERVIEW & PIPELINE */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Lead Details Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-[#0A0A0B] p-4 text-xs">
                <div>
                  <span className="text-neutral-500 font-medium block mb-0.5">Lead Source</span>
                  <div className="flex items-center gap-1.5 text-neutral-200 font-semibold">
                    <Globe size={13} className="text-orange-400" />
                    <span>{lead.source || 'AI Engine Inbound Sync'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-neutral-500 font-medium block mb-0.5">Created Date</span>
                  <div className="flex items-center gap-1.5 text-neutral-200 font-semibold">
                    <Calendar size={13} className="text-neutral-400" />
                    <span>{formatDate(lead.created_at)}</span>
                  </div>
                </div>

                <div>
                  <span className="text-neutral-500 font-medium block mb-0.5">Buyer Intent Signal</span>
                  <div className="flex items-center gap-1.5 text-neutral-200 font-semibold">
                    <Tag size={13} className="text-orange-400" />
                    <span className="capitalize">{lead.intent || 'High Interest'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-neutral-500 font-medium block mb-0.5">Estimated Budget</span>
                  <div className="flex items-center gap-1.5 text-neutral-200 font-semibold">
                    <DollarSign size={13} className="text-emerald-400" />
                    <span>{lead.qualification?.budget || '$10,000 - $25,000'}</span>
                  </div>
                </div>
              </div>

              {/* Message / Buying Signal */}
              {lead.message && (
                <div className="rounded-xl border border-white/10 bg-[#0A0A0B] p-4 space-y-1.5">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                    Inbound Buying Signal / Inquiry
                  </span>
                  <p className="text-xs text-neutral-200 leading-relaxed italic bg-[#141416] p-3 rounded-lg border border-white/5">
                    &ldquo;{lead.message}&rdquo;
                  </p>
                </div>
              )}

              {/* Demo Booking Link */}
              {lead.booking_link && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-emerald-400" />
                    <span className="font-semibold">Demo Booking Link Active</span>
                  </div>
                  <a
                    href={lead.booking_link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-bold text-emerald-400 hover:underline"
                  >
                    <span>Open Calendar</span>
                    <ChevronRight size={14} />
                  </a>
                </div>
              )}

              {/* Pipeline Controls Form */}
              <div className="space-y-3 rounded-xl border border-white/10 bg-[#0A0A0B] p-4">
                <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                  Update Lead Category & Settings
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Pipeline Stage</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-xs text-neutral-100 focus:border-orange-500 focus:outline-none"
                    >
                      <option value="new">New Lead</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="converted">Converted</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Priority Level</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-xs text-neutral-100 focus:border-orange-500 focus:outline-none"
                    >
                      <option value="High">🔴 High Priority</option>
                      <option value="Medium">🟡 Medium Priority</option>
                      <option value="Low">⚪ Low Priority</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <Bell size={15} className="text-orange-400" />
                    <span className="text-xs text-neutral-300 font-medium">Email Alert on Converted</span>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={notifyOnConverted}
                      onChange={(e) => setNotifyOnConverted(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-5 w-9 rounded-full bg-neutral-800 peer-checked:bg-orange-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENGAGEMENT HISTORY */}
          {activeTab === 'engagement' && (
            <div className="space-y-4">
              {/* 30-Day Engagement History Line Chart */}
              <div className="rounded-xl border border-white/10 bg-[#0A0A0B] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-orange-400" />
                    <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                      30-Day Engagement Timeline
                    </h4>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-medium">
                    Total Touchpoints: {messages.length}
                  </span>
                </div>

                <div className="h-44 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={engagementChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#737373"
                        fontSize={10}
                        tickLine={false}
                        interval={4}
                      />
                      <YAxis
                        stroke="#737373"
                        fontSize={10}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#141416',
                          borderColor: 'rgba(255,255,255,0.15)',
                          borderRadius: '8px',
                          color: '#F5F5F5',
                          fontSize: '11px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                        }}
                        itemStyle={{ color: '#F5F5F5' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                      <Line
                        type="monotone"
                        dataKey="Total Touchpoints"
                        stroke="#F97316"
                        strokeWidth={2}
                        dot={{ r: 2, fill: '#F97316' }}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Inbound Signals"
                        stroke="#60A5FA"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="Outbound Engagements"
                        stroke="#FBBF24"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Interaction Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Touchpoint Timeline
                </h4>

                {messages.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-[#0A0A0B] p-6 text-center text-neutral-400 text-xs">
                    No recent interaction messages recorded for this lead yet.
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isInbound = msg.direction === 'inbound';
                    return (
                      <div
                        key={msg.id || idx}
                        className={`rounded-xl border p-3.5 space-y-1.5 text-xs ${
                          isInbound
                            ? 'border-blue-500/30 bg-blue-500/5'
                            : 'border-orange-500/30 bg-orange-500/5'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-neutral-400">
                          <div className="flex items-center gap-1.5 font-semibold">
                            {isInbound ? (
                              <ArrowDownLeft size={14} className="text-blue-400" />
                            ) : (
                              <ArrowUpRight size={14} className="text-orange-400" />
                            )}
                            <span className={isInbound ? 'text-blue-400' : 'text-orange-400'}>
                              {isInbound ? 'Inbound Signal' : 'Outbound Engagement'}
                            </span>
                            <span>• {msg.sender || (isInbound ? 'Prospect' : 'AI Agent')}</span>
                          </div>
                          <span className="flex items-center gap-1 text-neutral-500">
                            <Clock size={11} /> {formatDate(msg.created_at)}
                          </span>
                        </div>

                        <p className="text-neutral-200 leading-relaxed bg-[#0A0A0B] p-2.5 rounded-lg border border-white/5">
                          {msg.content}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Log New Interaction / Engagement Form */}
              <form onSubmit={handleSendMessage} className="rounded-xl border border-white/10 bg-[#0A0A0B] p-4 space-y-3">
                <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Send size={13} className="text-orange-400" />
                  <span>Log Engagement Message / Reply</span>
                </h4>

                <div className="flex gap-2">
                  <select
                    value={messagePlatform}
                    onChange={(e) => setMessagePlatform(e.target.value)}
                    className="rounded-lg border border-white/10 bg-[#141416] px-2.5 py-1.5 text-xs text-neutral-200 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="email">Email</option>
                    <option value="dm">LinkedIn / DM</option>
                    <option value="call">Call Note</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Type engagement note or message sent to lead..."
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-[#141416] px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSendingMessage || !newMessageText.trim()}
                    className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-orange-400 disabled:opacity-50 transition"
                  >
                    Log
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: INTERNAL NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="rounded-xl border border-white/10 bg-[#0A0A0B] p-4 space-y-3">
                <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Plus size={14} className="text-orange-400" />
                  <span>Add Internal Team Note</span>
                </h4>

                <textarea
                  rows={2}
                  placeholder="Record call summary, qualification details, or SDR handoff notes..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#141416] p-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newNoteText.trim()}
                    className="rounded-lg bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-orange-400 disabled:opacity-50 transition"
                  >
                    Save Internal Note
                  </button>
                </div>
              </form>

              {/* Saved Notes Feed */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Internal Notes Feed
                </h4>

                {notesList.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-[#0A0A0B] p-6 text-center text-neutral-400 text-xs">
                    No internal notes added yet. Use the field above to add notes.
                  </div>
                ) : (
                  notesList.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-xl border border-white/10 bg-[#0A0A0B] p-3.5 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 border-b border-white/5 pb-1 mb-1">
                        <span className="font-semibold text-neutral-300 flex items-center gap-1">
                          <User size={12} className="text-orange-400" /> {note.author || 'Team Member'}
                        </span>
                        <span className="text-neutral-500">{formatDate(note.createdAt)}</span>
                      </div>
                      <p className="text-neutral-200 leading-relaxed">{note.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-[11px] text-neutral-500">
            Lead ID: {lead.id?.slice(0, 8)}...
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-[#0A0A0B] px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/5 transition"
            >
              Close
            </button>
            <button
              onClick={handleSaveOverview}
              disabled={isSaving}
              className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-orange-400 disabled:opacity-50 transition"
            >
              {isSaving ? 'Saving...' : 'Save Lead Updates'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
