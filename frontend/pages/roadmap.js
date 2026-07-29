import { useState } from 'react';
import MarketingPageLayout from '../components/marketing/MarketingPageLayout';
import { ArrowUp, CheckCircle, Clock, Lightbulb, MessageSquare, Plus, Sparkles } from 'lucide-react';
import { toast } from '../lib/toastStore';

const ROADMAP_ITEMS = [
  {
    id: 1,
    title: 'AI Voice Call Agent for Outbound Booking',
    desc: 'Autonomous phone agent to conduct 2-minute pre-qualification phone calls and book demos directly.',
    status: 'In Progress',
    votes: 342,
    category: 'Sales Automation'
  },
  {
    id: 2,
    title: 'Multi-Language Brand Voice Calibration',
    desc: 'Generate, engage, and convert prospects natively in Spanish, French, German, and Japanese.',
    status: 'In Progress',
    votes: 218,
    category: 'Localization'
  },
  {
    id: 3,
    title: 'Custom Fine-Tuning on Historical Closed Deals',
    desc: 'Train your Fourdoor AI engine directly on your company’s past winning email threads.',
    status: 'Planned',
    votes: 189,
    category: 'AI Models'
  },
  {
    id: 4,
    title: 'Native WhatsApp Business API Integration',
    desc: 'Extend autonomous conversational engagement to WhatsApp for international markets.',
    status: 'Planned',
    votes: 145,
    category: 'Integrations'
  },
  {
    id: 5,
    title: 'Automated Video Pitch Generator',
    desc: 'Personalized 30-second AI Loom-style video tear-downs tailored to target website URLs.',
    status: 'Under Consideration',
    votes: 97,
    category: 'Content Generation'
  }
];

export default function RoadmapPage() {
  const [items, setItems] = useState(ROADMAP_ITEMS);
  const [votedIds, setVotedIds] = useState([]);
  const [newFeature, setNewFeature] = useState('');

  const handleVote = (id) => {
    if (votedIds.includes(id)) {
      setItems(items.map(item => item.id === id ? { ...item, votes: item.votes - 1 } : item));
      setVotedIds(votedIds.filter(v => v !== id));
      toast.info('Vote removed');
    } else {
      setItems(items.map(item => item.id === id ? { ...item, votes: item.votes + 1 } : item));
      setVotedIds([...votedIds, id]);
      toast.success('Vote counted! Thank you for shaping Fourdoor AI.');
    }
  };

  const handleSuggest = (e) => {
    e.preventDefault();
    if (!newFeature.trim()) return;
    toast.success('Feature suggestion submitted to our product team!');
    setNewFeature('');
  };

  return (
    <MarketingPageLayout
      title="Product Roadmap"
      description="See what features are coming next to Fourdoor AI and vote on upcoming engine capabilities."
    >
      <div className="py-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400 mb-4">
            <Lightbulb size={14} />
            Public Product Vision
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-neutral-50 mb-4">
            Fourdoor AI Roadmap
          </h1>
          <p className="text-neutral-400 text-sm sm:text-base">
            Help prioritize our development roadmap. Vote on features you need or submit your own ideas.
          </p>
        </div>

        {/* Feature Suggestion Bar */}
        <form onSubmit={handleSuggest} className="mb-12 max-w-2xl mx-auto rounded-xl border border-white/10 bg-[#111113] p-4 flex gap-3">
          <input
            type="text"
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            placeholder="Suggest a new feature or integration..."
            className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-orange-400 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus size={14} />
            Submit Idea
          </button>
        </form>

        {/* Roadmap Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const hasVoted = votedIds.includes(item.id);
            return (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-[#111113] p-6 flex flex-col justify-between hover:border-white/20 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">{item.category}</span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      item.status === 'In Progress'
                        ? 'bg-orange-500/15 text-orange-400'
                        : item.status === 'Planned'
                        ? 'bg-teal-500/15 text-teal-400'
                        : 'bg-neutral-500/15 text-neutral-400'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-neutral-50 mb-2">{item.title}</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed mb-6">{item.desc}</p>
                </div>

                <button
                  onClick={() => handleVote(item.id)}
                  className={`w-full rounded-xl py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    hasVoted
                      ? 'bg-orange-500 text-neutral-950 shadow-glow'
                      : 'border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <ArrowUp size={14} className={hasVoted ? 'stroke-[3]' : ''} />
                  <span>{hasVoted ? 'Voted' : 'Upvote Feature'}</span>
                  <span className="ml-auto rounded-full bg-black/30 px-2 py-0.5 text-[10px]">
                    {item.votes}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </MarketingPageLayout>
  );
}
