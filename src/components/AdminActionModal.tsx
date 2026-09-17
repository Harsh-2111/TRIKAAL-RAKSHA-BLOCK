import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileEdit,
  TrainTrack,
  ArrowRight,
  Layers
} from 'lucide-react';
import { DEPARTMENT_CONFIG } from '../data/mockData';
import { BlockRequest, User } from '../types';
import { TrainImpactWidget } from './TrainImpactWidget';

interface AdminActionModalProps {
  request: BlockRequest | null;
  allRequests: BlockRequest[];
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSaveAction: (updatedReq: BlockRequest) => void;
}

export const AdminActionModal: React.FC<AdminActionModalProps> = ({
  request,
  allRequests,
  currentUser,
  isOpen,
  onClose,
  onSaveAction,
}) => {
  if (!isOpen || !request) return null;

  const deptConfig = DEPARTMENT_CONFIG[request.department];

  // Possible shadow/integrated blocks on same date & section
  const candidateCorridorBlocks = allRequests.filter(
    (r) =>
      r.id !== request.id &&
      r.section === request.section &&
      r.requestedDate === request.requestedDate &&
      r.status !== 'REJECTED'
  );

  const [decision, setDecision] = useState<'APPROVE' | 'MODIFY' | 'REJECT'>('APPROVE');
  const [approvedStartTime, setApprovedStartTime] = useState(request.requestedStartTime);
  const [approvedEndTime, setApprovedEndTime] = useState(request.requestedEndTime);
  const [cautionOrder, setCautionOrder] = useState(
    request.speedRestrictionKmH
      ? `CO #${Math.floor(100 + Math.random() * 900)}/${new Date().getMonth() + 1}: Restrict speed to ${request.speedRestrictionKmH} KMPH between ${request.startKm} - ${request.endKm} for track stabilization.`
      : ''
  );
  const [controllerRemarks, setControllerRemarks] = useState(
    'Corridor window granted as per train schedule optimization. All trains advised of caution order.'
  );
  const [integratedBlockId, setIntegratedBlockId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const calculateApprovedDuration = () => {
    const [sH, sM] = approvedStartTime.split(':').map(Number);
    const [eH, eM] = approvedEndTime.split(':').map(Number);
    let diff = eH * 60 + eM - (sH * 60 + sM);
    if (diff < 0) diff += 24 * 60;
    return diff;
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (decision === 'REJECT' && !controllerRemarks.trim()) {
      setError('A valid operating reason or remarks is mandatory when rejecting a maintenance block.');
      return;
    }

    const duration = calculateApprovedDuration();
    if (decision !== 'REJECT' && duration <= 0) {
      setError('Approved end time must be later than start time.');
      return;
    }

    const nowStr = `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' })} IST`;

    let finalStatus = request.status;
    if (decision === 'APPROVE') {
      finalStatus = 'APPROVED';
    } else if (decision === 'MODIFY') {
      finalStatus = 'MODIFIED_APPROVED';
    } else if (decision === 'REJECT') {
      finalStatus = 'REJECTED';
    }

    const updated: BlockRequest = {
      ...request,
      status: finalStatus,
      reviewedAt: nowStr,
      reviewedBy: `${currentUser.name} (${currentUser.designation})`,
      approvedStartTime: decision === 'REJECT' ? undefined : approvedStartTime,
      approvedEndTime: decision === 'REJECT' ? undefined : approvedEndTime,
      approvedDurationMinutes: decision === 'REJECT' ? undefined : duration,
      cautionOrderDetails: decision === 'REJECT' ? undefined : cautionOrder.trim() || undefined,
      controllerRemarks: controllerRemarks.trim(),
      integratedWithBlockId: integratedBlockId || undefined,
    };

    onSaveAction(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-300 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-purple-900 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-purple-950">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2 flex-wrap">
                <span>Section Controller Decision Desk</span>
                <span className="text-[10px] bg-amber-500 text-purple-950 font-bold px-2 py-0.5 rounded">
                  Admin Authority
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-purple-200">
                Action on Requisition: <strong>{request.id}</strong> ({deptConfig.code} - {deptConfig.name})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleApply} className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-xs text-slate-700">
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 flex items-start space-x-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Request Digest */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1.5">
            <div className="flex justify-between font-semibold text-slate-800">
              <span>
                Section: {request.section} ({request.lineType})
              </span>
              <span className="font-mono text-blue-900">
                {request.startKm} - {request.endKm}
              </span>
            </div>
            <div className="text-slate-600">
              Work: <strong>{request.workCategory}</strong> — {request.workDescription}
            </div>
            <div className="text-slate-500 flex items-center space-x-3 pt-1 border-t border-slate-200">
              <span>Date: {request.requestedDate}</span>
              <span>•</span>
              <span>
                Requested Slot: {request.requestedStartTime} to {request.requestedEndTime} ({request.durationMinutes} mins)
              </span>
            </div>
          </div>

          {/* Decision Selection Tabs */}
          <div>
            <label className="block font-bold text-slate-800 mb-2 uppercase text-[11px] tracking-wider">
              Select Controller Sanction Decision
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setDecision('APPROVE');
                  setApprovedStartTime(request.requestedStartTime);
                  setApprovedEndTime(request.requestedEndTime);
                  setControllerRemarks('Corridor block granted as requested without train timetable interference.');
                }}
                className={`py-3 px-3 rounded-lg border text-center transition-all cursor-pointer ${
                  decision === 'APPROVE'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                <span className="block text-xs">Sanction Full Block</span>
                <span className="text-[10px] text-slate-500 font-normal">Grant exact slot</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDecision('MODIFY');
                  setControllerRemarks('Approved with adjusted slot to clear passing Rajdhani/Express trains.');
                }}
                className={`py-3 px-3 rounded-lg border text-center transition-all cursor-pointer ${
                  decision === 'MODIFY'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FileEdit className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <span className="block text-xs">Modify & Sanction</span>
                <span className="text-[10px] text-slate-500 font-normal">Adjust time/duration</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDecision('REJECT');
                  setControllerRemarks('Regret: High-density passenger traffic corridor and Rajdhani convoy precedence.');
                }}
                className={`py-3 px-3 rounded-lg border text-center transition-all cursor-pointer ${
                  decision === 'REJECT'
                    ? 'border-red-600 bg-red-50 text-red-900 ring-2 ring-red-500 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-5 h-5 mx-auto mb-1 text-red-600" />
                <span className="block text-xs">Reject / Regret</span>
                <span className="text-[10px] text-slate-500 font-normal">Deny with reason</span>
              </button>
            </div>
          </div>

          {/* Time Modification Controls (if APPROVE or MODIFY) */}
          {decision !== 'REJECT' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center justify-between">
                <span>Sanctioned Corridor Time Window</span>
                <span className="text-blue-900 font-semibold text-xs">
                  Granted Duration: {calculateApprovedDuration()} minutes
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Approved Start Time</label>
                  <input
                    type="time"
                    value={approvedStartTime}
                    onChange={(e) => setApprovedStartTime(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Approved End Time</label>
                  <input
                    type="time"
                    value={approvedEndTime}
                    onChange={(e) => setApprovedEndTime(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                    required
                  />
                </div>
              </div>

              {/* AI Co-Pilot Recommendation Directives */}
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded text-xs space-y-1.5">
                <span className="font-bold text-indigo-950 text-[11px] block flex items-center space-x-1">
                  <span>🤖 AI Co-Pilot Smart Directives:</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDecision('MODIFY');
                      setApprovedStartTime('01:00');
                      setApprovedEndTime('04:00');
                      setControllerRemarks(
                        'AI Co-Pilot: Rescheduled to Night Shift (01:00 - 04:00 hrs) to eliminate passenger detention.'
                      );
                    }}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold bg-[#000075] hover:bg-blue-900 text-white rounded transition-colors shadow-2xs cursor-pointer"
                  >
                    <span>Apply Night Shift (01:00 - 04:00)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCautionOrder(
                        `TSR #409/NR: Restrict speed to 30 KMPH between ${request.startKm} - ${request.endKm} on adjacent track.`
                      );
                    }}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors shadow-2xs cursor-pointer"
                  >
                    <span>Auto-generate 30 KMPH TSR</span>
                  </button>
                </div>
              </div>

              {/* Train Movement Impact Simulation */}
              <TrainImpactWidget
                durationMinutes={calculateApprovedDuration()}
                section={request.section}
                showDetails={true}
              />

              {/* Shadow Corridor Correlation Option */}
              {candidateCorridorBlocks.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-slate-700 font-semibold mb-1 flex items-center">
                    <Layers className="w-3.5 h-3.5 text-purple-700 mr-1" />
                    <span>Link as Integrated Corridor Shadow Block (Optional)</span>
                  </label>
                  <select
                    value={integratedBlockId}
                    onChange={(e) => setIntegratedBlockId(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                  >
                    <option value="">No Integrated Link (Standalone Block)</option>
                    {candidateCorridorBlocks.map((c) => (
                      <option key={c.id} value={c.id}>
                        Club with {c.id} ({c.department} - {c.workCategory} on {c.lineType})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-purple-800 mt-0.5 block">
                    Integrated blocks synchronize track closure with OHE power de-energization or signal disconnection to minimize overall line detention.
                  </span>
                </div>
              )}

              {/* Caution Order input */}
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Draft Speed Restriction / Caution Order (Form T/409)
                </label>
                <input
                  type="text"
                  placeholder="e.g. CO #114/09: Dead stop and proceed at 30 KMPH for 48 hrs..."
                  value={cautionOrder}
                  onChange={(e) => setCautionOrder(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                />
              </div>
            </div>
          )}

          {/* Section Controller Remarks (Mandatory for rejection, recommended for all) */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Section Controller Operating Remarks / Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={controllerRemarks}
              onChange={(e) => setControllerRemarks(e.target.value)}
              placeholder="State traffic clearance, train passage precedence, or rejection justification..."
              className="w-full border border-slate-300 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
              required
            />
          </div>

          {/* Action confirmation button */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-xs font-bold text-white rounded transition-colors shadow-sm flex items-center space-x-2 cursor-pointer ${
                decision === 'REJECT'
                  ? 'bg-red-700 hover:bg-red-800'
                  : decision === 'MODIFY'
                  ? 'bg-blue-700 hover:bg-blue-800'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                Confirm {decision === 'REJECT' ? 'Rejection' : decision === 'MODIFY' ? 'Modification' : 'Sanction'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
