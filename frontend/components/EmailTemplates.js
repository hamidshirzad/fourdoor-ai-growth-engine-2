import { useState, useEffect } from 'react';
import { useAuthStore, useTemplateStore, useLeadsStore } from '../lib/store';
import { toast } from '../lib/toastStore';
import {
  FileText,
  Plus,
  Search,
  Edit3,
  Trash2,
  Copy,
  CopyCheck,
  Send,
  Eye,
  Filter,
  Layers,
  Tag,
  X,
  Smartphone,
  Monitor,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  User,
  Building,
  Mail,
  Calendar,
  Zap,
  Info
} from 'lucide-react';

const CATEGORIES = [
  { key: 'all', label: 'All Categories' },
  { key: 'initial_intro', label: 'Initial Intro' },
  { key: 'follow_up', label: 'Follow-Up' },
  { key: 'value_add', label: 'Value-Add' },
  { key: 'meeting_request', label: 'Meeting Request' },
  { key: 're_engagement', label: 'Re-Engagement' }
];

const VARIABLE_TAGS = [
  { tag: '{{name}}', label: 'Lead Name' },
  { tag: '{{company}}', label: 'Company' },
  { tag: '{{booking_link}}', label: 'Booking URL' },
  { tag: '{{sender_name}}', label: 'Your Name' },
  { tag: '{{niche}}', label: 'Niche / Industry' },
  { tag: '{{message}}', label: 'Inquiry Message' }
];

const DEFAULT_SAMPLE_LEAD = {
  name: 'Sarah Jenkins',
  company: 'Aetheria Cloud Ops',
  email: 's.jenkins@aetheria.io',
  booking_link: 'https://calendly.com/fourdoor-ai/15min',
  niche: 'Enterprise B2B',
  message: 'Interested in automating our inbound sales qualification.'
};

export default function EmailTemplates({ onSelectTemplateForLead }) {
  const { token, user } = useAuthStore();
  const { templates, getTemplates, createTemplate, updateTemplate, deleteTemplate, isLoading } = useTemplateStore();
  const { leads, getLeads } = useLeadsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('follow_up');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [activeFocusField, setActiveFocusField] = useState('body');

  // Preview Pane Controls
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' or 'mobile'
  const [highlightVars, setHighlightVars] = useState(true);
  const [copied, setCopied] = useState(false);

  // Sample Lead Overrides for Live Preview Pane
  const [previewLead, setPreviewLead] = useState(DEFAULT_SAMPLE_LEAD);
  const [selectedLeadId, setSelectedLeadId] = useState('sample');

  useEffect(() => {
    if (token) {
      getTemplates(token);
      getLeads(token);
    }
  }, [token, getTemplates, getLeads]);

  // Set default selected template
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0]);
    }
  }, [templates, selectedTemplate]);

  // Handle choosing a lead for the preview
  const handleSelectPreviewLead = (leadId) => {
    setSelectedLeadId(leadId);
    if (leadId === 'sample') {
      setPreviewLead(DEFAULT_SAMPLE_LEAD);
    } else {
      const found = leads.find((l) => l.id === leadId);
      if (found) {
        setPreviewLead({
          name: found.name || 'Prospect',
          company: found.company || 'Their Company',
          email: found.email || 'prospect@company.com',
          booking_link: found.booking_link || process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://fourdoor.ai/book',
          niche: found.businessType || 'B2B',
          message: found.message || ''
        });
      }
    }
  };

  const openModal = (tpl = null) => {
    if (tpl) {
      setEditingTemplate(tpl);
      setFormName(tpl.name);
      setFormCategory(tpl.category || 'follow_up');
      setFormSubject(tpl.subject);
      setFormBody(tpl.body);
    } else {
      setEditingTemplate(null);
      setFormName('');
      setFormCategory('follow_up');
      setFormSubject('');
      setFormBody('');
    }
    setModalOpen(true);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formSubject.trim() || !formBody.trim()) {
      toast.error('Missing Required Fields', 'Please enter a template name, subject, and body.');
      return;
    }

    const payload = {
      name: formName.trim(),
      category: formCategory,
      subject: formSubject.trim(),
      body: formBody.trim()
    };

    let res;
    if (editingTemplate) {
      res = await updateTemplate(editingTemplate.id, payload, token);
    } else {
      res = await createTemplate(payload, token);
    }

    if (res.success) {
      setModalOpen(false);
      if (res.template) {
        setSelectedTemplate(res.template);
      }
    }
  };

  const handleDuplicate = async (tpl) => {
    const cloneData = {
      name: `${tpl.name} (Copy)`,
      category: tpl.category || 'follow_up',
      subject: tpl.subject,
      body: tpl.body
    };
    const res = await createTemplate(cloneData, token);
    if (res.success && res.template) {
      setSelectedTemplate(res.template);
    }
  };

  const handleDelete = async (tplId) => {
    const res = await deleteTemplate(tplId, token);
    if (res.success) {
      if (selectedTemplate?.id === tplId) {
        const remaining = templates.filter((t) => t.id !== tplId);
        setSelectedTemplate(remaining[0] || null);
      }
    }
  };

  const handleInsertTag = (tag) => {
    if (activeFocusField === 'subject') {
      setFormSubject((prev) => prev + ' ' + tag);
    } else {
      setFormBody((prev) => prev + (prev ? ' ' : '') + tag);
    }
  };

  // Interpolation helper for Live Preview Pane
  const renderInterpolated = (text = '', leadData = previewLead, highlight = false) => {
    if (!text) return '';

    const replacements = {
      name: leadData.name || 'there',
      company: leadData.company || 'your company',
      email: leadData.email || 'lead@company.com',
      booking_link: leadData.booking_link || 'https://fourdoor.ai/book',
      sender_name: user?.name || 'FourDoor AI Team',
      niche: leadData.niche || 'B2B',
      message: leadData.message || ''
    };

    let rendered = text;

    if (highlight) {
      Object.keys(replacements).forEach((k) => {
        const value = replacements[k];
        const reg = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi');
        rendered = rendered.replace(
          reg,
          `___HL_START___${value}___HL_END___`
        );
      });

      const parts = rendered.split(/(___HL_START___|___HL_END___)/);
      let inHighlight = false;

      return parts.map((part, i) => {
        if (part === '___HL_START___') {
          inHighlight = true;
          return null;
        }
        if (part === '___HL_END___') {
          inHighlight = false;
          return null;
        }
        if (inHighlight) {
          return (
            <span
              key={i}
              className="bg-orange-500/20 text-orange-300 font-semibold border-b border-orange-400 px-1 rounded transition"
              title="Dynamic variable value"
            >
              {part}
            </span>
          );
        }
        return part;
      });
    } else {
      Object.keys(replacements).forEach((k) => {
        const value = replacements[k];
        const reg = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi');
        rendered = rendered.replace(reg, value);
      });
      return rendered;
    }
  };

  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.body.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || tpl.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const activeTemplate = selectedTemplate || filteredTemplates[0] || null;

  const handleCopyPreview = () => {
    if (!activeTemplate) return;
    const renderedSubject = renderInterpolated(activeTemplate.subject, previewLead, false);
    const renderedBody = renderInterpolated(activeTemplate.body, previewLead, false);
    const fullText = `Subject: ${renderedSubject}\n\n${renderedBody}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success('Copied Preview', 'Rendered subject and body copied to clipboard.');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#141416] p-5 rounded-2xl border border-white/10 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400">
              <FileText size={18} />
            </span>
            <h2 className="text-lg font-bold text-neutral-100">Reusable Outreach Email Templates</h2>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Create standard follow-up messaging and preview live variable replacements in real-time before sending to prospects.
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-neutral-950 hover:bg-orange-400 transition shadow-md shrink-0"
        >
          <Plus size={16} />
          <span>New Template</span>
        </button>
      </div>

      {/* Main Split Layout: Left Library List + Right Live Preview Pane */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: TEMPLATE LIST & FILTERS (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Search & Categories */}
          <div className="space-y-3 bg-[#141416] p-4 rounded-2xl border border-white/10">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-3 text-neutral-500" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0A0A0B] pl-10 pr-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <Filter size={13} className="text-neutral-500 shrink-0 mr-1" />
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                    selectedCategory === cat.key
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 font-semibold'
                      : 'bg-[#0A0A0B] text-neutral-400 hover:text-neutral-200 border border-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Card List */}
          <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
            {filteredTemplates.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#141416] p-8 text-center space-y-3">
                <p className="text-xs text-neutral-400">No matching templates found.</p>
                <button
                  onClick={() => openModal()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/20 px-3 py-1.5 text-xs font-semibold text-orange-400 hover:bg-orange-500/30 transition"
                >
                  <Plus size={14} />
                  <span>Create One Now</span>
                </button>
              </div>
            ) : (
              filteredTemplates.map((tpl) => {
                const isSelected = activeTemplate?.id === tpl.id;
                const catLabel = CATEGORIES.find((c) => c.key === tpl.category)?.label || tpl.category;

                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    className={`rounded-2xl border p-4 cursor-pointer transition shadow-md space-y-3 ${
                      isSelected
                        ? 'border-orange-500/60 bg-gradient-to-r from-orange-500/10 via-[#141416] to-[#141416]'
                        : 'border-white/10 bg-[#141416] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                          {catLabel}
                        </span>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-orange-400">
                            <Eye size={12} /> Live Previewing
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openModal(tpl)}
                          title="Edit Template"
                          className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-neutral-100 transition"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDuplicate(tpl)}
                          title="Duplicate"
                          className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-neutral-100 transition"
                        >
                          <Layers size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(tpl.id)}
                          title="Delete"
                          className="rounded p-1 text-neutral-400 hover:bg-red-500/20 hover:text-red-400 transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-neutral-100">{tpl.name}</h4>
                      <p className="mt-0.5 text-[11px] text-neutral-400 line-clamp-1 font-mono">
                        {tpl.subject}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE LIVE PREVIEW PANE (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#141416] p-6 shadow-2xl space-y-5 flex flex-col justify-between min-h-[620px]">
            {activeTemplate ? (
              <div className="space-y-5">
                {/* Live Preview Controls Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/20 text-orange-400">
                      <Eye size={16} />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-50">Live Email Preview Pane</h3>
                      <p className="text-[11px] text-neutral-400">
                        Inspecting: <strong className="text-orange-400">{activeTemplate.name}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Device Selector */}
                    <div className="flex rounded-lg bg-[#0A0A0B] p-0.5 border border-white/10">
                      <button
                        onClick={() => setPreviewDevice('desktop')}
                        className={`p-1.5 rounded-md transition ${
                          previewDevice === 'desktop'
                            ? 'bg-orange-500 text-neutral-950'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                        title="Desktop Email Client View"
                      >
                        <Monitor size={14} />
                      </button>
                      <button
                        onClick={() => setPreviewDevice('mobile')}
                        className={`p-1.5 rounded-md transition ${
                          previewDevice === 'mobile'
                            ? 'bg-orange-500 text-neutral-950'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                        title="Mobile Device View"
                      >
                        <Smartphone size={14} />
                      </button>
                    </div>

                    {/* Variable Highlight Toggle */}
                    <button
                      onClick={() => setHighlightVars(!highlightVars)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border transition ${
                        highlightVars
                          ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                          : 'bg-[#0A0A0B] text-neutral-400 border-white/10 hover:text-white'
                      }`}
                    >
                      <Sparkles size={12} />
                      <span>{highlightVars ? 'Highlight Vars ON' : 'Highlight OFF'}</span>
                    </button>
                  </div>
                </div>

                {/* Sample Lead & Test Value Overrides */}
                <div className="rounded-xl border border-white/10 bg-[#0A0A0B] p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-400">
                    <span className="flex items-center gap-1 text-neutral-300">
                      <User size={13} className="text-orange-400" />
                      <span>Test Variable Source:</span>
                    </span>

                    <select
                      value={selectedLeadId}
                      onChange={(e) => handleSelectPreviewLead(e.target.value)}
                      className="rounded-lg border border-white/10 bg-[#141416] px-2.5 py-1 text-xs text-neutral-200 focus:border-orange-500"
                    >
                      <option value="sample">✨ Default Sample Prospect ({DEFAULT_SAMPLE_LEAD.name})</option>
                      {leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          👤 {l.name || l.email} ({l.company || 'No Company'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Inline Test Input Fields */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-neutral-500">Name:</span>
                      <input
                        type="text"
                        value={previewLead.name}
                        onChange={(e) => setPreviewLead({ ...previewLead, name: e.target.value })}
                        className="w-full mt-0.5 rounded border border-white/10 bg-[#141416] px-2 py-1 text-neutral-200 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <span className="text-neutral-500">Company:</span>
                      <input
                        type="text"
                        value={previewLead.company}
                        onChange={(e) => setPreviewLead({ ...previewLead, company: e.target.value })}
                        className="w-full mt-0.5 rounded border border-white/10 bg-[#141416] px-2 py-1 text-neutral-200 focus:border-orange-500"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-neutral-500">Booking URL:</span>
                      <input
                        type="text"
                        value={previewLead.booking_link}
                        onChange={(e) => setPreviewLead({ ...previewLead, booking_link: e.target.value })}
                        className="w-full mt-0.5 rounded border border-white/10 bg-[#141416] px-2 py-1 text-neutral-200 focus:border-orange-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* THE ACTUAL SIMULATED EMAIL CLIENT CONTAINER */}
                <div
                  className={`mx-auto transition-all ${
                    previewDevice === 'mobile' ? 'max-w-sm border-2 border-neutral-700 rounded-3xl p-3 bg-neutral-950' : 'w-full'
                  }`}
                >
                  <div className="rounded-xl border border-white/10 bg-[#0A0A0B] shadow-2xl overflow-hidden text-left">
                    {/* Simulated Email Client Top Bar */}
                    <div className="bg-[#18181B] px-4 py-3 border-b border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
                          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                          <span>From: {user?.name || 'FourDoor AI Team'}</span>
                          <span className="text-neutral-500">&lt;outreach@fourdoor.ai&gt;</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono">Today, 09:41 AM</span>
                      </div>

                      <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                        <span>To: <strong className="text-neutral-200">{previewLead.name}</strong> &lt;{previewLead.email}&gt;</span>
                        <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                          Verified Sender
                        </span>
                      </div>

                      <div className="pt-2 border-t border-white/5">
                        <h4 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                          <span className="text-neutral-500 text-xs font-normal">Subject:</span>
                          <span>{renderInterpolated(activeTemplate.subject, previewLead, highlightVars)}</span>
                        </h4>
                      </div>
                    </div>

                    {/* Simulated Email Body Area */}
                    <div className="p-5 text-xs text-neutral-200 leading-relaxed font-sans whitespace-pre-line min-h-[200px]">
                      {renderInterpolated(activeTemplate.body, previewLead, highlightVars)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <Info size={32} className="text-neutral-500" />
                <p className="text-sm font-semibold text-neutral-300">Select or create a template to preview</p>
              </div>
            )}

            {/* Bottom Actions Bar */}
            {activeTemplate && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={handleCopyPreview}
                  className="flex items-center gap-2 rounded-xl bg-neutral-800 border border-white/10 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 transition"
                >
                  {copied ? <CopyCheck size={15} className="text-emerald-400" /> : <Copy size={15} />}
                  <span>{copied ? 'Copied Rendered Email!' : 'Copy Rendered Subject & Body'}</span>
                </button>

                {onSelectTemplateForLead && (
                  <button
                    onClick={() => onSelectTemplateForLead(activeTemplate)}
                    className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2 text-xs font-bold text-neutral-950 hover:bg-orange-400 transition shadow-md"
                  >
                    <Zap size={15} />
                    <span>Apply & Send to Lead</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT TEMPLATE MODAL WITH LIVE PREVIEW */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-4xl rounded-2xl border border-orange-500/40 bg-[#141416] p-6 shadow-2xl space-y-5 text-neutral-50">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/20 text-orange-400">
                    <FileText size={16} />
                  </span>
                  <h3 className="text-lg font-bold text-neutral-50">
                    {editingTemplate ? 'Edit Outreach Template' : 'Create New Outreach Template'}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-neutral-400">
                  Insert dynamic tags like <code className="text-orange-400">{`{{name}}`}</code>,{' '}
                  <code className="text-orange-400">{`{{company}}`}</code>, and <code className="text-orange-400">{`{{booking_link}}`}</code>.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-neutral-100 transition"
            aria-label="Close dialog"
          >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gentle 3-Day Follow-Up"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    Category Stage
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-sm text-neutral-100 focus:border-orange-500"
                  >
                    {CATEGORIES.filter((c) => c.key !== 'all').map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tag inserter */}
              <div className="rounded-xl border border-white/10 bg-[#0A0A0B] p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="font-semibold uppercase tracking-wider">Insert Dynamic Variable</span>
                  <span>Target: <strong className="text-orange-400 uppercase">{activeFocusField}</strong></span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLE_TAGS.map((vt) => (
                    <button
                      key={vt.tag}
                      type="button"
                      onClick={() => handleInsertTag(vt.tag)}
                      className="inline-flex items-center gap-1 rounded-lg bg-neutral-800 border border-white/10 px-2.5 py-1 text-xs text-neutral-200 hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/40 transition font-mono"
                    >
                      <Plus size={12} className="text-orange-400" />
                      <span>{vt.tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Email Subject Line *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Re: Quick question regarding {{company}}"
                  value={formSubject}
                  onFocus={() => setActiveFocusField('subject')}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-sm font-semibold text-neutral-100 placeholder-neutral-600 focus:border-orange-500"
                />
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Email Body *
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Hi {{name}},&#10;&#10;Following up on my note..."
                  value={formBody}
                  onFocus={() => setActiveFocusField('body')}
                  onChange={(e) => setFormBody(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0A0A0B] p-3.5 text-sm text-neutral-200 leading-relaxed focus:border-orange-500 font-sans"
                />
              </div>

              {/* Live Preview Pane inside Modal */}
              <div className="rounded-xl border border-white/10 bg-[#0A0A0B] p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 border-b border-white/5 pb-2">
                  <span className="flex items-center gap-1.5 text-orange-400">
                    <Eye size={14} />
                    <span>Real-Time Modal Live Preview Pane</span>
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    Renders against sample prospect "{previewLead.name}" ({previewLead.company})
                  </span>
                </div>

                <div className="space-y-2 pt-1 text-xs">
                  <p className="font-semibold text-neutral-100">
                    <span className="text-neutral-500 font-normal">Subject:</span>{' '}
                    {renderInterpolated(formSubject, previewLead, true) || '(Subject preview)'}
                  </p>
                  <div className="whitespace-pre-line text-neutral-300 font-sans leading-relaxed pt-1 border-t border-white/5">
                    {renderInterpolated(formBody, previewLead, true) || '(Body preview)'}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-neutral-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-neutral-950 hover:bg-orange-400 transition shadow-lg"
                >
                  <span>{editingTemplate ? 'Save Template Changes' : 'Create Template'}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
