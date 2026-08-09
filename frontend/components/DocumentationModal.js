import { useState, useEffect } from 'react';
import useDialogA11y from '../lib/useDialogA11y';
import { motion, AnimatePresence } from 'motion/react';
import { Search, BookOpen, X, ChevronRight, HelpCircle, Sparkles, ShieldCheck, CreditCard, Target, Bot, Copy, Check, ExternalLink, MessageSquare } from 'lucide-react';
import { toast } from '../lib/toastStore';

const FAQ_DATABASE = [
  {
    id: 'faq-1',
    category: 'Getting Started',
    question: 'How do I generate and schedule social media growth content?',
    answer: 'Navigate to the Calendar tab or Growth Dashboard. Click "New Post", choose your target channel (LinkedIn, Twitter/X, Instagram, or TikTok), select an AI tone or enter a custom prompt, and click "Generate". Once approved, click "Schedule" to publish automatically.',
    tags: ['content', 'social', 'calendar', 'automation'],
    codeSnippet: `// Example API payload for Content Generation\nPOST /api/content/generate\n{\n  "platform": "linkedin",\n  "prompt": "B2B SaaS growth tactics",\n  "tone": "authoritative"\n}`
  },
  {
    id: 'faq-2',
    category: 'Getting Started',
    question: 'How do I import existing leads via CSV?',
    answer: 'Go to the Leads page and click "Import CSV". Ensure your file contains column headers like Name, Email, Company, Title, and Budget. The system automatically parses rows and applies initial lead scores (0–100).',
    tags: ['leads', 'csv', 'import', 'contacts']
  },
  {
    id: 'faq-3',
    category: 'Lead Qualification',
    question: 'How does the 0–100 lead scoring matrix work?',
    answer: 'Fourdoor AI evaluates company fit (+15 pts), budget indicators (+20 pts), decision-maker seniority (+20 pts), and urgency signals (+25 pts). Leads scoring above 70 are tagged as "Hot" and trigger instant calendar booking invitations.',
    tags: ['scoring', 'matrix', 'hot leads', 'qualification']
  },
  {
    id: 'faq-4',
    category: 'Lead Qualification',
    question: 'What happens when a lead reaches Hot (>70) status?',
    answer: 'Hot leads are placed at the top of the Kanban pipeline, assigned priority outreach sequences, and appended with an automated booking link. Transition events are recorded in the Firestore audit activity log.',
    tags: ['kanban', 'hot threshold', 'automation']
  },
  {
    id: 'faq-5',
    category: 'Security & Compliance',
    question: 'What pre-flight checks does the Security Scanner perform?',
    answer: 'The Security Scanner validates campaign copy against spam triggers, verifies SPF/DKIM authentication headers, checks for CAN-SPAM/GDPR mandatory opt-out links, and verifies recipient domain health.',
    tags: ['security', 'compliance', 'gdpr', 'spam']
  },
  {
    id: 'faq-6',
    category: 'Security & Compliance',
    question: 'How is user data encrypted and stored?',
    answer: 'All customer data and lead records are encrypted in transit using 256-bit TLS/SSL protocols. Persistent data is stored securely in Firebase Firestore with fine-grained security rules.',
    tags: ['encryption', 'firestore', 'ssl', 'privacy']
  },
  {
    id: 'faq-7',
    category: 'Billing & Plans',
    question: 'What is included in the Pro Growth Suite (€79/mo)?',
    answer: 'The Pro Growth Suite unlocks full automated content generation across 4 channels, automated lead scoring pipelines up to 500 managed leads, outreach campaign tools, and standard security scans.',
    tags: ['pro', 'pricing', 'billing', 'stripe']
  },
  {
    id: 'faq-8',
    category: 'Billing & Plans',
    question: 'How do I upgrade to the Enterprise Suite (€199/mo)?',
    answer: 'Visit the Billing page, select the Enterprise tier, and click "Subscribe". Your account features, unlimited lead capacity, and custom AI agent rules will update immediately via our Stripe integration.',
    tags: ['enterprise', 'upgrade', 'unlimited']
  },
  {
    id: 'faq-9',
    category: 'Live Agent & AI',
    question: 'How can I interact with the Live Support Agent?',
    answer: 'Click the floating "Live Agent & Guidelines" bubble in the bottom-right corner of any page, or press the Live Agent tab in navigation. You can ask questions about policies, request post drafts, or troubleshoot workflows in real time.',
    tags: ['agent', 'gemini', 'live chat', 'guidelines']
  }
];

export default function DocumentationModal() {
  const [isOpen, setIsOpen] = useState(false);
  // Focus trap, focus restore and Escape handling for the dialog below.
  const dialogRef = useDialogA11y(isOpen, () => setIsOpen(false));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedFaqId, setExpandedFaqId] = useState('faq-1');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Trigger Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Esc to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-docs-modal', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-docs-modal', handleCustomOpen);
    };
  }, [isOpen]);

  const categories = ['All', 'Getting Started', 'Lead Qualification', 'Security & Compliance', 'Billing & Plans', 'Live Agent & AI'];

  const filteredFaqs = FAQ_DATABASE.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesQuery =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  const handleCopyCode = (id, code) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Copied', 'Code snippet copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="docs-modal-title"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 flex h-[620px] max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-[#0e0e12] text-neutral-100 shadow-2xl overflow-hidden"
          >
            {/* Header / Search Bar */}
            <div className="border-b border-white/10 bg-[#141419] p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h2 id="docs-modal-title" className="text-sm font-bold text-neutral-50">Fourdoor AI Documentation & FAQs</h2>
                    <p className="text-[11px] text-neutral-400">Search guidelines, policies, and platform features</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[10px] font-mono text-neutral-400 border border-white/10">
                    <span>⌘</span><span>K</span>
                  </kbd>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white transition"
                    aria-label="Close documentation"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Input */}
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-3 text-neutral-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search FAQs, lead matrix, security guidelines, or billing..."
                  className="w-full rounded-xl border border-white/10 bg-[#08080a] pl-10 pr-4 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500/50 focus:outline-none"
                />
              </div>

              {/* Categories pill bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-3 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                      selectedCategory === cat
                        ? 'bg-orange-500 text-neutral-950 font-bold shadow-sm'
                        : 'bg-[#1b1b22] text-neutral-300 hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQs List Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0a0d]">
              {filteredFaqs.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 space-y-2">
                  <HelpCircle size={32} className="mx-auto text-neutral-500" />
                  <p className="text-xs font-semibold">No documentation matching "{searchQuery}"</p>
                  <p className="text-[11px] text-neutral-500">Try searching for "leads", "security", "billing", or "content".</p>
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaqId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className={`rounded-xl border transition ${
                        isExpanded
                          ? 'border-orange-500/40 bg-[#131318] shadow-lg'
                          : 'border-white/10 bg-[#101014] hover:border-white/20'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                        className="w-full flex items-center justify-between p-3.5 text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-bold">
                            ?
                          </span>
                          <span className="text-xs font-bold text-neutral-100">{faq.question}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-semibold text-neutral-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                            {faq.category}
                          </span>
                          <ChevronRight
                            size={16}
                            className={`text-neutral-400 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90 text-orange-400' : ''
                            }`}
                          />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-3.5 pb-4 pt-1 border-t border-white/5 space-y-3">
                          <p className="text-xs text-neutral-300 leading-relaxed">{faq.answer}</p>

                          {faq.codeSnippet && (
                            <div className="relative rounded-lg bg-[#060608] border border-white/10 p-3 font-mono text-[11px] text-emerald-300">
                              <pre className="overflow-x-auto">{faq.codeSnippet}</pre>
                              <button
                                onClick={() => handleCopyCode(faq.id, faq.codeSnippet)}
                                className="absolute top-2 right-2 p-1 rounded bg-white/10 text-neutral-300 hover:text-white transition"
                                title="Copy code"
                              >
                                {copiedId === faq.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                              </button>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {faq.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] text-neutral-400 bg-white/5 px-2 py-0.5 rounded"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            <button
                              onClick={() => {
                                setIsOpen(false);
                                window.location.href = '/guidelines';
                              }}
                              className="flex items-center gap-1 text-[11px] font-semibold text-orange-400 hover:underline"
                            >
                              <span>Open Live Agent</span>
                              <ExternalLink size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 bg-[#141419] p-3 flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-orange-400" />
                <span>Need tailored assistance? Use our Live Agent</span>
              </span>

              <button
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/guidelines';
                }}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-neutral-950 hover:bg-orange-400 transition"
              >
                Ask Live AI Agent
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
