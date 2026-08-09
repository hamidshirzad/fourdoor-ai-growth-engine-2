import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import EmailTemplates from '../components/EmailTemplates';
import { apiCall } from '../lib/api';
import { useAuthStore, useLeadsStore, useTemplateStore } from '../lib/store';
import { toast } from '../lib/toastStore';
import {
  Mail,
  FileText,
  Plus,
  Search,
  Copy,
  Check,
  Edit3,
  Trash2,
  Sparkles,
  UploadCloud,
  Send,
  Zap,
  Tag,
  Filter,
  Eye,
  X,
  Layers,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  CopyCheck
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
  { tag: '{{message}}', label: 'Initial Inquiry' }
];

const SAMPLE_LEAD = {
  name: 'Alex Rivera',
  company: 'Apex Growth Media',
  email: 'alex@apexgrowth.com',
  booking_link: 'https://calendly.com/fourdoor-ai/15min',
  businessType: 'B2B Marketing',
  message: 'Looking for automated client qualification.'
};

export default function OutreachPage() {
  const { token, user } = useAuthStore();
  const { leads, getLeads, bulkUploadLeads } = useLeadsStore();
  const { templates, getTemplates, createTemplate, updateTemplate, deleteTemplate } = useTemplateStore();

  const [activeTab, setActiveTab] = useState('templates'); // 'generator', 'templates', 'upload'

  // Generator & Outreach State
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [outreachMode, setOutreachMode] = useState('template'); // 'template' or 'ai'
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [aiContext, setAiContext] = useState('');
  const [subjectDraft, setSubjectDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Template Management State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Template Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('follow_up');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [activeFocusField, setActiveFocusField] = useState('body'); // 'subject' or 'body'
  const [showLivePreview, setShowLivePreview] = useState(true);

  useEffect(() => {
    if (token) {
      getLeads(token);
      getTemplates(token);
    }
  }, [token, getLeads, getTemplates]);

  // Set default lead if available
  useEffect(() => {
    if (leads.length > 0 && !selectedLeadId) {
      setSelectedLeadId(leads[0].id);
    }
  }, [leads, selectedLeadId]);

  // Auto-fill template if selected
  useEffect(() => {
    if (outreachMode === 'template' && selectedTemplateId && templates.length > 0) {
      const tpl = templates.find((t) => t.id === selectedTemplateId);
      const lead = leads.find((l) => l.id === selectedLeadId) || SAMPLE_LEAD;
      if (tpl) {
        let sub = tpl.subject;
        let bod = tpl.body;

        const replacements = {
          name: lead.name || 'there',
          company: lead.company || 'your company',
          email: lead.email || '',
          booking_link: lead.booking_link || process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://fourdoor.ai/book',
          sender_name: user?.name || 'FourDoor AI Team',
          niche: lead.businessType || 'B2B',
          message: lead.message || ''
        };

        Object.keys(replacements).forEach((k) => {
          const reg = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi');
          sub = sub.replace(reg, replacements[k]);
          bod = bod.replace(reg, replacements[k]);
        });

        setSubjectDraft(sub);
        setBodyDraft(bod);
      }
    }
  }, [selectedTemplateId, selectedLeadId, templates, leads, outreachMode, user]);

  const handleGenerateAIDraft = async () => {
    if (!selectedLeadId) {
      toast.error('Select a Lead', 'Please select a prospect lead first.');
      return;
    }
    setIsGenerating(true);
    setSentSuccess(false);
    try {
      const result = await apiCall(
        '/api/leads/outreach/draft',
        'POST',
        { leadId: selectedLeadId, context: aiContext || 'Follow up to schedule a demo call.' },
        token
      );
      if (result?.draft) {
        setSubjectDraft(result.draft.subject || '');
        setBodyDraft(result.draft.body || '');
        toast.success('AI Draft Generated', 'Personalized message ready for review.');
      }
    } catch (err) {
      toast.error('Draft Failed', err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyOutreach = () => {
    const fullText = `Subject: ${subjectDraft}\n\n${bodyDraft}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success('Copied to Clipboard', 'Subject and email body copied.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleMarkSent = async () => {
    setSentSuccess(true);
    toast.success('Outreach Logged', 'Marked email outreach as sent.');
    setTimeout(() => setSentSuccess(false), 3000);
  };

  // Open Create / Edit Modal
  const openTemplateModal = (tpl = null) => {
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
      toast.error('Missing Fields', 'Name, Subject, and Body are required.');
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
    }
  };

  const handleDuplicateTemplate = async (tpl) => {
    const cloneData = {
      name: `${tpl.name} (Copy)`,
      category: tpl.category || 'follow_up',
      subject: tpl.subject,
      body: tpl.body
    };
    await createTemplate(cloneData, token);
  };

  const handleInsertTag = (tag) => {
    if (activeFocusField === 'subject') {
      setFormSubject((prev) => prev + ' ' + tag);
    } else {
      setFormBody((prev) => prev + (prev ? ' ' : '') + tag);
    }
  };

  const handleUseTemplateForLead = (tpl) => {
    setSelectedTemplateId(tpl.id);
    setOutreachMode('template');
    setActiveTab('generator');
    toast.info('Template Selected', `Ready to send "${tpl.name}" to lead.`);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await bulkUploadLeads(file, token);
      e.target.value = '';
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.body.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tpl.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Render Sample Preview Text
  const renderSamplePreview = (text = '') => {
    let rendered = text;
    const replacements = {
      name: SAMPLE_LEAD.name,
      company: SAMPLE_LEAD.company,
      email: SAMPLE_LEAD.email,
      booking_link: SAMPLE_LEAD.booking_link,
      sender_name: user?.name || 'FourDoor AI Team',
      niche: SAMPLE_LEAD.businessType,
      message: SAMPLE_LEAD.message
    };
    Object.keys(replacements).forEach((k) => {
      const reg = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi');
      rendered = rendered.replace(reg, replacements[k]);
    });
    return rendered;
  };

  const selectedLeadObj = leads.find((l) => l.id === selectedLeadId);

  return (
    <ProtectedRoute>
      <AppShell
        title="Email Outreach & Template Management"
        subtitle="Manage reusable follow-up templates, generate AI personalized messages, and track prospect engagement."
      >
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
          <div className="flex rounded-xl bg-[#0A0A0B] p-1 border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                activeTab === 'templates'
                  ? 'bg-orange-500 text-neutral-950 font-bold shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileText size={15} />
              <span>Outreach Templates ({templates.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('generator')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                activeTab === 'generator'
                  ? 'bg-orange-500 text-neutral-950 font-bold shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Send size={15} />
              <span>Send Outreach & AI Personalizer</span>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                activeTab === 'upload'
                  ? 'bg-orange-500 text-neutral-950 font-bold shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <UploadCloud size={15} />
              <span>Bulk CSV Import</span>
            </button>
          </div>

          {activeTab === 'templates' && (
            <button
              onClick={() => openTemplateModal()}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-neutral-950 hover:bg-orange-400 transition shadow-md"
            >
              <Plus size={16} />
              <span>New Template</span>
            </button>
          )}
        </div>

        {/* TAB 1: REUSABLE TEMPLATES LIBRARY WITH LIVE PREVIEW PANE */}
        {activeTab === 'templates' && (
          <EmailTemplates onSelectTemplateForLead={handleUseTemplateForLead} />
        )}

        {/* TAB 2: OUTREACH & DRAFT GENERATOR */}
        {activeTab === 'generator' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Control Column */}
            <div className="space-y-5">
              {/* Lead Selector Panel */}
              <div className="rounded-2xl border border-white/10 bg-[#141416] p-5 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/20 text-orange-400">
                    <UserCheck size={16} />
                  </span>
                  <h3 className="text-sm font-bold text-neutral-100">1. Select Target Prospect</h3>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Pipeline Lead
                  </label>
                  <select
                    value={selectedLeadId}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-xs text-neutral-100 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">-- Select a Lead from Pipeline --</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name || l.email || l.company} • ({l.company || 'No Company'}) [Score: {l.score}]
                      </option>
                    ))}
                  </select>
                </div>

                {selectedLeadObj ? (
                  <div className="rounded-xl border border-white/5 bg-[#0A0A0B] p-3 text-xs space-y-1.5 text-neutral-300">
                    <div className="flex justify-between items-center text-neutral-400">
                      <span>Name:</span>
                      <span className="font-semibold text-neutral-100">{selectedLeadObj.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-400">
                      <span>Company:</span>
                      <span className="font-semibold text-neutral-100">{selectedLeadObj.company || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-400">
                      <span>Email:</span>
                      <span className="font-mono text-neutral-100">{selectedLeadObj.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-400">
                      <span>Score & Status:</span>
                      <span className="font-bold text-orange-400">
                        {selectedLeadObj.score}/100 • {selectedLeadObj.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-500 italic">
                    Select a lead to automatically fill placeholders like company name and booking link.
                  </p>
                )}
              </div>

              {/* Mode Switcher Panel */}
              <div className="rounded-2xl border border-white/10 bg-[#141416] p-5 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/20 text-orange-400">
                    <Layers size={16} />
                  </span>
                  <h3 className="text-sm font-bold text-neutral-100">2. Outreach Method</h3>
                </div>

                <div className="flex rounded-lg bg-[#0A0A0B] p-1 border border-white/10 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setOutreachMode('template')}
                    className={`flex-1 py-2 rounded-md transition ${
                      outreachMode === 'template'
                        ? 'bg-orange-500 text-neutral-950 font-bold shadow'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Saved Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutreachMode('ai')}
                    className={`flex-1 py-2 rounded-md transition ${
                      outreachMode === 'ai'
                        ? 'bg-orange-500 text-neutral-950 font-bold shadow'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    AI Generator
                  </button>
                </div>

                {outreachMode === 'template' ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Select Template
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-xs text-neutral-100 focus:border-orange-500 focus:outline-none"
                    >
                      <option value="">-- Pick a Saved Template --</option>
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name} ({tpl.category})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                        Outreach Context
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Invite prospect to review a personalized audit on automated client qualification..."
                        value={aiContext}
                        onChange={(e) => setAiContext(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#0A0A0B] p-3 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleGenerateAIDraft}
                      disabled={isGenerating || !selectedLeadId}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-neutral-950 hover:bg-orange-400 disabled:opacity-50 transition shadow"
                    >
                      <Sparkles size={15} />
                      <span>{isGenerating ? 'Generating Draft...' : 'Generate AI Personalization'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Output Draft Editor Column */}
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#141416] p-6 shadow-xl space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400">
                      <Mail size={18} />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-neutral-50">Email Subject & Body Editor</h3>
                      <p className="text-xs text-neutral-400">
                        Review, edit, and send outreach for {selectedLeadObj?.name || 'selected lead'}
                      </p>
                    </div>
                  </div>

                  {sentSuccess && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 size={14} />
                      <span>Sent Logged</span>
                    </span>
                  )}
                </div>

                {/* Subject Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    placeholder="Subject line will appear here..."
                    value={subjectDraft}
                    onChange={(e) => setSubjectDraft(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0A0A0B] px-4 py-3 text-sm text-neutral-100 font-semibold focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Body Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Email Body Content
                  </label>
                  <textarea
                    rows={12}
                    placeholder="Email body content will appear here..."
                    value={bodyDraft}
                    onChange={(e) => setBodyDraft(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0A0A0B] p-4 text-sm text-neutral-200 leading-relaxed font-sans focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={handleCopyOutreach}
                  disabled={!subjectDraft && !bodyDraft}
                  className="flex items-center gap-2 rounded-xl bg-neutral-800 border border-white/10 px-4 py-2.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 hover:text-white disabled:opacity-40 transition shadow"
                >
                  {copied ? <CopyCheck size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Subject & Body'}</span>
                </button>

                <button
                  onClick={handleMarkSent}
                  disabled={!subjectDraft || !bodyDraft}
                  className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-neutral-950 hover:bg-orange-400 disabled:opacity-40 transition shadow-lg"
                >
                  <Send size={15} />
                  <span>Mark Outreach as Sent</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CSV BULK IMPORT */}
        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-[#141416] p-8 shadow-xl space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <UploadCloud size={32} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-neutral-50">Bulk Ingest Leads via CSV</h2>
              <p className="mt-1 text-xs text-neutral-400 max-w-md mx-auto">
                Upload your prospect list with column headers: <code className="text-orange-400">name</code>,{' '}
                <code className="text-orange-400">email</code>, <code className="text-orange-400">company</code>, and{' '}
                <code className="text-orange-400">notes</code>.
              </p>
            </div>

            <div className="rounded-xl border-2 border-dashed border-white/20 bg-[#0A0A0B] p-8 hover:border-orange-500/50 transition relative group">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="space-y-2">
                <UploadCloud size={28} className="mx-auto text-neutral-500 group-hover:text-orange-400 transition" />
                <p className="text-xs font-semibold text-neutral-200">
                  Click or drag and drop your CSV file here
                </p>
                <p className="text-[11px] text-neutral-500">Supports up to 2MB CSV lists</p>
              </div>
            </div>
          </div>
        )}

        {/* CREATE / EDIT TEMPLATE MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
            <div className="relative w-full max-w-3xl rounded-2xl border border-orange-500/40 bg-[#141416] p-6 shadow-2xl space-y-5 text-neutral-50">

              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/20 text-orange-400">
                      <FileText size={16} />
                    </span>
                    <h3 className="text-lg font-bold text-neutral-50">
                      {editingTemplate ? 'Edit Reusable Outreach Template' : 'Create New Outreach Template'}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">
                    Use dynamic placeholders like <code className="text-orange-400">{`{{name}}`}</code> and{' '}
                    <code className="text-orange-400">{`{{company}}`}</code> to auto-personalize at scale.
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
                {/* Template Name & Category */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Initial Cold Intro (B2B SaaS)"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      Category Stage
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-sm text-neutral-100 focus:border-orange-500 focus:outline-none"
                    >
                      {CATEGORIES.filter((c) => c.key !== 'all').map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Variable Insertion Toolbar */}
                <div className="rounded-xl border border-white/10 bg-[#0A0A0B] p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="font-semibold uppercase tracking-wider">Quick Variable Chips</span>
                    <span>Inserting into: <strong className="text-orange-400 uppercase">{activeFocusField}</strong></span>
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

                {/* Subject Line */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    Email Subject Line *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quick question regarding {{company}}'s lead pipeline"
                    value={formSubject}
                    onFocus={() => setActiveFocusField('subject')}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0A0A0B] px-3.5 py-2.5 text-sm font-semibold text-neutral-100 placeholder-neutral-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Body Content */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    Email Body Text *
                  </label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Hi {{name}},&#10;&#10;I noticed the work {{company}} is doing and wanted to connect..."
                    value={formBody}
                    onFocus={() => setActiveFocusField('body')}
                    onChange={(e) => setFormBody(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0A0A0B] p-3.5 text-sm text-neutral-200 leading-relaxed focus:border-orange-500 focus:outline-none font-sans"
                  />
                </div>

                {/* Live Sample Preview Section */}
                <div className="rounded-xl border border-white/10 bg-[#0A0A0B] p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 border-b border-white/5 pb-2">
                    <span className="flex items-center gap-1.5 text-orange-400">
                      <Eye size={14} />
                      <span>Live Sample Rendered Preview</span>
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      Renders variables against sample lead "{SAMPLE_LEAD.name}"
                    </span>
                  </div>

                  <div className="space-y-2 pt-1 text-xs">
                    <p className="font-semibold text-neutral-100">
                      <span className="text-neutral-500 font-normal">Subject:</span>{' '}
                      {renderSamplePreview(formSubject) || '(Subject line preview will appear here)'}
                    </p>
                    <div className="whitespace-pre-line text-neutral-300 font-sans leading-relaxed pt-1 border-t border-white/5">
                      {renderSamplePreview(formBody) || '(Email body preview will appear here)'}
                    </div>
                  </div>
                </div>

                {/* Submit & Cancel Buttons */}
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
                    <span>{editingTemplate ? 'Save Template Changes' : 'Create Outreach Template'}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
