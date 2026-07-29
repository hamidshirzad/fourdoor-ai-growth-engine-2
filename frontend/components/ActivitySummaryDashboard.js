import { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { PieChart as PieChartIcon, Activity, Sparkles, Filter, Layers, CheckCircle2, Zap } from 'lucide-react';

const EVENT_COLOR_PALETTE = [
  { color: '#f97316', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' }, // Orange
  { color: '#10b981', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' }, // Emerald
  { color: '#3b82f6', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' }, // Blue
  { color: '#8b5cf6', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' }, // Purple
  { color: '#ec4899', bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/30' }, // Pink
  { color: '#f59e0b', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' }, // Amber
  { color: '#06b6d4', bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' }, // Cyan
  { color: '#6366f1', bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30' } // Indigo
];

function formatActionLabel(rawAction) {
  if (!rawAction) return 'General Event';
  const clean = rawAction.replace(/_/g, ' ');
  switch (clean.toLowerCase()) {
    case 'campaign content generation':
    case 'content generation':
      return 'Content Generation';
    case 'lead qualification score':
    case 'lead qualification':
      return 'Lead Qualification';
    case 'dispatch template sequence':
    case 'email dispatch':
      return 'Outreach Sequence';
    case 'daily funnel optimization':
    case 'funnel optimization':
      return 'Funnel Analytics';
    case 'content compliance scan':
    case 'security scan':
      return 'Security Scan';
    default:
      return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-white/10 bg-[#0f0f13] p-3 shadow-2xl backdrop-blur-md text-xs space-y-1">
        <div className="flex items-center gap-2 font-bold text-neutral-100">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: data.fill }} />
          <span>{data.name}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-neutral-300">
          <span>Event Count:</span>
          <span className="font-mono font-bold text-orange-400">{data.value}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-neutral-400 text-[11px]">
          <span>Distribution Share:</span>
          <span className="font-mono font-semibold text-neutral-200">{data.percentage}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function ActivitySummaryDashboard({ logs = [], onFilterAction, activeFilter }) {
  const [isMounted, setIsMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const eventDistribution = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    const counts = {};
    logs.forEach((log) => {
      const actionKey = log.action || 'system_event';
      const label = formatActionLabel(actionKey);
      counts[label] = (counts[label] || 0) + 1;
    });

    const total = logs.length;
    const entries = Object.entries(counts).map(([name, value], index) => {
      const palette = EVENT_COLOR_PALETTE[index % EVENT_COLOR_PALETTE.length];
      return {
        name,
        value,
        percentage: ((value / total) * 100).toFixed(1),
        color: palette.color,
        palette
      };
    });

    return entries.sort((a, b) => b.value - a.value);
  }, [logs]);

  const totalEvents = logs.length;
  const mostActiveEvent = eventDistribution[0] || { name: 'N/A', value: 0, percentage: '0' };
  const uniqueTypesCount = eventDistribution.length;

  if (!isMounted) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#141416] p-5 shadow-2xl space-y-5">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
            <PieChartIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-neutral-50">Event Types Distribution</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                <Layers size={10} />
                Analytics Summary
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Visual breakdown of recorded system actions, agent executions, and automated triggers.
            </p>
          </div>
        </div>

        {activeFilter && (
          <button
            onClick={() => onFilterAction?.('all')}
            className="self-start sm:self-auto flex items-center gap-1.5 rounded-lg bg-orange-500/15 border border-orange-500/30 px-3 py-1.5 text-xs font-bold text-orange-400 hover:bg-orange-500/25 transition"
          >
            <Filter size={12} />
            <span>Clear Filter: {activeFilter}</span>
          </button>
        )}
      </div>

      {/* Main Content Layout: Pie Chart + Metric Cards & Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Pie Chart Visualizer (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[240px]">
          {eventDistribution.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs">
              No activity log events recorded yet to render distribution chart.
            </div>
          ) : (
            <div className="w-full h-[230px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={eventDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    onClick={(data) => onFilterAction?.(data.name)}
                    cursor="pointer"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {eventDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="#141416"
                        strokeWidth={2}
                        opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                        className="transition-all duration-200"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Donut Center Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-extrabold text-neutral-50 font-mono">{totalEvents}</span>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Events</span>
              </div>
            </div>
          )}
        </div>

        {/* Breakdown List & Metrics Panel (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-xl bg-[#09090b] border border-white/5 p-3">
              <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 block mb-0.5">
                Total Events
              </span>
              <div className="text-base font-extrabold text-neutral-100 font-mono">{totalEvents}</div>
            </div>

            <div className="rounded-xl bg-[#09090b] border border-white/5 p-3">
              <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 block mb-0.5">
                Top Event
              </span>
              <div className="text-xs font-bold text-orange-400 truncate">{mostActiveEvent.name}</div>
            </div>

            <div className="rounded-xl bg-[#09090b] border border-white/5 p-3">
              <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 block mb-0.5">
                Event Categories
              </span>
              <div className="text-base font-extrabold text-emerald-400 font-mono">{uniqueTypesCount}</div>
            </div>
          </div>

          {/* Event Distribution Pills */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block px-1">
              Distribution Breakdown (Click to filter)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {eventDistribution.map((item, idx) => {
                const isSelected = activeFilter === item.name;
                return (
                  <button
                    key={idx}
                    onClick={() => onFilterAction?.(item.name)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500/20 text-neutral-50 shadow'
                        : 'border-white/5 bg-[#0a0a0d] hover:border-white/20 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-semibold truncate">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span className="font-bold text-neutral-200">{item.value}</span>
                      <span className="text-neutral-500">({item.percentage}%)</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
