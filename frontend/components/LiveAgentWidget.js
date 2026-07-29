import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, MessageSquare, BookOpen, Send, X, Sparkles, ShieldCheck, CheckCircle2, ChevronRight, HelpCircle, User, RefreshCw, Copy, Check } from 'lucide-react';
import { apiCall } from '../lib/api';

const QUICK_QUESTIONS = [
  'What are the core growth & content creation guidelines?',
  'How does Fourdoor qualify and score leads (0-100)?',
  'What security rules apply to outreach email campaigns?',
  'Explain the billing tiers (€79 Pro vs €199 Enterprise)',
  'Write a high-converting B2B LinkedIn post draft'
];

const GUIDELINES_LIST = [
  {
    title: 'Content Creation & Distribution Policy',
    category: 'Content',
    color: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    icon: Sparkles,
    rules: [
      'Every social media post must feature a value-first hook and a single explicit Call To Action (CTA).',
      'Supported target platforms include LinkedIn, Twitter/X, Instagram, and TikTok.',
      'Strict prohibition of misleading engagement-bait, clickbait, or unverified revenue guarantees.'
    ]
  },
  {
    title: 'Lead Scoring & Qualification Protocol',
    category: 'Qualification',
    color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    icon: ShieldCheck,
    rules: [
      'Leads are dynamically evaluated on a 0–100 score matrix based on fit, urgency, budget, and commercial intent.',
      'Leads with score over 70 are classified as "Hot / Qualified" and automatically offered direct demo scheduling.',
      'Status transitions are appended to the Firestore system activity audit logs.'
    ]
  },
  {
    title: 'Outreach & Security Compliance',
    category: 'Security',
    color: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    icon: ShieldCheck,
    rules: [
      'All automated email & message campaigns must pass Security Scanner checks prior to dispatch.',
      'Strict adherence to GDPR, CCPA, and CAN-SPAM regulations, requiring instant unsubscribe handling.',
      'Customer datasets are encrypted via 256-bit SSL protocols in transit and at rest.'
    ]
  },
  {
    title: 'Billing & Account Tiers Policy',
    category: 'Billing',
    color: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    icon: CheckCircle2,
    rules: [
      'Pro Growth Suite (€79/mo): Full automated content engine, lead pipeline, & up to 500 managed leads.',
      'Enterprise Suite (€199/mo): Unlimited lead capacity, custom AI agent workflows, & priority security scanning.',
      'Subscriptions update instantly in real-time via in-app Stripe checkout.'
    ]
  }
];

export default function LiveAgentWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'guidelines'
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  const [chatHistory, setChatHistory] = useState([
    {
      id: 'msg-welcome',
      sender: 'agent',
      text: 'Hello! I am your Live AI Growth & Support Agent. I am here to answer questions, guide you through platform policies, and help optimize your growth engine in real-time.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      scrollToBottom();
    }
  }, [chatHistory, isOpen, activeTab]);

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isTyping) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory((prev) => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setIsTyping(true);

    try {
      const response = await apiCall('/api/live-agent/chat', 'POST', {
        message: textToSend.trim(),
        chatHistory: chatHistory.map((m) => ({ sender: m.sender, text: m.text }))
      });

      const agentMsg = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: response.reply || 'I am online and ready to assist with your growth strategy.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatHistory((prev) => [...prev, agentMsg]);
    } catch (err) {
      console.warn('Live Agent error, using client fallback:', err.message);
      const fallbackMsg = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: `According to Fourdoor growth guidelines, ensure all social posts feature high-converting hooks and pass Security Scanner checks. How else can I assist?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopyText = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAskGuideline = (ruleText) => {
    setActiveTab('chat');
    handleSendMessage(`Can you explain this guideline in detail and how I should apply it: "${ruleText}"?`);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-5 right-5 z-50">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 font-bold text-neutral-950 shadow-2xl shadow-orange-500/25 border border-orange-400/40"
        >
          <div className="relative">
            <Bot size={22} className="text-neutral-950" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-neutral-950"></span>
            </span>
          </div>
          <span className="text-xs font-extrabold tracking-wide uppercase">Live Agent & Guidelines</span>
        </motion.button>
      </div>

      {/* Floating Modal Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 z-50 w-[92vw] max-w-[440px] h-[600px] max-h-[80vh] flex flex-col rounded-2xl border border-white/10 bg-[#0d0d10] text-neutral-100 shadow-2xl backdrop-blur-xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#121216] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <Bot size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-neutral-50">Fourdoor Live AI Agent</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Online
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">Gemini 3.6 Flash • Guidelines & Support</p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-neutral-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/10 bg-[#09090b] p-1 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition ${
                  activeTab === 'chat'
                    ? 'bg-orange-500 text-neutral-950 font-bold shadow'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <MessageSquare size={14} />
                <span>Live Chat</span>
              </button>
              <button
                onClick={() => setActiveTab('guidelines')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition ${
                  activeTab === 'guidelines'
                    ? 'bg-orange-500 text-neutral-950 font-bold shadow'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <BookOpen size={14} />
                <span>Growth Guidelines</span>
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'chat' ? (
              <div className="flex-1 flex flex-col min-h-0 bg-[#0c0c0f]">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {chatHistory.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-neutral-400 px-1">
                        {msg.sender === 'user' ? (
                          <>
                            <span>You</span>
                            <User size={10} />
                          </>
                        ) : (
                          <>
                            <Bot size={10} className="text-orange-400" />
                            <span className="font-semibold text-orange-400">Live Agent</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div
                        className={`relative group max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-orange-500 text-neutral-950 font-medium rounded-br-none shadow-md'
                            : 'bg-[#16161b] text-neutral-200 border border-white/10 rounded-bl-none shadow-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>

                        {msg.sender === 'agent' && (
                          <button
                            onClick={() => handleCopyText(msg.id, msg.text)}
                            className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded bg-black/40 text-neutral-300 hover:text-white transition"
                            title="Copy message"
                          >
                            {copiedId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-orange-400 px-1 font-semibold">
                        <Bot size={10} />
                        <span>Live Agent is thinking...</span>
                      </div>
                      <div className="rounded-2xl bg-[#16161b] border border-white/10 p-3 rounded-bl-none">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Prompts */}
                <div className="p-2 border-t border-white/5 bg-[#09090b]">
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 px-1">
                    Suggested Questions
                  </p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {QUICK_QUESTIONS.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(q)}
                        disabled={isTyping}
                        className="shrink-0 rounded-lg border border-white/10 bg-[#141418] px-2.5 py-1.5 text-[11px] text-neutral-300 hover:bg-orange-500/20 hover:text-orange-300 hover:border-orange-500/30 transition text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Controls */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="p-3 border-t border-white/10 bg-[#121216] flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask live agent or guidelines..."
                    className="flex-1 rounded-xl border border-white/10 bg-[#09090b] px-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500/50 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isTyping}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-neutral-950 font-bold hover:bg-orange-400 disabled:opacity-40 transition shadow"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            ) : (
              /* Guidelines Tab */
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0c0c0f]">
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-orange-300">
                    <Sparkles size={16} />
                    <span>Fourdoor AI Official Guidelines & Protocols</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-neutral-300">
                    These guidelines govern automated content creation, lead scoring thresholds, security standards, and subscription tiers across the platform.
                  </p>
                </div>

                <div className="space-y-3">
                  {GUIDELINES_LIST.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="rounded-xl border border-white/10 bg-[#131317] p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex p-1.5 rounded-lg border ${item.color}`}>
                              <Icon size={14} />
                            </span>
                            <h4 className="text-xs font-bold text-neutral-100">{item.title}</h4>
                          </div>
                          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                        </div>

                        <ul className="space-y-1.5 pl-1">
                          {item.rules.map((rule, rIdx) => (
                            <li key={rIdx} className="flex items-start gap-2 text-[11px] text-neutral-300">
                              <span className="text-orange-400 mt-0.5">•</span>
                              <span className="flex-1">{rule}</span>
                              <button
                                onClick={() => handleAskGuideline(rule)}
                                className="shrink-0 text-[10px] text-orange-400 hover:underline font-semibold"
                              >
                                Ask Agent →
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
