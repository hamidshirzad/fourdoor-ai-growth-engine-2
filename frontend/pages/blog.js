import { useState } from 'react';
import Link from 'next/link';
import MarketingPageLayout from '../components/marketing/MarketingPageLayout';
import { ArrowUpRight, BookOpen, Clock, Search, Sparkles, Tag } from 'lucide-react';

const POSTS = [
  {
    id: 1,
    title: 'The 2026 Playbook: How Autonomous AI Replaces Cold Calling in B2B SaaS',
    snippet: 'Learn how multi-agent LLM systems qualify leads, handle DM objections, and book high-ticket demo calls with 0 manual intervention.',
    category: 'Outreach Strategy',
    readTime: '6 min read',
    date: 'July 20, 2026',
    author: 'Fourdoor AI'
  },
  {
    id: 2,
    title: 'How to Calibrate AI Brand Voice to Match Founder Thought Leadership',
    snippet: 'A step-by-step guide on training LLM prompts with custom tone guardrails, eliminating generic SaaS buzzwords.',
    category: 'Content Generation',
    readTime: '4 min read',
    date: 'July 14, 2026',
    author: 'Fourdoor AI'
  },
  {
    id: 3,
    title: 'Multi-Channel ICP Scoring: LinkedIn vs Email vs Twitter Engagement Signals',
    snippet: 'Comparing intent data across platforms to prioritize high-value prospects before sending a single outbound message.',
    category: 'Lead Scoring',
    readTime: '8 min read',
    date: 'June 28, 2026',
    author: 'Fourdoor AI'
  }
];

export default function BlogPage() {
  const [search, setSearch] = useState('');

  const filtered = POSTS.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.snippet.toLowerCase().includes(search.toLowerCase()));

  return (
    <MarketingPageLayout
      title="Fourdoor AI Growth Blog"
      description="Insights, playbooks, and strategies for autonomous outbound sales, content generation, and lead qualification."
    >
      <div className="py-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400 mb-4">
            <BookOpen size={14} />
            Growth Engineering Journal
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-neutral-50 mb-4">
            Insights & Playbooks
          </h1>
          <p className="text-neutral-400 text-sm sm:text-base">
            Master autonomous customer acquisition, LLM brand calibration, and pipeline scaling.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-12 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full rounded-xl border border-white/10 bg-[#111113] pl-10 pr-4 py-2.5 text-xs text-neutral-200 focus:border-orange-500"
          />
        </div>

        {/* Articles List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {filtered.map((post) => (
            <article key={post.id} className="rounded-2xl border border-white/10 bg-[#111113] p-6 hover:border-white/20 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-3">
                  <span className="font-semibold text-orange-400 uppercase tracking-wider">{post.category}</span>
                  <span className="flex items-center gap-1"><Clock size={12} />{post.readTime}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-neutral-50 mb-3 leading-snug hover:text-orange-400 transition-colors cursor-pointer">
                  {post.title}
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed mb-6">{post.snippet}</p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-500">
                <span>{post.author}</span>
                <span>{post.date}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </MarketingPageLayout>
  );
}
