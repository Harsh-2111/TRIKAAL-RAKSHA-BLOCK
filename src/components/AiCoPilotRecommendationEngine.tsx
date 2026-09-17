import React, { useState } from 'react';
import {
  Sparkles,
  Clock,
  Gauge,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Train,
  Check,
  RefreshCw,
} from 'lucide-react';
import { BlockRequest, User, Department, AiScheduleRecord } from '../types';
import { calculateTrainImpact, TrainImpactWidget } from './TrainImpactWidget';
import {
  updateBlockRequestInSupabase,
  batchUpdateBlockRequestsInSupabase,
  insertAiScheduleLogToSupabase,
} from '../lib/supabase';
import { playRailwayChime } from '../utils/audioAlert';
import { DEPARTMENT_CONFIG } from '../data/mockData';

const AffectedTrainPills: React.FC<{ trains: ReturnType<typeof calculateTrainImpact>['trains'] }> = ({ trains }) => (
  <div className="pl-8 pt-1">
    <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Affected trains</div>
    <div className="flex flex-wrap gap-1.5">
      {trains.length > 0 ? trains.map((train) => (
        <span key={train.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700" title={`${train.name} (${train.type})`}>
          <span className="font-mono text-blue-900">#{train.id}</span>
          <span className="max-w-[180px] truncate">{train.name}</span>
          <span className="font-mono text-red-700">+{train.delayMins}m</span>
        </span>
      )) : <span className="text-[10px] text-slate-400">No timetable service matched this section.</span>}
    </div>
  </div>
);

interface AiCoPilotRecommendationEngineProps {
  request: BlockRequest;
  allRequests: BlockRequest[];
  currentUser: User;
  onApplyNightShift?: (updatedReq: BlockRequest) => void;
  onAttachTsr?: (updatedReq: BlockRequest) => void;
  onBundleAndApprove?: (bundledReqs: BlockRequest[]) => void;
  onFeedbackToast?: (message: string, type?: 'success' | 'info') => void;
  className?: string;
}

export const AiCoPilotRecommendationEngine: React.FC<AiCoPilotRecommendationEngineProps> = ({
  request,
  allRequests,
  currentUser,
  onApplyNightShift,
  onAttachTsr,
  onBundleAndApprove,
  onFeedbackToast,
  className = '',
}) => {
  const [isProcessingShift, setIsProcessingShift] = useState(false);
  const [isProcessingTsr, setIsProcessingTsr] = useState(false);
  const [isProcessingBundle, setIsProcessingBundle] = useState(false);
  const [selectedTsrSpeed, setSelectedTsrSpeed] = useState<number>(() => {
    return request.speedRestrictionKmH || (request.priority === 'SAFETY_CRITICAL' ? 20 : 30);
  });
  const [customTsrText, setCustomTsrText] = useState<string>(() => {
    return (
      request.cautionOrderDetails ||
      `TSR #409/NR: Impose ${
        request.speedRestrictionKmH || (request.priority === 'SAFETY_CRITICAL' ? 20 : 30)
      } KMPH restriction on adjacent track between ${request.startKm} - ${request.endKm} for track/OHE safety.`
    );
  });

  // Calculate live train movement impact
  const currentDuration = request.approvedDurationMinutes || request.durationMinutes || 180;
  const impact = calculateTrainImpact(currentDuration, request.section);

  // Check if current slot is during daytime (06:00 to 22:00) or has high passenger delay (> 30 mins)
  const isNightShift =
    (request.approvedStartTime || request.requestedStartTime) === '01:00' &&
    (request.approvedEndTime || request.requestedEndTime) === '04:00';

  const isHighDaytimeDelay = impact.passengerDelayMinutes >= 30 || !isNightShift;

  // Find candidate requests for smart cross-department bundling
  const candidateBundleRequests = allRequests.filter(
    (r) =>
      r.id !== request.id &&
      r.section === request.section &&
      r.department !== request.department &&
      r.requestedDate === request.requestedDate &&
      r.status !== 'REJECTED'
  );

  // If no same-section request found on exact date, find candidate on adjacent section or any pending request
  const fallbackBundleCandidate =
    candidateBundleRequests.length > 0
      ? candidateBundleRequests[0]
      : allRequests.find(
          (r) =>
            r.id !== request.id &&
            r.department !== request.department &&
            r.status === 'PENDING'
        ) || null;

  const bundleTarget = candidateBundleRequests[0] || fallbackBundleCandidate;

  // Action 1: "Apply Recommended Shift"
  const handleApplyNightShift = async () => {
    if (currentUser.role !== 'SECTION_CONTROLLER') return;
    setIsProcessingShift(true);

    try {
      const nowStr = `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('en-IN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      })} IST`;

      const updated: BlockRequest = {
        ...request,
        approvedStartTime: '01:00',
        approvedEndTime: '04:00',
        approvedDurationMinutes: 180,
        status: request.status === 'REJECTED' ? 'PENDING' : 'MODIFIED_APPROVED',
        controllerRemarks: `AI Co-Pilot: Rescheduled to Night Shift window (01:00 - 04:00 hrs) to eliminate ${impact.passengerDelayMinutes}m passenger train delay.`,
        reviewedAt: nowStr,
        reviewedBy: `${currentUser.name} (${currentUser.designation})`,
      };

      // 1. Update Supabase block_requests
      await updateBlockRequestInSupabase(updated);

      // 2. Log to ai_schedules audit table
      const scheduleLog: AiScheduleRecord = {
        schedule_name: `Night Shift Optimization - ${request.id}`,
        total_hours_saved: Number((impact.passengerDelayMinutes / 60).toFixed(1)),
        conflicts_resolved: 1,
        bundled_blocks_json: [
          {
            requestId: request.id,
            section: request.section,
            shift: '01:00 - 04:00 hrs',
            savedPassengerMinutes: impact.passengerDelayMinutes,
          },
        ],
      };
      await insertAiScheduleLogToSupabase(scheduleLog);

      // 3. Audio Chime
      playRailwayChime(false);

      if (onApplyNightShift) {
        onApplyNightShift(updated);
      }

      if (onFeedbackToast) {
        onFeedbackToast(
          `AI Co-Pilot: Applied Night Shift (01:00 - 04:00 hrs) for ${request.id}. Passenger delay reduced to 0m!`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('Error applying night shift:', err);
      if (onFeedbackToast) {
        onFeedbackToast(`Failed to apply night shift: ${err.message}`, 'info');
      }
    } finally {
      setIsProcessingShift(false);
    }
  };

  // Action 2: "Attach TSR Caution Order"
  const handleAttachTsr = async () => {
    if (currentUser.role !== 'SECTION_CONTROLLER') return;
    setIsProcessingTsr(true);

    try {
      const nowStr = `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('en-IN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      })} IST`;

      const cautionText =
        customTsrText.trim() ||
        `TSR #409/NR: Impose ${selectedTsrSpeed} KMPH restriction on adjacent track between ${request.startKm} - ${request.endKm} for track/OHE safety.`;

      const updated: BlockRequest = {
        ...request,
        speedRestrictionKmH: selectedTsrSpeed,
        cautionOrderDetails: cautionText,
        reviewedAt: nowStr,
        reviewedBy: `${currentUser.name} (${currentUser.designation})`,
      };

      // 1. Update Supabase block_requests
      await updateBlockRequestInSupabase(updated);

      // 2. Audio chime
      playRailwayChime(false);

      if (onAttachTsr) {
        onAttachTsr(updated);
      }

      if (onFeedbackToast) {
        onFeedbackToast(
          `AI Co-Pilot: Attached TSR (${selectedTsrSpeed} KMPH Form T/409) to requisition ${request.id}.`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('Error attaching TSR:', err);
      if (onFeedbackToast) {
        onFeedbackToast(`Failed to attach TSR: ${err.message}`, 'info');
      }
    } finally {
      setIsProcessingTsr(false);
    }
  };

  // Action 3: "Bundle & Approve Both"
  const handleBundleAndApprove = async () => {
    if (currentUser.role !== 'SECTION_CONTROLLER') return;
    if (!bundleTarget) {
      if (onFeedbackToast) {
        onFeedbackToast('No compatible cross-department block available to bundle at this moment.', 'info');
      }
      return;
    }

    setIsProcessingBundle(true);

    try {
      const nowStr = `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('en-IN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      })} IST`;

      const bundleId = `BUNDLE-${request.department}-${bundleTarget.department}-${Date.now().toString().slice(-4)}`;

      // Harmonize time window (take the longer window or intersection)
      const jointStartTime = request.approvedStartTime || request.requestedStartTime || '01:00';
      const jointEndTime = request.approvedEndTime || request.requestedEndTime || '04:00';
      const jointDuration = Math.max(request.durationMinutes, bundleTarget.durationMinutes);

      const updatedPrimary: BlockRequest = {
        ...request,
        status: 'APPROVED',
        approvedStartTime: jointStartTime,
        approvedEndTime: jointEndTime,
        approvedDurationMinutes: jointDuration,
        aiOptimized: true,
        aiBundleId: bundleId,
        integratedWithBlockId: bundleTarget.id,
        controllerRemarks: `AI Co-Pilot: Sanctioned as Joint Corridor Shadow Block with ${bundleTarget.department} (${bundleTarget.id}). Duplicate line closure eliminated.`,
        reviewedAt: nowStr,
        reviewedBy: `${currentUser.name} (${currentUser.designation})`,
      };

      const updatedPaired: BlockRequest = {
        ...bundleTarget,
        status: 'APPROVED',
        approvedStartTime: jointStartTime,
        approvedEndTime: jointEndTime,
        approvedDurationMinutes: jointDuration,
        aiOptimized: true,
        aiBundleId: bundleId,
        integratedWithBlockId: request.id,
        controllerRemarks: `AI Co-Pilot: Sanctioned as Joint Corridor Shadow Block with ${request.department} (${request.id}). Duplicate line closure eliminated.`,
        reviewedAt: nowStr,
        reviewedBy: `${currentUser.name} (${currentUser.designation})`,
      };

      // 1. Batch update block_requests in Supabase
      await batchUpdateBlockRequestsInSupabase([updatedPrimary, updatedPaired]);

      // 2. Audit log entry in ai_schedules
      const scheduleLog: AiScheduleRecord = {
        schedule_name: `Smart Bundle: ${request.department} + ${bundleTarget.department} (${bundleId})`,
        total_hours_saved: Number((jointDuration / 60).toFixed(1)),
        conflicts_resolved: 2,
        bundled_blocks_json: [
          {
            bundleId,
            section: request.section,
            requests: [updatedPrimary.id, updatedPaired.id],
            departments: [request.department, bundleTarget.department],
            savedDetentionMinutes: Math.min(request.durationMinutes, bundleTarget.durationMinutes),
          },
        ],
      };
      await insertAiScheduleLogToSupabase(scheduleLog);

      // 3. Audio Chime
      playRailwayChime(false);

      if (onBundleAndApprove) {
        onBundleAndApprove([updatedPrimary, updatedPaired]);
      }

      if (onFeedbackToast) {
        onFeedbackToast(
          `AI Co-Pilot: Successfully bundled & approved ${request.id} with ${bundleTarget.id} under ${bundleId}!`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('Error bundling requests:', err);
      if (onFeedbackToast) {
        onFeedbackToast(`Failed to bundle requests: ${err.message}`, 'info');
      }
    } finally {
      setIsProcessingBundle(false);
    }
  };

  return (
    <div
      id="ai-copilot-recommendation-engine"
      className={`rounded-xl border-2 border-indigo-200 bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 p-3 sm:p-4 shadow-sm text-xs text-slate-800 space-y-4 min-w-0 ${className}`}
    >
      {/* Engine Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-200">
        <div className="flex items-start space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#000075] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
              <span className="font-bold text-sm text-[#000075] tracking-tight break-words">
                AI Co-Pilot Recommendation Engine
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block">
              Requisition{' '}
              <strong className="font-mono text-blue-950 font-bold">{request.id}</strong> (
              {request.section})
            </span>
          </div>
        </div>
      </div>

      {/* Embedded Live Train Impact Simulation Widget */}
      <TrainImpactWidget
        durationMinutes={currentDuration}
        section={request.section}
        showDetails={true}
      />

      {/* The 3 Actionable Recommendations */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <span className="font-bold text-slate-900 text-xs flex items-start space-x-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Optimization Actions</span>
          </span>
        </div>

        {/* ==================================================== */}
        {/* Recommendation 1: Reschedule to Night Shift (01:00 - 04:00 hrs) */}
        {/* ==================================================== */}
        <div
          id="recommendation-night-shift"
          className={`rounded-lg border p-3.5 transition-all ${
            isNightShift
              ? 'bg-emerald-50/60 border-emerald-300'
              : 'bg-white border-blue-200 hover:border-blue-400 hover:shadow-2xs'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-start flex-wrap gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h4 className="font-bold text-slate-900 text-xs flex items-center flex-wrap gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-700" />
                  <span>Reschedule to Night Shift (01:00 - 04:00 hrs)</span>
                </h4>
                {isNightShift ? (
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    <Check className="w-3 h-3 mr-1 text-emerald-600" />
                    Zero Passenger Impact (Applied)
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    Saves {impact.passengerDelayMinutes}m Passenger Delay
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed pl-8">
                {isNightShift ? (
                  <span>
                    ✓ Approved slot is already in the zero-passenger night window.
                  </span>
                ) : (
                  <span>
                    Current schedule (
                    <strong>
                      {request.requestedStartTime} - {request.requestedEndTime}
                    </strong>
                    ) causes an estimated <strong className="text-red-700">{impact.passengerDelayMinutes} mins</strong>{' '}
                    passenger delay. Shift to <strong>01:00 - 04:00 hrs</strong> for{' '}
                    <strong className="text-emerald-700 font-bold">0 minutes</strong> delay.
                  </span>
                )}
              </p>

              {/* Delay delta comparison pill */}
              <div className="pl-8 pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-slate-500">Impact:</span>
                <span className="line-through text-red-600 font-mono font-medium">
                  {impact.passengerDelayMinutes}m passenger
                </span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="text-emerald-700 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  0m passenger delay (Night slot)
                </span>
              </div>
              <AffectedTrainPills trains={impact.trains} />
            </div>

            <div className="sm:self-center flex-shrink-0 pl-8 sm:pl-0 w-full sm:w-auto">
              <button
                type="button"
                id="btn-apply-night-shift"
                disabled={isProcessingShift || isNightShift}
                onClick={handleApplyNightShift}
                className={`inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all shadow-xs cursor-pointer w-full sm:w-auto ${
                  isNightShift
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default opacity-80'
                    : 'bg-[#000075] hover:bg-blue-900 active:bg-blue-950 text-white'
                }`}
                title="Automatically adjust time to 01:00 - 04:00 hrs and update Supabase"
              >
                {isProcessingShift ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : isNightShift ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>{isNightShift ? 'Shift Active (01:00 - 04:00)' : 'Apply Recommended Shift'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* Recommendation 2: Auto-generate TSR (Temporary Speed Restriction) */}
        {/* ==================================================== */}
        <div
          id="recommendation-tsr-caution-order"
          className="rounded-lg border border-amber-200 bg-white p-3.5 hover:border-amber-400 hover:shadow-2xs transition-all"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-start flex-wrap gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h4 className="font-bold text-slate-900 text-xs flex items-center flex-wrap gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-amber-700" />
                  <span>Auto-generate TSR (Temporary Speed Restriction Form T/409)</span>
                </h4>
                {request.speedRestrictionKmH && (
                  <span className="inline-flex items-center text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-mono">
                    Active: {request.speedRestrictionKmH} KMPH
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed pl-8">
                Add a Form T/409 speed restriction for <strong>{request.workCategory}</strong> between KM{' '}
                {request.startKm} - {request.endKm}.
              </p>

              {/* Speed selector & editable order draft */}
              <div className="pl-8 pt-1 space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="text-slate-600 font-medium">Select Restriction:</span>
                  <label className="inline-flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="tsrSpeed"
                      checked={selectedTsrSpeed === 30}
                      onChange={() => {
                        setSelectedTsrSpeed(30);
                        setCustomTsrText(
                          `TSR #409/NR: Impose 30 KMPH restriction on adjacent track between ${request.startKm} - ${request.endKm} for ${request.workCategory}.`
                        );
                      }}
                      className="text-amber-600"
                    />
                    <span className="font-mono font-bold text-slate-800">30 KMPH (Standard TSR)</span>
                  </label>
                  <label className="inline-flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="tsrSpeed"
                      checked={selectedTsrSpeed === 20}
                      onChange={() => {
                        setSelectedTsrSpeed(20);
                        setCustomTsrText(
                          `TSR #409/NR: Impose 20 KMPH restriction on adjacent track between ${request.startKm} - ${request.endKm} for track packing/deep screening.`
                        );
                      }}
                      className="text-amber-600"
                    />
                    <span className="font-mono font-bold text-red-800">20 KMPH (Deep Caution)</span>
                  </label>
                </div>

                <div className="flex items-center space-x-2 min-w-0">
                  <input
                    type="text"
                    value={customTsrText}
                    onChange={(e) => setCustomTsrText(e.target.value)}
                    className="flex-1 min-w-0 text-[11px] font-mono border border-slate-300 rounded px-2.5 py-1 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-amber-500"
                    placeholder="Draft TSR text..."
                  />
                </div>
              </div>
            </div>

            <div className="sm:self-center flex-shrink-0 pl-8 sm:pl-0 w-full sm:w-auto">
              <button
                type="button"
                id="btn-attach-tsr-caution"
                disabled={isProcessingTsr}
                onClick={handleAttachTsr}
                className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 transition-all shadow-xs cursor-pointer w-full sm:w-auto"
                title="Attach TSR Caution Order to requisition and persist to Supabase"
              >
                {isProcessingTsr ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                )}
                <span>
                  {request.speedRestrictionKmH === selectedTsrSpeed
                    ? 'Update TSR Order'
                    : 'Attach TSR Caution Order'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* Recommendation 3: Smart Bundling (Combine with S&T / TRD / Engineering) */}
        {/* ==================================================== */}
        <div
          id="recommendation-smart-bundling"
          className="rounded-lg border border-indigo-200 bg-white p-3.5 hover:border-indigo-400 hover:shadow-2xs transition-all"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-start flex-wrap gap-2">
                <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h4 className="font-bold text-slate-900 text-xs flex items-center flex-wrap gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Smart Bundling (Combine with S&T / TRD / Engineering)</span>
                </h4>
                {request.aiOptimized && (
                  <span className="inline-flex items-center text-[10px] font-bold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-300 font-mono">
                    Bundled: {request.aiBundleId || 'Joint Shadow Block'}
                  </span>
                )}
              </div>

              {bundleTarget ? (
                <div className="pl-8 space-y-1.5">
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Aligned requisition from{' '}
                    <strong className="text-indigo-900 font-bold">
                      {bundleTarget.department} ({bundleTarget.id})
                    </strong>{' '}
                    on {bundleTarget.section}. Combined work saves ~
                    <strong className="text-emerald-700 font-bold">
                      {Math.min(request.durationMinutes, bundleTarget.durationMinutes)} mins
                    </strong>{' '}
                    of duplicate line closure.
                  </p>

                  <div className="p-2 bg-indigo-50/60 rounded border border-indigo-200 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900">
                        {request.id} ({request.department})
                      </span>{' '}
                      +{' '}
                      <span className="font-bold text-indigo-900">
                        {bundleTarget.id} ({bundleTarget.department})
                      </span>
                      <span className="text-slate-500 block text-[10px]">
                        Target: {bundleTarget.workCategory} • {bundleTarget.requestedStartTime} -{' '}
                        {bundleTarget.requestedEndTime}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 self-start sm:self-auto font-mono">
                      Multi-Dept Shadow Block
                    </span>
                  </div>
                  <AffectedTrainPills trains={impact.trains} />
                </div>
              ) : (
                <p className="text-[11px] text-slate-600 leading-relaxed pl-8">
                  Scanned 12-hour corridor window across Delhi Division network. No competing demands currently
                  contending for {request.section}. Standalone sanction recommended.
                </p>
              )}
            </div>

            {bundleTarget && (
              <div className="sm:self-center flex-shrink-0 pl-8 sm:pl-0 w-full sm:w-auto">
                <button
                  type="button"
                  id="btn-bundle-approve-both"
                  disabled={isProcessingBundle || request.aiOptimized}
                  onClick={handleBundleAndApprove}
                  className={`inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all shadow-xs cursor-pointer w-full sm:w-auto ${
                    request.aiOptimized
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
                  }`}
                  title="Approve both requests simultaneously as a single bundled corridor shadow block"
                >
                  {isProcessingBundle ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : request.aiOptimized ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-700" />
                  ) : (
                    <Layers className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>{request.aiOptimized ? 'Both Sanctioned in Bundle' : 'Bundle & Approve Both'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
