import React, { useState } from 'react';
import { XCircle, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { BlockRequest, User } from '../types';
import { DEPARTMENT_CONFIG } from '../data/mockData';

interface AdminRejectModalProps {
  request: BlockRequest | null;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReject: (updatedReq: BlockRequest) => void;
}

const COMMON_REJECTION_REASONS = [
  'High Train Density Window (Rajdhani / Vande Bharat Express Precedence)',
  'Peak Suburban Passenger Traffic Hours (Section Congestion)',
  'Overlapping Urgent Priority Safety Block already in progress on this corridor',
  'Non-availability of 25kV Traction Power Block clearance from Substation',
  'Insufficient Track Maintenance Gang / Machine availability for requested span',
  'Adjacent line clearance not permitted due to special freight movement',
];

export const AdminRejectModal: React.FC<AdminRejectModalProps> = ({
  request,
  currentUser,
  isOpen,
  onClose,
  onConfirmReject,
}) => {
  if (!isOpen || !request) return null;

  const deptConfig = DEPARTMENT_CONFIG[request.department];
  const [rejectionReason, setRejectionReason] = useState<string>(
    'High Train Density Window: Unable to grant corridor due to scheduled mail/express rake sequence. Please resubmit for post-midnight window.'
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSelectPreset = (reason: string) => {
    setRejectionReason(reason);
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setValidationError('Please provide an operational reason for rejecting this block demand.');
      return;
    }

    const nowStr = `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('en-IN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })} IST`;

    const updated: BlockRequest = {
      ...request,
      status: 'REJECTED',
      reviewedAt: nowStr,
      reviewedBy: `${currentUser.name} (${currentUser.designation})`,
      controllerRemarks: rejectionReason.trim(),
    };

    onConfirmReject(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-300 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-red-900 text-white px-6 py-4 flex items-center justify-between border-b-2 border-red-700">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded bg-white/10 flex items-center justify-center border border-white/20">
              <XCircle className="w-5 h-5 text-red-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Reject Block Requisition</h3>
              <p className="text-xs text-red-200">
                Official Controller Rejection Memo • Section Control Desk
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          {/* Target Request Info */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-red-950">{request.id}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${deptConfig.badgeBg} ${deptConfig.badgeText} ${deptConfig.borderColor}`}
              >
                {deptConfig.name}
              </span>
            </div>
            <div className="text-slate-800 font-semibold">{request.section}</div>
            <div className="text-[11px] text-slate-600">
              Requested: {request.requestedDate} ({request.requestedStartTime} - {request.requestedEndTime})
              • Work: {request.workCategory}
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Select Standard Operating Reason (or customize below):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_REJECTION_REASONS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-red-50 hover:text-red-900 border border-slate-200 hover:border-red-300 rounded text-slate-700 text-left transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Reason for Rejection Textarea */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Reason for Rejection <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                setValidationError(null);
              }}
              required
              placeholder="Specify the operational constraint, train schedule conflict, or reason for denial..."
              className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-red-600 focus:border-red-600"
            />
            {validationError && (
              <p className="text-red-600 text-[11px] mt-1 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{validationError}</span>
              </p>
            )}
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded flex items-center space-x-2 text-[11px] text-amber-900">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-700" />
            <span>
              This reason will be officially transmitted to the applicant ({request.applicantName}) and
              instantly visible under their <strong>"Rejected"</strong> records with complete reasoning.
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
              id="btn-confirm-reject"
              className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Confirm Rejection</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
