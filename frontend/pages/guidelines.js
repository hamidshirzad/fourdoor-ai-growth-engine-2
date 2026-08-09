import { useState } from 'react';
import AppShell from '../components/AppShell';
import { Bot, BookOpen, Sparkles, ShieldCheck, CheckCircle2, MessageSquare, Send, Copy, Check, Search, ArrowRight } from 'lucide-react';
import { apiCall } from '../lib/api';
import { toast } from '../lib/toastStore';

const GUIDELINES = [
  {
    id: 'content-policy',
    title: 'Content Creation & Distribution Policy',
    category: 'Content',
    badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    icon: Sparkles,
    summary: 'Standards governing automated content generation, platform tone, and engagement hooks.',
    rules: [
      {
        head: 'Value-First Hooks',
        desc: 'Every post must feature a strong, problem-focused hook addressing a specific buyer pain point before introducing solution frameworks.'
      },
      {
        head: 'Single Call-To-Action (CTA)',
        desc: 'Maintain high conversion clarity by including at most one explicit action per post (e.g., "Reply GROWTH", "Book demo").'
      },
      {
        head: 'Truth in Marketing',
        desc: 'Misleading clickbait, fake metrics, or unsubstantiated revenue guarantees are strictly blocked by the system filters.'
      }
    ]
  },
  {
    id: 'lead-qualification',
    title: 'Lead Qualification & Scoring Protocol',
    category: 'Leads',
    badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    icon: ShieldCheck,
    summary: 'Algorithmic 0–100 scoring rules determining lead priority and sales escalation.',
    rules: [
      {
        head: 'Algorithmic Matrix (0-100)',
        desc: 'Leads are scored based on company profile fit (+15), monthly budget keywords (+20), and explicit booking intent (+25).'
      },
      {
        head: 'Hot Lead Threshold (&gt; 70)',
        desc: 'Leads scoring above 70 are instantly tagged as "Hot" and receive automated calendar booking invites.'
      },
      {
        head: 'Auditability',
        desc: 'All score recalculations and lead status transitions generate immutable records in the Firestore activity logs.'
      }
    ]
  },
  {
    id: 'security-compliance',
    title: 'Outreach & Security Compliance',
    category: 'Security',
    badgeColor: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    icon: ShieldCheck,
    summary: 'Mandatory security checks and privacy regulations for direct outreach campaigns.',
    rules: [
      {
        head: 'Pre-Flight Security Scan',
        desc: 'All email subject lines, body copy, and target recipient lists must pass the Security Scanner before dispatching.'
      },
      {
        head: 'GDPR & Privacy Compliance',
        desc: 'Includes mandatory 1-click unsubscribe mechanisms and automated suppressions for opted-out contacts.'
      },
      {
        head: 'Data Encryption',
        desc: '256-bit SSL encryption safeguards customer data in transit and at rest across all backend services.'
      }
    ]
  },
  {
    id: 'billing-tiers',
    title: 'Billing Tiers & Subscription Standards',
    category: 'Billing',
    badgeColor: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    icon: CheckCircle2,
    summary: 'Subscription levels, feature access rights, and billing execution.',
    rules: [
      {
        head: 'Pro Growth Suite (€79/mo)',
        desc: 'Covers core automated content generation, lead qualification pipelines, and up to 500 managed leads/month.'
      },
      {
        head: 'Enterprise Suite (€199/mo)',
        desc: 'Provides unlimited lead capacity, custom AI agent rulesets, and dedicated security scanning passes.'
      },
      {
        head: 'Instant Billing Confirmation',
        desc: 'Subscriptions update immediately upon Stripe card authorization with in-app confirmation notifications.'
      }
    ]
  }
];

export default function GuidelinesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [chatMessage, setChatMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const [conversation, setConversation] = useState([
    {
      id: 'init-1',
      sender: 'agent',
      text: 'Hello! I am your Live AI Support Agent. You can ask me any questions regarding our growth engine policies, content rules, lead scoring thresholds, or security standards.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const categories = ['All', 'Content', 'Leads', 'Security', 'Billing'];

  const filteredGuidelines = GUIDELINES.filter((g) => {
    const matchesCategory = selectedCategory === 'All' || g.category === selectedCategory;
    const matchesSearch =
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.rules.some((r) => r.head.toLowerCase().includes(searchQuery.toLowerCase()) || r.desc.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleAskAgent = async (promptText) => {
    const query = promptText || chatMessage;
    if (!query.trim() || isTyping) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversation((prev) => [...prev, userMsg]);
    if (!promptText) setChatMessage('');
    setIsTyping(true);

    try {
      const res = await apiCall('/api/live-agent/chat', 'POST', {
        message: query.trim(),
        chatHistory: conversation.map((c) => ({ sender: c.sender, text: c.text }))
      });

      const agentMsg = {
        id: `a-${Date.now()}`,
        sender: 'agent',
        text: res.reply || 'I am online and ready to assist with your growth guidelines.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversation((prev) => [...prev, agentMsg]);
    } catch (err) {
      toast.error('Agent Notice', 'Could not reach Live Agent server, using cached guidance.');
      setConversation((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          text: `Regarding "${query}": Fourdoor AI guidelines require value-first content, lead scoring above 70 for hot qualification, and 256-bit SSL encrypted outreach.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AppShell
      title="Live Agent & Guidelines"
      subtitle="Interactive AI support agent paired with official Fourdoor AI growth guidelines, security policies, and operational protocols."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Guidelines Directory (7 Cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Search & Category Filter Bar */}
          <div className="rounded-2xl border border-white/10 bg-[#121215] p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-neutral-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guidelines, lead scoring rules, security standards..."
                className="w-full rounded-xl border border-white/10 bg-[#09090b] pl-10 pr-4 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    selectedCategory === cat
                      ? 'bg-orange-500 text-neutral-950 shadow-sm'
                      : 'bg-[#1a1a20] text-neutral-300 hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Guidelines Cards List */}
          <div className="space-y-4">
            {filteredGuidelines.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#121215] p-8 text-center text-neutral-400">
                <BookOpen size={32} className="mx-auto text-neutral-500 mb-2" />
                <p className="text-xs">No matching guidelines found for your filter query.</p>
              </div>
            ) : (
              filteredGuidelines.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-[#121215] p-5 space-y-4 transition hover:border-white/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${item.badgeColor}`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-neutral-50">{item.title}</h3>
                          <p className="text-xs text-neutral-400 mt-0.5">{item.summary}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-bold text-neutral-300 uppercase tracking-wider">
                        {item.category}
                      </span>
                    </div>

                    <div className="space-y-2.5 pt-1 border-t border-white/5">
                      {item.rules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-3 rounded-xl bg-[#09090c] border border-white/5 p-3"
                        >
                          <div>
                            <span className="text-xs font-bold text-orange-400 block">{rule.head}</span>
                            <p className="text-xs text-neutral-300 leading-relaxed mt-0.5">{rule.desc}</p>
                          </div>
                          <button
                            onClick={() => handleAskAgent(`Explain guidelines for "${rule.head}": ${rule.desc}`)}
                            className="shrink-0 flex items-center gap-1 rounded-lg bg-orange-500/10 border border-orange-500/20 px-2.5 py-1.5 text-[11px] font-bold text-orange-300 hover:bg-orange-500/20 transition"
                          >
                            <span>Ask Agent</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Live Agent Assistant Terminal (5 Cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 flex flex-col h-[650px] rounded-2xl border border-white/10 bg-[#121216] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#17171d] px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <Bot size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-neutral-50">Live Support Agent</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">Gemini 3.6 Flash Server-Side</p>
                </div>
              </div>
            </div>

            {/* Conversation Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0a0a0d]">
              {conversation.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-neutral-400 px-1">
                    {msg.sender === 'user' ? 'You' : 'Live Agent'} • {msg.timestamp}
                  </div>
                  <div
                    className={`relative group max-w-[90%] rounded-2xl p-3 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-orange-500 text-neutral-950 font-medium rounded-br-none'
                        : 'bg-[#18181f] text-neutral-200 border border-white/10 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {msg.sender === 'agent' && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded bg-black/40 text-neutral-300 hover:text-white transition"
                        title="Copy"
                      >
                        {copiedId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex flex-col items-start space-y-1">
                  <span className="text-[10px] font-semibold text-orange-400">Live Agent is processing...</span>
                  <div className="rounded-2xl bg-[#18181f] border border-white/10 p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Suggestions */}
            <div className="p-2 border-t border-white/5 bg-[#0e0e11]">
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 px-1">
                Suggested Prompts
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => handleAskAgent('How do I optimize my content hooks for B2B LinkedIn?')}
                  className="shrink-0 rounded-lg border border-white/10 bg-[#16161c] px-2.5 py-1 text-[11px] text-neutral-300 hover:bg-orange-500/20 hover:text-orange-300 transition"
                >
                  Content Hooks Strategy
                </button>
                <button
                  onClick={() => handleAskAgent('What qualifies a lead for instant booking?')}
                  className="shrink-0 rounded-lg border border-white/10 bg-[#16161c] px-2.5 py-1 text-[11px] text-neutral-300 hover:bg-orange-500/20 hover:text-orange-300 transition"
                >
                  Lead Scoring (&gt;70)
                </button>
                <button
                  onClick={() => handleAskAgent('What are the Security Scanner checks?')}
                  className="shrink-0 rounded-lg border border-white/10 bg-[#16161c] px-2.5 py-1 text-[11px] text-neutral-300 hover:bg-orange-500/20 hover:text-orange-300 transition"
                >
                  Security Rules
                </button>
              </div>
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAgent();
              }}
              className="p-3 border-t border-white/10 bg-[#14141a] flex items-center gap-2"
            >
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask live agent or query guidelines..."
                className="flex-1 rounded-xl border border-white/10 bg-[#09090b] px-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500/50"
              />
              <button
                type="submit"
                disabled={!chatMessage.trim() || isTyping}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-neutral-950 font-bold hover:bg-orange-400 disabled:opacity-40 transition shadow"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
