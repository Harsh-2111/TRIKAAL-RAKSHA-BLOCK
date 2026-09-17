import React, { useState } from 'react';
import {
  X,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Clock,
  MapPin,
  Train,
  CheckCircle2,
  XCircle,
  FileText,
  Lock,
  Zap,
  Sparkles,
  HardHat,
  Download,
  Loader2
} from 'lucide-react';
import { DEPARTMENT_CONFIG } from '../data/mockData';
import { BlockRequest, UserRole, User } from '../types';
import { TrainImpactWidget } from './TrainImpactWidget';
import { AiCoPilotRecommendationEngine } from './AiCoPilotRecommendationEngine';
import { downloadElementAsPdf } from '../utils/pdfGenerator';

interface RequestDetailModalProps {
  request: BlockRequest | null;
  userRole: UserRole;
  isOpen: boolean;
  onClose: () => void;
  onOpenAdminAction?: (request: BlockRequest) => void;
  onOpenSafetyCheckout?: (request: BlockRequest) => void;
  allRequests?: BlockRequest[];
  currentUser?: User;
  onUpdateSuccess?: (message: string) => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  request,
  userRole,
  isOpen,
  onClose,
  onOpenAdminAction,
  onOpenSafetyCheckout,
  allRequests,
  currentUser,
  onUpdateSuccess,
}) => {
  if (!isOpen || !request) return null;

  const deptConfig = DEPARTMENT_CONFIG[request.department];
  const isAdmin = userRole === 'SECTION_CONTROLLER';

  const getStatusBadge = (status: BlockRequest['status']) => {
    switch (status) {
      case 'APPROVED':
        return {
          label: 'APPROVED',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
        };
      case 'MODIFIED_APPROVED':
        return {
          label: 'APPROVED (WITH TIME ADJUSTMENT)',
          bg: 'bg-blue-50 text-blue-800 border-blue-300',
          icon: <CheckCircle2 className="w-4 h-4 text-blue-600" />,
        };
      case 'COMPLETED':
        return {
          label: 'COMPLETED / LINE CLEAR',
          bg: 'bg-teal-50 text-teal-900 border-teal-300',
          icon: <ShieldCheck className="w-4 h-4 text-teal-600" />,
        };
      case 'REJECTED':
        return {
          label: 'REJECTED / REGRET',
          bg: 'bg-red-50 text-red-800 border-red-300',
          icon: <XCircle className="w-4 h-4 text-red-600" />,
        };
      case 'PENDING':
      default:
        return {
          label: 'PENDING CONTROL REVIEW',
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: <Clock className="w-4 h-4 text-amber-600" />,
        };
    }
  };

  const statusBadge = getStatusBadge(request.status);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    const filename = `RAKSHA_BLOCK_Memo_${request.id}.pdf`;
    try {
      await downloadElementAsPdf('printable-memo-modal-card', filename, {
        orientation: 'portrait',
        scale: 2,
      });
      if (onUpdateSuccess) {
        onUpdateSuccess(`Block Memo #${request.id} downloaded successfully as PDF`);
      }
    } catch (err) {
      console.error('Failed to download memo PDF:', err);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div
        id="printable-memo-modal-card"
        className="bg-white rounded-lg border border-slate-300 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:max-h-none print:shadow-none print:border-none"
      >
        {/* Top bar */}
        <div className="bg-[#000075] text-white px-3.5 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-blue-900 print:bg-white print:text-black print:border-b-2 print:border-black">
          <div className="flex items-center space-x-3">
            <img
              src="/logo.png"
              alt="RAKSHA-BLOCK Logo"
              className="hidden print:block h-12 w-auto object-contain shrink-0 mr-1"
            />
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center print:hidden shrink-0">
              <Train className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="text-xs sm:text-base font-bold tracking-tight">
                  INDIAN RAILWAYS • BLOCK REQUISITION MEMO
                </span>
                <span className="bg-amber-500 text-blue-950 text-[10px] font-bold px-2 py-0.5 rounded print:border">
                  MEMO #{request.id}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-200 print:text-gray-600">
                Delhi Division • Automatic Block Planning
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 print:hidden shrink-0">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="p-1.5 rounded text-white/90 hover:text-white hover:bg-white/10 transition-colors flex items-center space-x-1 cursor-pointer"
              title="Download Block Memo as PDF"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={handlePrint}
              className="p-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Print Block Memo"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal content */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-xs text-slate-700 bg-white">
          {/* Status & Priority Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-md">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500">Requisition Status:</span>
              <div
                className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded border text-xs font-bold ${statusBadge.bg}`}
              >
                {statusBadge.icon}
                <span>{statusBadge.label}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500">Priority:</span>
              <span
                className={`px-2 py-0.5 rounded font-bold text-[11px] border ${
                  request.priority === 'SAFETY_CRITICAL'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : request.priority === 'URGENT'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {request.priority.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Department & Applicant Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-blue-50/40 border border-blue-200/80 rounded-md">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Originating Department
              </span>
              <div className="mt-1 flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded font-bold text-xs border ${deptConfig.badgeBg} ${deptConfig.badgeText} ${deptConfig.borderColor}`}>
                  {deptConfig.code}
                </span>
                <span className="font-semibold text-slate-900 text-xs">{deptConfig.name}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Block Type: <strong className="text-blue-900">{request.blockType || request.workCategory}</strong>
              </div>
              {request.urgencyLevel && (
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Urgency: <strong className="text-slate-800">{request.urgencyLevel}</strong>
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Submitting Railway Officer
              </span>
              <div className="mt-1 font-semibold text-slate-900 text-xs">{request.applicantName}</div>
              <div className="text-[11px] text-slate-600">{request.applicantDesignation}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                Filed at: {request.submittedAt}
              </div>
            </div>
          </div>

          {/* Location & Geometry Table */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800 border-b border-slate-200 flex items-center justify-between">
              <span className="flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
                Track & Section Geometry
              </span>
              <span className="text-[11px] font-mono text-slate-600">Division: {request.division}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 p-3 gap-3 text-xs divide-x divide-slate-100">
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-medium">Railway Section</span>
                <span className="font-semibold text-slate-800">{request.section}</span>
              </div>
              <div className="pl-3">
                <span className="text-slate-400 text-[10px] block uppercase font-medium">Block Stretch</span>
                <span className="font-semibold text-slate-800">
                  {request.stationFrom} ➔ {request.stationTo}
                </span>
              </div>
              <div className="pl-3">
                <span className="text-slate-400 text-[10px] block uppercase font-medium">Line Affected</span>
                <span className="font-semibold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded inline-block border border-blue-200">
                  {request.lineType}
                </span>
              </div>
              <div className="pl-3">
                <span className="text-slate-400 text-[10px] block uppercase font-medium">Kilometre Range</span>
                <span className="font-mono font-bold text-slate-800">
                  {request.startKm} to {request.endKm}
                </span>
              </div>
            </div>
          </div>

          {/* Technical Scope & Machinery */}
          <div className="border border-slate-200 rounded p-3.5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Technical Description of Work
            </span>
            <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200 font-sans">
              {request.workDescription}
            </p>

            <div className="pt-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Deployed Plant, Machinery & Labour Gangs
              </span>
              <div className="flex flex-wrap gap-1.5">
                {request.machineryDeployed.map((mach, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium text-[11px]"
                  >
                    • {mach}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Time Comparison & Block Requirements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded p-3 bg-slate-50/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Requested Schedule
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-semibold text-slate-800">{request.requestedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time Window:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {request.requestedStartTime} hrs - {request.requestedEndTime} hrs
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-500">Requested Duration:</span>
                  <span className="font-bold text-blue-900">{request.durationMinutes} minutes</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded p-3 bg-slate-50/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Approved Control Schedule
              </span>
              {request.status === 'APPROVED' || request.status === 'MODIFIED_APPROVED' ? (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Approved Slot:</span>
                    <span className="font-mono font-bold text-emerald-800">
                      {request.approvedStartTime || request.requestedStartTime} hrs -{' '}
                      {request.approvedEndTime || request.requestedEndTime} hrs
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Duration Granted:</span>
                    <span className="font-bold text-emerald-900">
                      {request.approvedDurationMinutes || request.durationMinutes} minutes
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <span className="text-slate-500">Sanctioned By:</span>
                    <span className="text-slate-800 font-medium">{request.reviewedBy || 'Section Controller'}</span>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 italic py-2 text-center text-xs">
                  {request.status === 'REJECTED'
                    ? 'Requisition Not Granted / Train Movement Priority'
                    : 'Awaiting Section Controller Sanction'}
                </div>
              )}
            </div>
          </div>

          {/* ROLE ISOLATION: Train Movement Impact Simulation & AI Co-Pilot EXCLUSIVELY for Section Controller */}
          {isAdmin && (
            <div className="pt-2 border-t border-slate-200">
              {currentUser && allRequests ? (
                <AiCoPilotRecommendationEngine
                  request={request}
                  allRequests={allRequests}
                  currentUser={currentUser}
                  onApplyNightShift={(updated) => {
                    if (onUpdateSuccess) onUpdateSuccess(`Applied night shift to ${updated.id}`);
                  }}
                  onAttachTsr={(updated) => {
                    if (onUpdateSuccess) onUpdateSuccess(`Attached TSR caution order to ${updated.id}`);
                  }}
                  onBundleAndApprove={(bundled) => {
                    if (onUpdateSuccess) onUpdateSuccess(`Bundled and approved ${bundled.length} requests.`);
                  }}
                />
              ) : (
                <TrainImpactWidget
                  durationMinutes={request.approvedDurationMinutes || request.durationMinutes}
                  section={request.section}
                  showDetails={true}
                />
              )}
            </div>
          )}

          {/* Completed Safety Clearance Banner */}
          {request.status === 'COMPLETED' && (
            <div className="p-3.5 bg-teal-50 border border-teal-300 rounded-md space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-teal-900 tracking-wider block flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4 text-teal-700 mr-1" />
                Line Clear Safety Clearance Executed
              </span>
              <p className="text-xs text-teal-950 font-medium">
                Track cleared of staff, all heavy tools/equipment removed beyond safety envelope, and
                OHE traction/S&T signals fully restored to normal interlocking.
              </p>
              <div className="text-[11px] text-teal-800 flex items-center justify-between pt-1 border-t border-teal-200">
                <span>Certified By: <strong>{request.safetyClearedBy || 'Site Engineer'}</strong></span>
                <span>Cleared At: <strong className="font-mono">{request.safetyClearedAt || 'Recorded'}</strong></span>
              </div>
            </div>
          )}

          {/* AI CP-SAT Coordinated Corridor Banner */}
          {request.aiOptimized && (
            <div className="p-3 bg-linear-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-md flex items-start space-x-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div className="text-xs text-indigo-950">
                <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-800 block flex items-center gap-1.5">
                  <span>Coordinated AI CP-SAT Master Corridor Sanction</span>
                  <span className="font-mono bg-indigo-200/70 px-1 py-0.2 rounded text-[10px]">
                    {request.aiBundleId || 'CORRIDOR-BUNDLE'}
                  </span>
                </span>
                <p className="mt-0.5 text-indigo-900/90">
                  This demand was automatically clustered and bundled under synchronized track possession concurrently with other department works, optimizing network capacity.
                </p>
              </div>
            </div>
          )}

          {/* Rejection Notice Banner */}
          {request.status === 'REJECTED' && (
            <div className="p-3.5 bg-red-50 border border-red-300 rounded-md space-y-1">
              <span className="text-[10px] uppercase font-bold text-red-900 tracking-wider block flex items-center space-x-1">
                <XCircle className="w-3.5 h-3.5 text-red-600 mr-1" />
                Section Controller Rejection Notice
              </span>
              <div className="text-xs text-red-950 font-medium">
                <strong>Reason for Rejection:</strong> {request.controllerRemarks || 'High Train Density Window / Traffic Precedence'}
              </div>
              <div className="text-[11px] text-red-800/80">
                Reviewed By: {request.reviewedBy || 'Section Controller'} {request.reviewedAt ? `• ${request.reviewedAt}` : ''}
              </div>
            </div>
          )}

          {/* Controller Remarks / Caution Orders (for Approved or Modified) */}
          {request.status !== 'REJECTED' && (request.controllerRemarks || request.cautionOrderDetails) && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded space-y-2">
              <span className="text-[10px] uppercase font-bold text-amber-900 tracking-wider block">
                Section Controller Assessment & Operating Directives
              </span>
              {request.controllerRemarks && (
                <div className="text-xs text-amber-950">
                  <strong>Operating Remarks:</strong> {request.controllerRemarks}
                </div>
              )}
              {request.cautionOrderDetails && (
                <div className="text-xs text-amber-950 font-mono bg-white/70 p-2 rounded border border-amber-200">
                  <strong>Caution Order (T/409):</strong> {request.cautionOrderDetails}
                </div>
              )}
            </div>
          )}

          {/* Department Security Notice */}
          {!isAdmin && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center space-x-2 text-[11px] text-slate-500">
              <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>
                <strong>Department Officer Security Scope:</strong> You are logged in with{' '}
                {deptConfig.name} credentials. Per Indian Railways Security Directives, department officers have
                observational access only and zero sanction/modification rights.
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-200 hover:bg-slate-300 disabled:opacity-60 rounded transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Download this Block Requisition Memo as a PDF"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-800" />
                  <span>Downloading PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-slate-800" />
                  <span>Download PDF Memo</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Safety Checkout & Clearance button for Active/Approved blocks */}
            {(request.status === 'APPROVED' || request.status === 'MODIFIED_APPROVED') && onOpenSafetyCheckout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSafetyCheckout(request);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors shadow-xs flex items-center space-x-1.5 cursor-pointer"
                title="Site Engineer Safety Clearance and Line Open Authorization"
              >
                <HardHat className="w-4 h-4 text-amber-300" />
                <span>Site Engineer Safety Clearance / Close Block</span>
              </button>
            )}

            {isAdmin && request.status === 'PENDING' && onOpenAdminAction && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAdminAction(request);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-900 hover:bg-purple-950 rounded transition-colors shadow-sm flex items-center space-x-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Take Section Controller Action (Sanction / Reject)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
