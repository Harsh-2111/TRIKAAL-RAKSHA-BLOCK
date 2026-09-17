import React from 'react';
import { Train, Clock, AlertCircle, ArrowRight, Gauge, Layers } from 'lucide-react';
import { AffectedTrain, getAffectedTrains } from '../data/trainData';

export interface TrainImpactCalculation {
  durationHours: number;
  durationMinutes: number;
  passengerDelayMinutes: number;
  passengerTrainsRerouted: number;
  freightDelayMinutes: number;
  freightTrainsHeld: number;
  trains: Array<Pick<AffectedTrain, 'id' | 'name' | 'type' | 'delayMins'>>;
  badgeText: string;
}

/**
 * Calculates train delay impact based on requested section and duration (in minutes or hours).
 * Standard Operating Rules formula:
 * - Passenger Delay: Duration (hours) * 12 mins/hr (e.g., 3 hrs = 36 mins delay, 2 trains rerouted)
 * - Freight Delay: Duration (hours) * 25 mins/hr (e.g., 3 hrs = 75 mins delay, 1 train held at loop)
 */
export function calculateTrainImpact(
  durationMinutes: number,
  section?: string
): TrainImpactCalculation {
  const safeMinutes = Math.max(0, durationMinutes || 0);
  const durationHours = safeMinutes / 60;

  // Passenger train delay calculation
  const passengerDelayMinutes = Math.round(durationHours * 12);
  const passengerTrainsRerouted = durationHours <= 0 ? 0 : Math.max(1, Math.round(durationHours * 0.67));

  // Freight train delay calculation
  const freightDelayMinutes = Math.round(durationHours * 25);
  const freightTrainsHeld = durationHours <= 0 ? 0 : Math.max(1, Math.round(durationHours * 0.45));
  const trains = getAffectedTrains(section, safeMinutes).map(({ id, name, type, delayMins }) => ({ id, name, type, delayMins }));

  const badgeText = `🚆 Estimated Delay: ${passengerDelayMinutes}m Passenger | ${freightDelayMinutes}m Freight`;

  return {
    durationHours,
    durationMinutes: safeMinutes,
    passengerDelayMinutes,
    passengerTrainsRerouted,
    freightDelayMinutes,
    freightTrainsHeld,
    trains,
    badgeText,
  };
}

interface TrainImpactBadgeProps {
  durationMinutes: number;
  section?: string;
  className?: string;
}

/**
 * Lightweight metric badge: "🚆 Estimated Delay: 36m Passenger | 75m Freight"
 */
export const TrainImpactBadge: React.FC<TrainImpactBadgeProps> = ({
  durationMinutes,
  section,
  className = '',
}) => {
  const impact = calculateTrainImpact(durationMinutes, section);

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-blue-50 text-[#000075] border border-blue-200 shadow-2xs ${className}`}
      title={`Train Movement Impact: ${impact.passengerDelayMinutes}m Passenger Delay (${impact.passengerTrainsRerouted} trains rerouted) | ${impact.freightDelayMinutes}m Freight Delay (${impact.freightTrainsHeld} held at loop)`}
    >
      <span>🚆</span>
      <span>Estimated Delay:</span>
      <strong className="text-blue-900 font-bold">{impact.passengerDelayMinutes}m Passenger</strong>
      <span className="text-slate-400 font-sans">|</span>
      <strong className="text-amber-800 font-bold">{impact.freightDelayMinutes}m Freight</strong>
    </span>
  );
};

interface TrainImpactWidgetProps {
  durationMinutes: number;
  section?: string;
  showDetails?: boolean;
  className?: string;
}

/**
 * Comprehensive yet lightweight Train Movement Impact Simulation Widget
 * Designed for Block Request submission and Admin Approval workflows.
 */
export const TrainImpactWidget: React.FC<TrainImpactWidgetProps> = ({
  durationMinutes,
  section,
  showDetails = true,
  className = '',
}) => {
  const impact = calculateTrainImpact(durationMinutes, section);

  return (
    <div
      id="train-impact-widget"
      className={`rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50/70 via-slate-50 to-amber-50/50 p-3.5 text-xs text-slate-800 shadow-2xs ${className}`}
    >
      {/* Top Bar with Prompt-Specified Metric Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-blue-200/80">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-[#000075] text-white flex items-center justify-center flex-shrink-0">
            <Train className="w-3.5 h-3.5 text-amber-300" />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight block">
              Train Movement Impact Simulation
            </span>
            <span className="text-[11px] text-slate-500">
              Live estimate for {impact.durationHours.toFixed(1)} hrs window {section ? `on ${section}` : ''}
            </span>
          </div>
        </div>

        {/* Clean, Simple Metric Badge required by user prompt */}
        <div className="flex-shrink-0">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#000075] text-white shadow-2xs">
            <span className="mr-1.5">🚆</span>
            <span>Estimated Delay: </span>
            <span className="text-amber-300 font-mono ml-1">{impact.passengerDelayMinutes}m Passenger</span>
            <span className="mx-1.5 text-blue-300">|</span>
            <span className="text-emerald-300 font-mono">{impact.freightDelayMinutes}m Freight</span>
          </span>
        </div>
      </div>

      {impact.trains.length > 0 && (
        <div className="mt-2.5 rounded border border-slate-200 bg-white/80 p-2">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Affected Trains Details</div>
          <div className="flex flex-wrap gap-1.5">
            {impact.trains.map((train) => (
              <span key={train.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700" title={`${train.name} (${train.type}) - estimated ${train.delayMins}m delay`}>
                <span className="font-mono text-blue-900">#{train.id}</span>
                <span>{train.name}</span>
                <span className="font-mono text-red-700">+{train.delayMins}m</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {showDetails && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5">
          {/* Passenger Train Impact Card */}
          <div className="p-2.5 bg-white/90 rounded border border-blue-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-blue-950 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-blue-700 mr-1" />
                <span>Passenger Services</span>
              </span>
              <span className="font-mono text-[11px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                ~{impact.passengerDelayMinutes} mins delay
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Rate: Duration × 12 mins/hr. Projected impact:{' '}
              <strong className="text-slate-800">
                {impact.passengerTrainsRerouted} passenger/express train{impact.passengerTrainsRerouted !== 1 ? 's' : ''} regulated or rerouted
              </strong>{' '}
              via adjacent UP/DOWN bypass lines.
            </p>
          </div>

          {/* Freight Train Impact Card */}
          <div className="p-2.5 bg-white/90 rounded border border-amber-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-amber-950 flex items-center space-x-1">
                <Gauge className="w-3.5 h-3.5 text-amber-700 mr-1" />
                <span>Freight Operations</span>
              </span>
              <span className="font-mono text-[11px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                ~{impact.freightDelayMinutes} mins delay
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Rate: Duration × 25 mins/hr. Projected impact:{' '}
              <strong className="text-slate-800">
                {impact.freightTrainsHeld} freight goods rake{impact.freightTrainsHeld !== 1 ? 's' : ''} held at loop line
              </strong>{' '}
              to safeguard passenger punctuality.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
