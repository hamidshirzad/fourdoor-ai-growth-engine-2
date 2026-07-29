import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'motion/react';
import { ArrowUpRight, BarChart2, Calendar, Flame, Layers, Sparkles, TrendingUp, Users } from 'lucide-react';

// Sample dataset simulating autonomous AI engine performance
const DATA_30D = [
  { day: 'Day 1', leads: 12, hotLeads: 3, engagement: 240, callsBooked: 1, impressions: 3200 },
  { day: 'Day 5', leads: 28, hotLeads: 8, engagement: 450, callsBooked: 2, impressions: 6800 },
  { day: 'Day 10', leads: 45, hotLeads: 14, engagement: 820, callsBooked: 4, impressions: 12400 },
  { day: 'Day 15', leads: 68, hotLeads: 22, engagement: 1250, callsBooked: 7, impressions: 18900 },
  { day: 'Day 20', leads: 95, hotLeads: 34, engagement: 1890, callsBooked: 11, impressions: 27500 },
  { day: 'Day 25', leads: 132, hotLeads: 48, engagement: 2450, callsBooked: 16, impressions: 38200 },
  { day: 'Day 30', leads: 184, hotLeads: 67, engagement: 3180, callsBooked: 23, impressions: 49500 },
];

const DATA_90D = [
  { day: 'Month 1', leads: 184, hotLeads: 67, engagement: 3180, callsBooked: 23, impressions: 49500 },
  { day: 'Month 2', leads: 420, hotLeads: 165, engagement: 7850, callsBooked: 58, impressions: 118000 },
  { day: 'Month 3', leads: 890, hotLeads: 342, engagement: 16400, callsBooked: 124, impressions: 245000 },
];

const CHANNEL_DATA = [
  { name: 'LinkedIn', value: 42, color: '#F97316' },
  { name: 'Email Cold', value: 28, color: '#14B8A6' },
  { name: 'Twitter/X', value: 18, color: '#38BDF8' },
  { name: 'Inbound Forms', value: 12, color: '#A855F7' },
];

const METRICS = [
  {
    id: 'leads',
    title: 'Qualified Leads',
    value: '890',
    change: '+184%',
    sub: 'Scored against ICP',
    icon: Users,
    color: 'text-orange-400',
  },
  {
    id: 'hot',
    title: 'Hot Prospects',
    value: '342',
    change: '+210%',
    sub: 'Ready for demo',
    icon: Flame,
    color: 'text-rose-400',
  },
  {
    id: 'engagement',
    title: 'Audience Touchpoints',
    value: '16.4k',
    change: '+340%',
    sub: 'AI comments & DMs',
    icon: TrendingUp,
    color: 'text-teal-400',
  },
  {
    id: 'calls',
    title: 'Calls Booked',
    value: '124',
    change: '+156%',
    sub: 'Direct into calendar',
    icon: Calendar,
    color: 'text-purple-400',
  },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#141416]/95 p-3 text-xs shadow-xl backdrop-blur-md">
        <p className="font-semibold text-neutral-200 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center gap-2 py-0.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-neutral-400">{entry.name}:</span>
            <span className="font-semibold text-neutral-100">{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function GrowthDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState('30D');
  const [activeChart, setActiveChart] = useState('growth'); // 'growth' | 'funnel' | 'channels'

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartData = timeframe === '30D' ? DATA_30D : DATA_90D;

  if (!isMounted) return null;

  return (
    <section id="analytics-demo" className="relative py-24 px-4 bg-[#0A0A0B] text-neutral-50 overflow-hidden">
      {/* Background Glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[900px] rounded-full bg-gradient-to-r from-orange-500/10 via-teal-500/10 to-purple-500/10 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400 mb-4">
            <Sparkles size={14} />
            Live Growth Telemetry
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-neutral-50 mb-4">
            Real-Time Lead & Engagement Analytics
          </h2>
          <p className="text-base sm:text-lg text-neutral-400 max-w-2xl mx-auto">
            Watch how Fourdoor AI drives exponential pipeline velocity without human SDR intervention.
          </p>
        </div>

        {/* Dashboard Shell */}
        <div className="rounded-2xl border border-white/10 bg-[#111113]/90 shadow-2xl backdrop-blur-xl p-5 sm:p-8">
          {/* Top Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-200 animate-ping" />
              </div>
              <span className="text-sm font-semibold text-neutral-200">Autonomous Engine Status: Active</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Chart View Toggle */}
              <div className="flex items-center rounded-lg border border-white/10 bg-[#0A0A0B] p-1 text-xs">
                <button
                  onClick={() => setActiveChart('growth')}
                  className={`rounded px-3 py-1.5 font-medium transition-all ${
                    activeChart === 'growth'
                      ? 'bg-orange-500 text-neutral-950 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Growth Curve
                </button>
                <button
                  onClick={() => setActiveChart('funnel')}
                  className={`rounded px-3 py-1.5 font-medium transition-all ${
                    activeChart === 'funnel'
                      ? 'bg-orange-500 text-neutral-950 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Funnel & Calls
                </button>
                <button
                  onClick={() => setActiveChart('channels')}
                  className={`rounded px-3 py-1.5 font-medium transition-all ${
                    activeChart === 'channels'
                      ? 'bg-orange-500 text-neutral-950 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Channels
                </button>
              </div>

              {/* Timeframe Toggle */}
              <div className="flex items-center rounded-lg border border-white/10 bg-[#0A0A0B] p-1 text-xs">
                <button
                  onClick={() => setTimeframe('30D')}
                  className={`rounded px-2.5 py-1.5 font-semibold transition-all ${
                    timeframe === '30D' ? 'bg-white/15 text-neutral-50' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  30 Days
                </button>
                <button
                  onClick={() => setTimeframe('90D')}
                  className={`rounded px-2.5 py-1.5 font-semibold transition-all ${
                    timeframe === '90D' ? 'bg-white/15 text-neutral-50' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  90 Days
                </button>
              </div>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {METRICS.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-white/5 bg-[#17171a] p-4 transition-all hover:border-white/15"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-neutral-400 font-medium">{m.title}</span>
                    <Icon size={16} className={m.color} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-2xl sm:text-3xl font-bold text-neutral-50">{m.value}</span>
                    <span className="inline-flex items-center text-xs font-semibold text-emerald-400">
                      <ArrowUpRight size={12} />
                      {m.change}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500">{m.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Recharts Visualizer Stage */}
          <div className="rounded-xl border border-white/5 bg-[#0e0e10] p-4 sm:p-6 min-h-[360px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                <BarChart2 size={16} className="text-orange-500" />
                {activeChart === 'growth' && 'Total Lead Volume vs Touchpoints'}
                {activeChart === 'funnel' && 'Lead Conversion & Booked Demo Calls'}
                {activeChart === 'channels' && 'Lead Acquisition Source Distribution'}
              </h3>
              <span className="text-xs text-neutral-500">Updated every 5 mins</span>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {activeChart === 'growth' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="day" stroke="#737373" fontSize={12} tickLine={false} />
                    <YAxis stroke="#737373" fontSize={12} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    <Area
                      type="monotone"
                      dataKey="leads"
                      name="Qualified Leads"
                      stroke="#F97316"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorLeads)"
                    />
                    <Area
                      type="monotone"
                      dataKey="engagement"
                      name="Interactions"
                      stroke="#14B8A6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorEngagement)"
                    />
                  </AreaChart>
                ) : activeChart === 'funnel' ? (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="day" stroke="#737373" fontSize={12} tickLine={false} />
                    <YAxis stroke="#737373" fontSize={12} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    <Bar dataKey="hotLeads" name="Hot Prospects" fill="#F97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="callsBooked" name="Calls Booked" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-center h-full gap-8">
                    <div className="h-[220px] w-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={CHANNEL_DATA}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {CHANNEL_DATA.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {CHANNEL_DATA.map((ch) => (
                        <div key={ch.name} className="flex items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ch.color }} />
                          <span className="text-sm font-medium text-neutral-300 w-28">{ch.name}</span>
                          <span className="text-sm font-bold text-neutral-100">{ch.value}%</span>
                          <span className="text-xs text-neutral-500">share</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
