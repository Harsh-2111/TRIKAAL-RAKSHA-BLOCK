import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { BlockRequest, User } from '../types';
import { AiCoPilotRecommendationEngine } from './AiCoPilotRecommendationEngine';

interface AiCoPilotModalProps {
  request: BlockRequest | null;
  allRequests: BlockRequest[];
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onApplyNightShift?: (updatedReq: BlockRequest) => void;
  onAttachTsr?: (updatedReq: BlockRequest) => void;
  onBundleAndApprove?: (bundledReqs: BlockRequest[]) => void;
  onFeedbackToast?: (message: string, type?: 'success' | 'info') => void;
}

export const AiCoPilotModal: React.FC<AiCoPilotModalProps> = ({
  request,
  allRequests,
  currentUser,
  isOpen,
  onClose,
  onApplyNightShift,
  onAttachTsr,
  onBundleAndApprove,
  onFeedbackToast,
}) => {
  if (!isOpen || !request) return null;

  // STRICT SECURITY CHECK: Only SECTION_CONTROLLER can view this modal
  if (currentUser.role !== 'SECTION_CONTROLLER') return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-300 shadow-2xl max-w-3xl w-full min-w-0 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Bar */}
        <div className="bg-[#000075] text-white px-3 sm:px-6 py-3 sm:py-4 flex items-start justify-between gap-2 border-b-2 border-amber-400">
          <div className="flex items-start space-x-2 sm:space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white tracking-tight break-words">
                  AI Co-Pilot Decision Desk & Train Simulation
                </h3>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-6 overflow-y-auto space-y-4 min-w-0">
          <AiCoPilotRecommendationEngine
            request={request}
            allRequests={allRequests}
            currentUser={currentUser}
            onApplyNightShift={(updated) => {
              if (onApplyNightShift) onApplyNightShift(updated);
            }}
            onAttachTsr={(updated) => {
              if (onAttachTsr) onAttachTsr(updated);
            }}
            onBundleAndApprove={(bundled) => {
              if (onBundleAndApprove) onBundleAndApprove(bundled);
            }}
            onFeedbackToast={onFeedbackToast}
          />

          <div className="flex justify-end pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors cursor-pointer"
            >
              Close Co-Pilot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
