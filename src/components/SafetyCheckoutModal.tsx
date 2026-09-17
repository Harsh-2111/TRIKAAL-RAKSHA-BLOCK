import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HardHat,
  TrainTrack,
  Clock,
  CheckSquare,
  Square,
  Lock,
  ArrowRight
} from 'lucide-react';
import { BlockRequest, User } from '../types';
import { DEPARTMENT_CONFIG } from '../data/mockData';

interface SafetyCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: BlockRequest | null;
  currentUser: User;
  onSubmitSafetyClearance: (updatedReq: BlockRequest) => void;
}

export const SafetyCheckoutModal: React.FC<SafetyCheckoutModalProps> = ({
  isOpen,
  onClose,
  request,
  currentUser,
  onSubmitSafetyClearance,
}) => {
  if (!isOpen || !request) return null;

  const deptConfig = DEPARTMENT_CONFIG[request.department] || DEPARTMENT_CONFIG.ENGINEERING;

  // The 3 mandatory safety checkout checkboxes required by specification
  const [checkStaffCleared, setCheckStaffCleared] = useState(false);
  const [checkToolsRemoved, setCheckToolsRemoved] = useState(false);
  const [checkPowerSignalsRestored, setCheckPowerSignalsRestored] = useState(false);

  // Optional Site Engineer Field Remarks / Fit Certificate No.
  const [remarks, setRemarks] = useState(
    `Track and overhead infrastructure declared FIT for normal train operations at scheduled line speed. Fit certificate issued by ${currentUser.name} (${currentUser.designation}).`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allThreeChecked = checkStaffCleared && checkToolsRemoved && checkPowerSignalsRestored;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allThreeChecked) return;

    setIsSubmitting(true);

    const nowStr = `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('en-IN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })} IST`;

    const updatedRequest: BlockRequest = {
      ...request,
      status: 'COMPLETED',
      closedAt: new Date().toISOString(),
      safetyChecklistAcknowledged: true,
      safetyChecklistPassed: true,
      safetyClearedAt: nowStr,
      safetyClearedBy: `${currentUser.name} (${currentUser.designation})`,
      controllerRemarks: remarks.trim()
        ? `[SAFETY CLEARANCE / LINE OPEN] ${remarks.trim()}`
        : request.controllerRemarks,
    };

    onSubmitSafetyClearance(updatedRequest);
    setIsSubmitting(false);
    onClose();
  };

  const handleSelectAll = () => {
    setCheckStaffCleared(true);
    setCheckToolsRemoved(true);
    setCheckPowerSignalsRestored(true);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-300 shadow-2xl max-w-xl w-full max-h-[calc(100vh-1rem)] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header with authentic Indian Railways aesthetic */}
        <div className="bg-[#000075] text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b-2 border-emerald-500">
          <div className="flex items-start space-x-3 min-w-0">
            <div className="w-9 h-9 rounded bg-emerald-600/30 flex items-center justify-center border border-emerald-400 shrink-0">
              <HardHat className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white leading-snug">
                Site Engineer Safety Checkout & Line Clearance
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer shrink-0"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-6 space-y-4 text-xs text-slate-700 overflow-y-auto min-h-0">
          {/* Active Corridor Block Summary Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-sm text-blue-950">{request.id}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${deptConfig.badgeBg} ${deptConfig.badgeText} ${deptConfig.borderColor}`}
                >
                  {deptConfig.name}
                </span>
              </div>
              <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Active Corridor Block
              </span>
            </div>

            <div className="text-slate-800 font-semibold text-xs">{request.section}</div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div>
                Line / KM: <strong>{request.lineType}</strong> ({request.startKm} - {request.endKm})
              </div>
              <div>
                Window:{' '}
                <strong className="text-blue-900 font-mono">
                  {request.approvedStartTime || request.requestedStartTime} -{' '}
                  {request.approvedEndTime || request.requestedEndTime}
                </strong>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 flex items-center justify-between">
              <span>
                Site Engineer on Duty:{' '}
                <strong className="text-slate-700">
                  {currentUser.name} ({currentUser.designation})
                </strong>
              </span>
              <span className="font-mono text-[10px] text-slate-400">{currentUser.employeeId}</span>
            </div>
          </div>

          {/* Safety Checklist Header with Quick Check All */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-1.5 text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-xs uppercase tracking-wide">
                Mandatory Physical Safety Certifications (3 Required)
              </span>
            </div>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
            >
              Check All (Field Clear)
            </button>
          </div>

          {/* 3 Mandatory Safety Checkboxes required by user specification */}
          <div className="space-y-2.5 bg-amber-50/50 border border-amber-200/90 rounded-lg p-3.5">
            {/* Checkbox 1 */}
            <label
              htmlFor="chk-staff-cleared"
              className={`flex items-start space-x-3 p-2.5 rounded-md border transition-all cursor-pointer ${
                checkStaffCleared
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                id="chk-staff-cleared"
                checked={checkStaffCleared}
                onChange={(e) => setCheckStaffCleared(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer flex-shrink-0"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-xs block">
                  1. Track & Line cleared of all maintenance staff.
                </span>
                <p className="text-[11px] text-slate-500 leading-snug">
                  All departmental gangmen, supervisors, contract laborers, and inspection squads have
                  safely stepped down and retreated beyond the railway safety boundary limit.
                </p>
              </div>
            </label>

            {/* Checkbox 2 */}
            <label
              htmlFor="chk-tools-removed"
              className={`flex items-start space-x-3 p-2.5 rounded-md border transition-all cursor-pointer ${
                checkToolsRemoved
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                id="chk-tools-removed"
                checked={checkToolsRemoved}
                onChange={(e) => setCheckToolsRemoved(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer flex-shrink-0"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-xs block">
                  2. Heavy tools, machinery, and material removed from track gauge.
                </span>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Track tampers, tower wagons, rail dollies, mechanical jacks, and scrap fishplates/ballast
                  are physically locked clear of the standard kinematic train moving envelope.
                </p>
              </div>
            </label>

            {/* Checkbox 3 */}
            <label
              htmlFor="chk-power-signals"
              className={`flex items-start space-x-3 p-2.5 rounded-md border transition-all cursor-pointer ${
                checkPowerSignalsRestored
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                id="chk-power-signals"
                checked={checkPowerSignalsRestored}
                onChange={(e) => setCheckPowerSignalsRestored(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer flex-shrink-0"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-xs block">
                  3. OHE Power restored / S&T Signals re-interlocked.
                </span>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Earthing discharge rods disconnected, 25kV OHE traction supply energized normal, and
                  electronic interlocking points/signals verified with Station Master on duty.
                </p>
              </div>
            </label>
          </div>

          {/* Site Engineer Remarks / Fit Memo Notes */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Field Remarks / Fit Certificate Declaration
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Line physically inspected by SSE/P-Way. Fit for 110 KMPH normal speed."
              className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-emerald-600 text-slate-800"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500">
              {!allThreeChecked ? (
                <span className="text-amber-700 font-semibold flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                  <span>Tick all 3 checkboxes above to authorize Line Clear</span>
                </span>
              ) : (
                <span className="text-emerald-700 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
                  <span>All safety criteria certified by Site Engineer</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-submit-safety-clearance"
                disabled={!allThreeChecked || isSubmitting}
                className={`px-5 py-2 text-xs font-bold rounded shadow-xs flex items-center justify-center space-x-1.5 transition-all w-full sm:w-auto ${
                  allThreeChecked && !isSubmitting
                    ? 'text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 cursor-pointer shadow-md'
                    : 'text-slate-400 bg-slate-200 border border-slate-300 cursor-not-allowed opacity-75'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Safety Clearance & Line Open</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
