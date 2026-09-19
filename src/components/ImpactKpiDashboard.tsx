import React, { useMemo } from 'react';
import { BlockRequest } from '../types';
import { getCorridorCapacity } from '../data/railwayOperations';
import {
  Activity,
  Gauge,
  GitBranch,
  Landmark,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface SavingsPoint {
  date: string;
  hoursSaved: number;
}

export interface ImpactKpiDashboardProps {
  totalTrackHours: number;
  maintenanceDowntimeHours: number;
  bundledHours: number;
  totalMaintenanceHours: number;
  detentionBeforeMins: number;
  detentionAfterMins: number;
  monthlyTrackHoursSaved: number;
  savingsTrend?: SavingsPoint[];
  optimizedMaintenanceDowntimeHours?: number;
  allRequests?: BlockRequest[];
}

type MetricMode = 'percentage' | 'hours' | 'reduction';

interface ComparisonMetric {
  key: string;
  label: string;
  icon: React.ElementType;
  before: number;
  after: number;
  mode: MetricMode;
  note: string;
  accent: string;
}

const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));
const formatValue = (value: number, mode: MetricMode): string => {
  if (mode === 'hours') return `${value.toFixed(1)}h`;
  if (mode === 'reduction') return `${value.toFixed(1)}%`;
  return `${value.toFixed(1)}%`;
};
const formatDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const defaultTrend = (hours: number): SavingsPoint[] => Array.from({ length: 30 }, (_, index) => ({
  date: `Day ${index + 1}`,
  hoursSaved: Number(((hours / 30) * (index + 1)).toFixed(1)),
}));

export const ImpactKpiDashboard: React.FC<ImpactKpiDashboardProps> = ({
  totalTrackHours,
  maintenanceDowntimeHours,
  bundledHours,
  totalMaintenanceHours,
  detentionBeforeMins,
  detentionAfterMins,
  monthlyTrackHoursSaved,
  savingsTrend,
  optimizedMaintenanceDowntimeHours,
  allRequests = [],
}) => {
  const sharedOperations = useMemo(() => {
    const activeRequests = allRequests.filter((request) => request.status !== 'REJECTED' && request.status !== 'COMPLETED');
    const maintenanceHours = activeRequests.reduce((total, request) => total + (request.approvedDurationMinutes || request.durationMinutes || 0) / 60, 0);
    const bundledHours = activeRequests
      .filter((request) => request.aiOptimized || request.aiBundleId || request.shadowBlockEligible)
      .reduce((total, request) => total + (request.approvedDurationMinutes || request.durationMinutes || 0) / 60, 0);
    const capacityHours = activeRequests.reduce((total, request) => total + Math.max(1, getCorridorCapacity(request.section)[0]?.maxHourlyCapacity || 1) * 24, 0);
    return {
      maintenanceHours,
      bundledHours,
      capacityHours,
      hasSharedRequests: allRequests.length > 0,
    };
  }, [allRequests]);

  const effectiveMaintenanceDowntimeHours = sharedOperations.hasSharedRequests
    ? sharedOperations.maintenanceHours
    : maintenanceDowntimeHours;
  const effectiveTotalMaintenanceHours = sharedOperations.hasSharedRequests
    ? sharedOperations.maintenanceHours
    : totalMaintenanceHours;
  const effectiveBundledHours = sharedOperations.hasSharedRequests
    ? sharedOperations.bundledHours
    : bundledHours;
  const effectiveTrackHours = sharedOperations.hasSharedRequests
    ? Math.max(totalTrackHours, sharedOperations.capacityHours)
    : totalTrackHours;

  const metrics = useMemo<ComparisonMetric[]>(() => {
    const manualAvailability = effectiveTrackHours > 0
      ? clampPercent(((effectiveTrackHours - effectiveMaintenanceDowntimeHours) / effectiveTrackHours) * 100)
      : 0;
    const optimizedDowntime = optimizedMaintenanceDowntimeHours ?? Math.max(0, effectiveMaintenanceDowntimeHours - monthlyTrackHoursSaved);
    const aiAvailability = effectiveTrackHours > 0
      ? clampPercent(((effectiveTrackHours - optimizedDowntime) / effectiveTrackHours) * 100)
      : 0;
    const shadowUtilization = effectiveTotalMaintenanceHours > 0
      ? clampPercent((effectiveBundledHours / effectiveTotalMaintenanceHours) * 100)
      : 0;
    const delayReduction = detentionBeforeMins > 0
      ? clampPercent(((detentionBeforeMins - detentionAfterMins) / detentionBeforeMins) * 100)
      : 0;

    return [
      { key: 'availability', label: 'Asset Availability Index', icon: Gauge, before: manualAvailability, after: aiAvailability, mode: 'percentage', note: 'Track hours available for revenue service', accent: '#38bdf8' },
      { key: 'shadow', label: 'Shadow Block Utilization', icon: GitBranch, before: 0, after: shadowUtilization, mode: 'percentage', note: 'Multi-department work bundled into shared blocks', accent: '#a78bfa' },
      { key: 'delay', label: 'Cascading Delay Reduction', icon: TrendingDown, before: detentionBeforeMins, after: detentionAfterMins, mode: 'reduction', note: `${detentionBeforeMins.toFixed(0)} to ${detentionAfterMins.toFixed(0)} detention minutes`, accent: '#34d399' },
      { key: 'saved', label: 'Monthly Track Hours Saved', icon: Landmark, before: 0, after: monthlyTrackHoursSaved, mode: 'hours', note: 'Cumulative shadow-block savings', accent: '#fbbf24' },
    ];
  }, [detentionAfterMins, detentionBeforeMins, effectiveBundledHours, effectiveMaintenanceDowntimeHours, effectiveTotalMaintenanceHours, effectiveTrackHours, monthlyTrackHoursSaved, optimizedMaintenanceDowntimeHours]);

  const trend = savingsTrend?.length ? savingsTrend : defaultTrend(monthlyTrackHoursSaved);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950 text-slate-100 shadow-2xl" aria-labelledby="impact-kpi-title">
      <header className="border-b border-slate-800 bg-slate-900/90 px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400"><Activity className="h-4 w-4" /> Executive impact cockpit</div>
            <h2 id="impact-kpi-title" className="mt-2 text-xl font-bold tracking-tight text-white">Manual Planning vs RAKSHA-BLOCK AI</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">A rolling view of availability, bundled maintenance, detention exposure, and recovered track capacity.</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-400"><LegendDot color="bg-slate-500" label="Before (Manual)" /><LegendDot color="bg-cyan-400" label="After (RAKSHA-BLOCK AI)" /></div>
        </div>
      </header>

      <div className="grid gap-px border-b border-slate-800 bg-slate-800 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <MetricCard key={metric.key} metric={metric} />)}
      </div>

      <div className="grid gap-5 p-5 sm:p-7 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
        <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-white">Cumulative savings trend</h3><p className="mt-1 text-[11px] text-slate-400">Recovered maintenance hours across the last 30 days</p></div><div className="rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-right"><div className="text-[9px] uppercase tracking-wide text-emerald-300">Month to date</div><div className="text-sm font-bold text-emerald-300">{monthlyTrackHoursSaved.toFixed(1)}h</div></div></div>
          <div className="mt-5 h-[250px] w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={trend} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}><CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(trend.length / 7) - 1)} tickFormatter={formatDate} /><YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }} labelStyle={{ color: '#94a3b8' }} formatter={(value: number) => [`${value.toFixed(1)}h`, 'Saved']} /><Bar dataKey="hoursSaved" fill="#0e7490" radius={[3, 3, 0, 0]} barSize={12} /><Line type="monotone" dataKey="hoursSaved" stroke="#67e8f9" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#67e8f9' }} /></ComposedChart></ResponsiveContainer></div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5"><h3 className="text-sm font-bold text-white">Executive readout</h3><div className="mt-4 space-y-3"><Readout icon={TrendingUp} label="Availability" value={`${metrics[0].after.toFixed(1)}%`} tone="cyan" /><Readout icon={GitBranch} label="Bundled workload" value={`${metrics[1].after.toFixed(1)}%`} tone="violet" /><Readout icon={TrendingDown} label="Delay exposure" value={`${metrics[2].after.toFixed(0)} min`} tone="emerald" /><Readout icon={Landmark} label="Capacity recovered" value={`${monthlyTrackHoursSaved.toFixed(1)}h`} tone="amber" /></div><div className="mt-5 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3 text-[11px] leading-5 text-slate-300">AI coordination concentrates multi-department possessions into fewer protected windows, preserving timetable headroom for premium services.</div></div>
      </div>
    </section>
  );
};

const MetricCard: React.FC<{ metric: ComparisonMetric }> = ({ metric }) => {
  const Icon = metric.icon;
  const delta = metric.key === 'delay' ? metric.before - metric.after : metric.after - metric.before;
  const deltaPercent = metric.key === 'delay' && metric.before > 0 ? ((metric.before - metric.after) / metric.before) * 100 : delta;
  return <article className="bg-slate-900/60 p-4 sm:p-5"><div className="flex items-start justify-between gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${metric.accent}18`, color: metric.accent }}><Icon className="h-4 w-4" /></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${delta >= 0 ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300'}`}>{delta >= 0 ? '+' : ''}{deltaPercent.toFixed(1)}% improvement</span></div><h3 className="mt-4 text-xs font-semibold text-slate-300">{metric.label}</h3><div className="mt-3 space-y-2"><ComparisonBar label="Before (Manual)" value={metric.before} display={formatValue(metric.before, metric.mode)} color="#64748b" max={metric.key === 'delay' ? Math.max(metric.before, 1) : Math.max(metric.before, metric.after, 100)} /><ComparisonBar label="After (RAKSHA-BLOCK AI)" value={metric.after} display={formatValue(metric.after, metric.mode)} color={metric.accent} max={metric.key === 'delay' ? Math.max(metric.before, 1) : Math.max(metric.before, metric.after, 100)} /></div><p className="mt-3 text-[10px] text-slate-500">{metric.note}</p></article>;
};

const ComparisonBar: React.FC<{ label: string; value: number; display: string; color: string; max: number }> = ({ label, value, display, color, max }) => <div><div className="mb-1 flex justify-between gap-2 text-[10px]"><span className="text-slate-500">{label}</span><strong className="text-slate-300">{display}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }} /></div></div>;

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>;
const Readout: React.FC<{ icon: React.ElementType; label: string; value: string; tone: 'cyan' | 'violet' | 'emerald' | 'amber' }> = ({ icon: Icon, label, value, tone }) => <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5"><span className="flex items-center gap-2 text-xs text-slate-400"><Icon className={`h-4 w-4 ${tone === 'cyan' ? 'text-cyan-300' : tone === 'violet' ? 'text-violet-300' : tone === 'emerald' ? 'text-emerald-300' : 'text-amber-300'}`} />{label}</span><strong className="text-sm text-white">{value}</strong></div>;
