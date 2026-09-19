import React, { useMemo } from 'react';
import { AlertTriangle, Download, Gauge, Info, Train, X } from 'lucide-react';
import { BlockRequest } from '../types';
import { getAffectedTrainsForBlock, getSectionCapacitySummary } from '../data/railwayOperations';

interface AffectedTrainsModalProps {
  request: BlockRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AffectedTrainsModal: React.FC<AffectedTrainsModalProps> = ({ request, isOpen, onClose }) => {
  const movements = useMemo(() => (request ? getAffectedTrainsForBlock(request.section, request.requestedStartTime, request.requestedEndTime) : []), [request]);
  const capacity = useMemo(
    () => (request ? getSectionCapacitySummary(request, movements.length) : null),
    [request, movements.length],
  );

  if (!isOpen || !request || !capacity) return null;

  const exportImpactReport = () => {
    const rows = [
      ['Requisition ID', 'Department', 'Section', 'Time Window', 'Train', 'Service Type', 'Scheduled Time', 'Delay Minutes', 'AI Directive'],
      ...movements.map((movement) => [
        request.id,
        request.department,
        request.section,
        `${request.requestedStartTime}-${request.requestedEndTime}`,
        `${movement.emoji} ${movement.trainNumber} - ${movement.trainName}`,
        movement.type,
        movement.scheduledSectionTime,
        String(movement.delayMinutes),
        movement.mitigation,
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${request.id}_affected_trains_impact.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-xs sm:p-6" role="dialog" aria-modal="true" aria-labelledby="affected-trains-title">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b-4 border-amber-500 bg-[#000075] px-4 py-3 text-white sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-amber-300"><Train className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h2 id="affected-trains-title" className="truncate text-sm font-bold sm:text-base">Affected Train Movements &amp; Operations</h2>
              <p className="truncate text-[11px] text-blue-200">{request.id} • {request.department} • {request.section} • {request.requestedStartTime} - {request.requestedEndTime} • {request.durationMinutes} mins</p>
            </div>
          </div>
          <div className="flex items-center gap-1"><button type="button" onClick={exportImpactReport} className="rounded p-1.5 text-blue-200 hover:bg-white/10 hover:text-white" title="Export impact report" aria-label="Export impact report"><Download className="h-4 w-4" /></button><button type="button" onClick={onClose} className="rounded p-1.5 text-blue-200 hover:bg-white/10 hover:text-white" title="Close affected train details" aria-label="Close"><X className="h-5 w-5" /></button></div>
        </header>

        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Line capacity utilization" value={`${capacity.utilizationPercent}%`} tone="blue" />
            <Metric label="Daily scheduled trains" value={String(capacity.dailyTrainCount)} tone="slate" />
            <Metric label="Affected in block window" value={String(capacity.affectedTrainCount)} tone="amber" />
            <Metric label="Safety margin envelope" value={capacity.safetyStatus} tone={capacity.safetyStatus === 'WITHIN ENVELOPE' ? 'green' : 'red'} />
          </div>

          <div className="mb-5 inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-black text-amber-950">
            🚆 {movements.length} Trains Affected
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="mb-2 flex items-center gap-2 font-bold text-slate-800"><Gauge className="h-4 w-4 text-blue-700" /> Section capacity &amp; timetable breakdown</div>
              <div className="grid grid-cols-2 gap-y-1.5 text-slate-600">
                <span>Line type</span><strong className="text-right text-slate-900">{capacity.lineType}</strong>
                <span>Total tracks</span><strong className="text-right text-slate-900">{capacity.totalTracks}</strong>
                <span>Max hourly capacity</span><strong className="text-right text-slate-900">{capacity.maxHourlyCapacity.toFixed(1)} trains/hr</strong>
                <span>Criticality</span><strong className="text-right text-slate-900">{capacity.criticalityTier}</strong>
              </div>
            </div>
            <div className={`rounded-lg border p-3 text-xs ${capacity.safetyStatus === 'WITHIN ENVELOPE' ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
              <div className="mb-2 flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> Operational envelope</div>
              <p>Projected block utilization is {capacity.utilizationPercent}%, leaving a {capacity.safetyMarginPercent}% calculated margin for regulation and recovery.</p>
              <p className="mt-2 font-semibold">Status: {capacity.safetyStatus}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[900px] w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-100 text-[10px] uppercase tracking-wider text-slate-600">
                <tr><th className="px-3 py-2.5">Train number &amp; name</th><th className="px-3 py-2.5">Service category</th><th className="px-3 py-2.5">Scheduled section time</th><th className="px-3 py-2.5">Delay / regulation</th><th className="px-3 py-2.5">Operational mitigation</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500"><Info className="mx-auto mb-2 h-7 w-7 text-slate-400" />No timetable movement intersects this block window.</td></tr>
                ) : movements.map((movement) => (
                  <tr key={`${movement.trainNumber}-${movement.scheduledSectionTime}`} className="hover:bg-blue-50/40">
                    <td className="px-3 py-3"><div className="font-mono font-bold text-blue-950">{movement.emoji} {movement.trainNumber}</div><div className="font-semibold text-slate-800">{movement.trainName}</div><div className="text-[10px] text-slate-500">{movement.source} → {movement.destination}</div></td>
                    <td className="px-3 py-3"><span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-700">{movement.type}</span><div className="mt-1 text-[10px] text-slate-500">Priority class {movement.priorityClass} • {movement.direction}</div></td>
                    <td className="px-3 py-3 font-mono font-semibold text-slate-800">{movement.scheduledSectionTime}</td>
                    <td className="px-3 py-3"><span className="font-mono font-bold text-red-700">+{movement.delayMinutes} min</span></td>
                    <td className="px-3 py-3 font-medium text-slate-700">{movement.mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; tone: 'blue' | 'slate' | 'amber' | 'green' | 'red' }> = ({ label, value, tone }) => {
  const colors = { blue: 'border-blue-200 bg-blue-50 text-blue-950', slate: 'border-slate-200 bg-slate-50 text-slate-900', amber: 'border-amber-200 bg-amber-50 text-amber-950', green: 'border-emerald-200 bg-emerald-50 text-emerald-950', red: 'border-red-200 bg-red-50 text-red-950' };
  return <div className={`rounded-lg border p-3 ${colors[tone]}`}><div className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</div><div className="mt-1 text-xl font-black">{value}</div></div>;
};
