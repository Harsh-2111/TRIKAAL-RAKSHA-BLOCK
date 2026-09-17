import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, X, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { BlockRequest, User } from '../types';
import { DEPARTMENT_CONFIG } from '../data/mockData';
import { TrainImpactWidget } from './TrainImpactWidget';

interface AdminModifyModalProps {
  request: BlockRequest | null;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onConfirmModifyApprove: (updatedReq: BlockRequest) => void;
}

export const AdminModifyModal: React.FC<AdminModifyModalProps> = ({
  request,
  currentUser,
  isOpen,
  onClose,
  onConfirmModifyApprove,
}) => {
  if (!isOpen || !request) return null;

  const deptConfig = DEPARTMENT_CONFIG[request.department];

  // Initialize with requested times or already approved times
  const [startTime, setStartTime] = useState<string>(
    request.approvedStartTime || request.requestedStartTime
  );
  const [endTime, setEndTime] = useState<string>(
    request.approvedEndTime || request.requestedEndTime
  );
  const [cautionOrder, setCautionOrder] = useState<string>(
    request.cautionOrderDetails ||
      (request.speedRestrictionKmH
        ? `CO #${Math.floor(100 + Math.random() * 900)}/NR: Speed restriction ${request.speedRestrictionKmH} KMPH between ${request.startKm} - ${request.endKm}.`
        : '')
  );
  const [controllerRemarks, setControllerRemarks] = useState<string>(
    request.controllerRemarks ||
      'Window trimmed to accommodate passage of Rajdhani Express. Adjacent line clearance verified.'
  );
  const [error, setError] = useState<string | null>(null);

  // Auto-calculated duration in minutes and formatted text
  const calculateDuration = () => {
    if (!startTime || !endTime) return { minutes: 0, text: '--' };
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    let diff = eH * 60 + eM - (sH * 60 + sM);
    if (diff < 0) diff += 24 * 60; // handles overnight windows

    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    const text =
      hours > 0
        ? `${hours} Hour${hours > 1 ? 's' : ''} ${mins > 0 ? `${mins} Min${mins > 1 ? 's' : ''}` : ''} (${diff} mins)`
        : `${mins} Minutes (${diff} mins)`;
    return { minutes: diff, text };
  };

  const durationInfo = calculateDuration();

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (durationInfo.minutes <= 0) {
      setError('Allocated duration must be greater than 0 minutes.');
      return;
    }

    if (!controllerRemarks.trim()) {
      setError('Please provide controller remarks stating the reason for the timing modification.');
      return;
    }

    const nowStr = `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('en-IN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })} IST`;

    const updated: BlockRequest = {
      ...request,
      status: 'MODIFIED_APPROVED',
      approvedStartTime: startTime,
      approvedEndTime: endTime,
      approvedDurationMinutes: durationInfo.minutes,
      cautionOrderDetails: cautionOrder.trim() || undefined,
      controllerRemarks: controllerRemarks.trim(),
      reviewedAt: nowStr,
      reviewedBy: `${currentUser.name} (${currentUser.designation})`,
    };

    onConfirmModifyApprove(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-300 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between border-b-2 border-amber-700">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded bg-white/10 flex items-center justify-center border border-white/20">
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Modify & Sanction Block Window</h3>
              <p className="text-xs text-amber-100">
                Adjust Window & Duration • Operating Controller Desk
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApply} className="p-6 space-y-4 text-xs text-slate-700">
          {/* Target Request Info */}
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-900">{request.id}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${deptConfig.badgeBg} ${deptConfig.badgeText} ${deptConfig.borderColor}`}
              >
                {deptConfig.name}
              </span>
            </div>
            <div className="text-slate-800 font-semibold">{request.section}</div>
            <div className="text-[11px] text-slate-600 flex items-center space-x-2">
              <span>Originally Demanded:</span>
              <strong className="font-mono text-slate-900">
                {request.requestedStartTime} - {request.requestedEndTime} ({request.durationMinutes} mins)
              </strong>
            </div>
          </div>

          {/* Time Modification Controls */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Adjust Approved Maintenance Window</span>
              </h4>
              <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                AI Co-Pilot Available
              </span>
            </div>

            {/* AI Co-Pilot Quick Recommendation Directives */}
            <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded text-xs space-y-2">
              <span className="font-bold text-indigo-950 text-[11px] block flex items-center space-x-1">
                <span>🤖 AI Co-Pilot Quick Directives:</span>
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStartTime('01:00');
                    setEndTime('04:00');
                    setControllerRemarks(
                      'AI Co-Pilot: Rescheduled to Night Shift window (01:00 - 04:00 hrs) to eliminate passenger detention.'
                    );
                  }}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold bg-[#000075] hover:bg-blue-900 text-white rounded transition-colors shadow-2xs cursor-pointer"
                  title="Shift to 01:00 - 04:00 hrs to reduce passenger delay to 0 mins"
                >
                  <Clock className="w-3 h-3 text-amber-300 mr-1" />
                  <span>Reschedule to Night Shift (01:00 - 04:00)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCautionOrder(
                      `TSR #409/NR: Impose 30 KMPH restriction on adjacent track between ${request.startKm} - ${request.endKm} for ${request.workCategory}.`
                    );
                  }}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors shadow-2xs cursor-pointer"
                  title="Auto-generate 30 KMPH Caution Order"
                >
                  <span>Auto-generate TSR 30 KMPH</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Approved Start Time (24h) <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded px-3 py-2 text-xs font-mono font-bold bg-white focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Approved End Time (24h) <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded px-3 py-2 text-xs font-mono font-bold bg-white focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Live Auto-Calculated Duration Display */}
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded flex items-center justify-between text-xs">
              <span className="text-amber-900 font-semibold">Allocated Duration (Auto-Calculated):</span>
              <span className="font-mono font-bold text-amber-950 px-2 py-0.5 bg-white rounded border border-amber-300">
                {durationInfo.text}
              </span>
            </div>

            {/* Live Train Movement Impact Simulation */}
            {durationInfo.minutes > 0 && (
              <TrainImpactWidget
                durationMinutes={durationInfo.minutes}
                section={request.section}
                showDetails={true}
              />
            )}
          </div>

          {/* Caution Order (Form T/409) */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Caution Order / Speed Restriction (Form T/409 - Optional)
            </label>
            <input
              type="text"
              value={cautionOrder}
              onChange={(e) => setCautionOrder(e.target.value)}
              placeholder="e.g. CO #12/NR: Speed restriction 30 KMPH"
              className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Controller Remarks Explaining Modification */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Modification Reason & Operating Condition <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={controllerRemarks}
              onChange={(e) => {
                setControllerRemarks(e.target.value);
                setError(null);
              }}
              required
              placeholder="Explain why the window/duration was adjusted (e.g., train precedence, clearance)..."
              className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded flex items-center space-x-2 text-[11px] text-[#000075]">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>
              This will update status to <strong>"Modified & Approved"</strong>. The department will
              immediately see the adjusted window of <strong>{startTime} - {endTime}</strong> and your remarks.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-confirm-modify"
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Sanction Modified Block</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
