import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  ArrowUpRight,
  BarChart3,
  Calendar,
  Filter,
  Layers,
  Sparkles,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';

const mockTrendData = {
  '7d': [
    { period: 'Mon', leads: 12, qualified: 8, converted: 3, impressions: 3200, engagements: 290, ctr: 4.2 },
    { period: 'Tue', leads: 18, qualified: 13, converted: 5, impressions: 4500, engagements: 410, ctr: 4.8 },
    { period: 'Wed', leads: 24, qualified: 17, converted: 7, impressions: 6100, engagements: 580, ctr: 5.4 },
    { period: 'Thu', leads: 19, qualified: 14, converted: 6, impressions: 5300, engagements: 490, ctr: 5.1 },
    { period: 'Fri', leads: 29, qualified: 22, converted: 9, impressions: 7800, engagements: 720, ctr: 6.0 },
    { period: 'Sat', leads: 15, qualified: 10, converted: 4, impressions: 3900, engagements: 340, ctr: 4.5 },
    { period: 'Sun', leads: 22, qualified: 16, converted: 8, impressions: 5800, engagements: 510, ctr: 5.2 },
  ],
  '30d': [
    { period: 'Week 1', leads: 78, qualified: 52, converted: 18, impressions: 21500, engagements: 1950, ctr: 4.6 },
    { period: 'Week 2', leads: 95, qualified: 68, converted: 24, impressions: 28400, engagements: 2610, ctr: 5.1 },
    { period: 'Week 3', leads: 112, qualified: 81, converted: 31, impressions: 34200, engagements: 3200, ctr: 5.8 },
    { period: 'Week 4', leads: 138, qualified: 98, converted: 42, impressions: 41800, engagements: 4120, ctr: 6.3 },
  ],
  '90d': [
    { period: 'Month 1', leads: 280, qualified: 195, converted: 68, impressions: 84000, engagements: 7800, ctr: 4.8 },
    { period: 'Month 2', leads: 345, qualified: 242, converted: 89, impressions: 108000, engagements: 10200, ctr: 5.4 },
    { period: 'Month 3', leads: 423, qualified: 299, converted: 115, impressions: 132000, engagements: 12900, ctr: 6.1 },
  ]
};

const mockChannelData = [
  { name: 'LinkedIn Organic', leads: 142, conversionRate: '18.4%', qualityScore: 88, color: '#3b82f6' },
  { name: 'Cold Email AI Outreach', leads: 98, conversionRate: '14.2%', qualityScore: 82, color: '#f97316' },
  { name: 'X / Twitter Threads', leads: 76, conversionRate: '11.8%', qualityScore: 75, color: '#06b6d4' },
  { name: 'Inbound Content Engine', leads: 107, conversionRate: '22.1%', qualityScore: 92, color: '#10b981' },
];

export default function GrowthDashboard({ liveData }) {
  const [timeframe, setTimeframe] = useState('30d');
  const [activeMetric, setActiveMetric] = useState('all');

  const chartData = mockTrendData[timeframe] || mockTrendData['30d'];

  // Calculate totals from timeframe data
  const totalLeads = chartData.reduce((acc, item) => acc + item.leads, 0);
  const totalQualified = chartData.reduce((acc, item) => acc + item.qualified, 0);
  const totalConverted = chartData.reduce((acc, item) => acc + item.converted, 0);
  const totalImpressions = chartData.reduce((acc, item) => acc + item.impressions, 0);

  const qualRate = totalLeads ? ((totalQualified / totalLeads) * 100).toFixed(1) : 0;
  const convRate = totalQualified ? ((totalConverted / totalQualified) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/10 bg-[#141416] p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <TrendingUp size={18} />
            </span>
            <h2 className="text-xl font-bold text-neutral-50">Centralized Growth Engine Dashboard</h2>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Real-time multi-channel lead generation metrics, engagement trends, and AI lead qualification scores.
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0A0A0B] p-1">
          {[
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' },
            { id: '90d', label: '90 Days' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTimeframe(item.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                timeframe === item.id
                  ? 'bg-orange-500 text-neutral-950 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#141416] p-5 shadow-sm">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Leads Generated</span>
            <Users size={16} className="text-orange-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{totalLeads}</span>
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <ArrowUpRight size={12} /> +24.8%
            </span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">
            {totalQualified} AI-qualified leads across all active channels
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#141416] p-5 shadow-sm">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Lead Quality Rate</span>
            <Zap size={16} className="text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{qualRate}%</span>
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <ArrowUpRight size={12} /> +5.2%
            </span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">
            Based on AI intent & qualification scoring threshold
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#141416] p-5 shadow-sm">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Engagement Impressions</span>
            <BarChart3 size={16} className="text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{(totalImpressions / 1000).toFixed(1)}k</span>
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <ArrowUpRight size={12} /> +18.4%
            </span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">
            Total post reads, email opens & social touchpoints
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#141416] p-5 shadow-sm">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Conversion to Call</span>
            <Sparkles size={16} className="text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{convRate}%</span>
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <ArrowUpRight size={12} /> +3.1%
            </span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">
            {totalConverted} strategy calls booked with sales team
          </p>
        </div>
      </div>

      {/* Recharts Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart 1: Lead Generation & Qualification Trends */}
        <div className="rounded-xl border border-white/10 bg-[#141416] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-neutral-100">Lead Generation Volume & Qualification</h3>
              <p className="text-xs text-neutral-400">Comparing total ingested leads vs AI-qualified prospects over time</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-orange-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-orange-500" /> Ingested
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Qualified
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorQual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="period" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111113', borderColor: '#333333', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="leads" name="Total Ingested Leads" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
                <Area type="monotone" dataKey="qualified" name="AI Qualified Leads" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorQual)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Multi-Channel Engagement Trends */}
        <div className="rounded-xl border border-white/10 bg-[#141416] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-neutral-100">Engagement & Interaction Trends</h3>
              <p className="text-xs text-neutral-400">Prospect interactions and click-through metrics across platforms</p>
            </div>
            <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
              Avg CTR: 5.4%
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="period" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111113', borderColor: '#333333', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="engagements" name="Active Interactions" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="converted" name="Booked Conversions" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Channel Performance Breakdown Table */}
      <div className="rounded-xl border border-white/10 bg-[#141416] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-neutral-100">Acquisition Channel Efficiency</h3>
            <p className="text-xs text-neutral-400">Comparing lead quality score and conversion rate by growth vector</p>
          </div>
          <span className="text-xs font-medium text-orange-500">4 Active Channels</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-neutral-400">
                <th className="pb-3 font-semibold">Growth Channel</th>
                <th className="pb-3 font-semibold">Leads Captured</th>
                <th className="pb-3 font-semibold">Conversion Rate</th>
                <th className="pb-3 font-semibold">AI Lead Score</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-neutral-200">
              {mockChannelData.map((channel) => (
                <tr key={channel.name} className="hover:bg-white/[0.02]">
                  <td className="py-3 font-medium flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: channel.color }} />
                    {channel.name}
                  </td>
                  <td className="py-3 font-semibold text-white">{channel.leads}</td>
                  <td className="py-3 text-emerald-400 font-semibold">{channel.conversionRate}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${channel.qualityScore}%` }} />
                      </div>
                      <span className="font-semibold text-neutral-300">{channel.qualityScore}/100</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                      ● Optimized
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
