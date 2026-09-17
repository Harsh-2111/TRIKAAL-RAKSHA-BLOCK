import React, { useState } from 'react';
import { CheckCircle2, X, TrainTrack, ShieldCheck, Clock, Calendar, AlertCircle, Sparkles } from 'lucide-react';
import { BlockRequest, User } from '../types';
import { DEPARTMENT_CONFIG } from '../data/mockData';
import { TrainImpactWidget } from './TrainImpactWidget';
import { AiCoPilotRecommendationEngine } from './AiCoPilotRecommendationEngine';

interface AdminApproveModalProps {
  request: BlockRequest | null;
  currentUser: User;
  allRequests?: BlockRequest[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmApprove: (updatedReq: BlockRequest) => void;
}

export const AdminApproveModal: React.FC<AdminApproveModalProps> = ({
  request,
  currentUser,
  allRequests = [],
  isOpen,
  onClose,
  onConfirmApprove,
}) => {
  if (!isOpen || !request) return null;

  const deptConfig = DEPARTMENT_CONFIG[request.department];
  const [activeTab, setActiveTab] = useState<'COPILOT' | 'STANDARD'>('COPILOT');
  const [cautionOrder, setCautionOrder] = useState<string>(
    request.speedRestrictionKmH
      ? `CO #${Math.floor(100 + Math.random() * 900)}/NR: Speed restriction ${request.speedRestrictionKmH} KMPH between ${request.startKm} - ${request.endKm} for track/OHE safety.`
      : ''
  );
  const [remarks, setRemarks] = useState<string>(
    'Corridor block window sanctioned in full as requested. Adjacent line traffic advised.'
  );

  const handleApprove = (e: React.FormEvent) => {
    e.preventDefault();
    const nowStr = `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('en-IN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })} IST`;

    const updated: BlockRequest = {
      ...request,
      status: 'APPROVED',
      approvedStartTime: request.requestedStartTime,
      approvedEndTime: request.requestedEndTime,
      approvedDurationMinutes: request.durationMinutes,
      cautionOrderDetails: cautionOrder.trim() || undefined,
      controllerRemarks: remarks.trim() || 'Sanctioned by Section Controller',
      reviewedAt: nowStr,
      reviewedBy: `${currentUser.name} (${currentUser.designation})`,
    };

    onConfirmApprove(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-300 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#000075] text-white px-6 py-4 flex items-center justify-between border-b-2 border-emerald-500">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded bg-white/10 flex items-center justify-center border border-white/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Sanction Corridor Block (Approve)</h3>
              <p className="text-xs text-blue-200">
                Main Control Administrator Desk • Indian Railways Operating Code
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

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('COPILOT')}
            className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'COPILOT'
                ? 'border-indigo-600 text-indigo-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Co-Pilot Recommendations</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('STANDARD')}
            className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'STANDARD'
                ? 'border-emerald-600 text-emerald-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Standard Sanction Form</span>
          </button>
        </div>

        {/* Content Body */}
        {activeTab === 'COPILOT' ? (
          <div className="p-6 overflow-y-auto space-y-4 max-h-[75vh]">
            <AiCoPilotRecommendationEngine
              request={request}
              allRequests={allRequests}
              currentUser={currentUser}
              onApplyNightShift={(updated) => {
                onConfirmApprove(updated);
                onClose();
              }}
              onAttachTsr={(updated) => {
                setCautionOrder(updated.cautionOrderDetails || '');
              }}
              onBundleAndApprove={(bundled) => {
                const myUpdated = bundled.find((b) => b.id === request.id) || bundled[0];
                onConfirmApprove(myUpdated);
                onClose();
              }}
            />
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('STANDARD')}
                className="text-xs text-blue-700 hover:underline font-semibold"
              >
                Proceed with standard approval instead →
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleApprove} className="p-6 space-y-4 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
            {/* Summary Requisition Banner */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-emerald-950">{request.id}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${deptConfig.badgeBg} ${deptConfig.badgeText} ${deptConfig.borderColor}`}
                >
                  {deptConfig.name}
                </span>
              </div>
              <div className="text-slate-800 font-semibold">{request.section}</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div>
                  Line / KM: <strong>{request.lineType}</strong> ({request.startKm} - {request.endKm})
                </div>
                <div>
                  Sanctioned Slot:{' '}
                  <strong className="text-emerald-900">
                    {request.requestedStartTime} - {request.requestedEndTime} ({request.durationMinutes}m)
                  </strong>
                </div>
              </div>
            </div>

            {/* Train Movement Impact Calculation Widget */}
            <TrainImpactWidget
              durationMinutes={request.durationMinutes}
              section={request.section}
              showDetails={true}
            />

          {/* Caution Order Details (Form T/409) */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Caution Order / Speed Restriction (Form T/409 - Optional)
            </label>
            <input
              type="text"
              value={cautionOrder}
              onChange={(e) => setCautionOrder(e.target.value)}
              placeholder="e.g. CO #45/NR: Speed 45 KMPH for track packing"
              className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Section Controller Remarks */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Section Controller Sanction Remarks <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              required
              className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded flex items-center space-x-2 text-[11px] text-[#000075]">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>
              Approving will update the status to <strong>"Approved"</strong>, log your name (
              {currentUser.name}), and sync live with the {deptConfig.name} portal in localStorage.
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
              id="btn-confirm-approve"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Sanction Block</span>
            </button>
          </div>
        </form>
      )}
    </div>
  </div>
);
};
