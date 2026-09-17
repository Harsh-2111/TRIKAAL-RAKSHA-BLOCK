import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  Lock,
  TrainTrack,
  ArrowUpDown,
  Eye,
  Shield,
  Zap,
  Info,
  Layers,
  Send,
  Calendar,
  Sparkles,
  Printer,
  FileSpreadsheet,
  Download,
  HardHat,
  ShieldCheck
} from 'lucide-react';
import { DEPARTMENT_CONFIG } from '../data/mockData';
import { BlockPriority, BlockRequest, BlockStatus, Department, UrgencyLevel, User, RailwayZoneCode } from '../types';
import { DepartmentBlockRequestForm } from './DepartmentBlockRequestForm';
import { FieldRosterModal } from './FieldRosterModal';
import { exportRequestsToCsv } from '../utils/exportUtils';

interface DepartmentDashboardProps {
  currentUser: User;
  allRequests: BlockRequest[];
  onOpenNewRequest: () => void;
  onViewRequestDetail: (req: BlockRequest) => void;
  onCreateNewRequest: (req: BlockRequest) => void;
  onOpenSafetyCheckout: (req: BlockRequest) => void;
  activeZone?: RailwayZoneCode;
}

export const DepartmentDashboard: React.FC<DepartmentDashboardProps> = ({
  currentUser,
  allRequests,
  onOpenNewRequest,
  onViewRequestDetail,
  onCreateNewRequest,
  onOpenSafetyCheckout,
  activeZone = 'ALL',
}) => {
  // STRICT RULE 1: Department Isolation
  // Department officers can ONLY view requests for their own department.
  const userDept = currentUser.department as Department;
  const deptConfig = DEPARTMENT_CONFIG[userDept] || DEPARTMENT_CONFIG.ENGINEERING;

  // View state: 'TABLE' (My Department Demands) or 'FORM' (Submit New Block Request)
  const [activeTab, setActiveTab] = useState<'TABLE' | 'FORM'>('TABLE');
  const requestFormRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeTab !== 'FORM') return;
    requestFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeTab]);

  // Success Banner state for Phase 2
  const [latestSubmittedId, setLatestSubmittedId] = useState<string | null>(null);

  // Phase 5: Official Field Roster PDF Modal state
  const [isFieldRosterOpen, setIsFieldRosterOpen] = useState(false);

  // CSV / Excel Export Handler
  const handleExportCsv = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `RAKSHA_BLOCK_${deptConfig.code}_Demands_${dateStr}.csv`;
    exportRequestsToCsv(filteredRequests, filename);
  };

  const isolatedRequests = useMemo(() => {
    return allRequests.filter((req) => {
      if (req.department !== userDept) return false;
      if (activeZone && activeZone !== 'ALL') {
        const reqZone =
          req.zoneCode ||
          (req.zone?.includes('WR')
            ? 'WR'
            : req.zone?.includes('CR')
            ? 'CR'
            : req.zone?.includes('ER')
            ? 'ER'
            : req.zone?.includes('SR')
            ? 'SR'
            : 'NR');
        if (reqZone !== activeZone) return false;
      }
      return true;
    });
  }, [allRequests, userDept, activeZone]);

  // Filters for Table View
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');

  // Helper to normalize urgency
  const getUrgencyDisplay = (req: BlockRequest): UrgencyLevel => {
    if (req.urgencyLevel) return req.urgencyLevel;
    if (req.priority === 'SAFETY_CRITICAL') return 'Critical Emergency';
    if (req.priority === 'URGENT') return 'Priority';
    return 'Routine';
  };

  // Helper to normalize block type
  const getBlockTypeDisplay = (req: BlockRequest): string => {
    if (req.blockType) return req.blockType;
    return req.workCategory || 'Track Maintenance';
  };

  // Filtered requests for "My Department Demands" table
  const filteredRequests = useMemo(() => {
    return isolatedRequests.filter((req) => {
      const bType = getBlockTypeDisplay(req);
      const urgency = getUrgencyDisplay(req);

      const matchesSearch =
        req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.workDescription && req.workDescription.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (req.justification && req.justification.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
      const matchesUrgency = urgencyFilter === 'ALL' || urgency === urgencyFilter;

      return matchesSearch && matchesStatus && matchesUrgency;
    });
  }, [isolatedRequests, searchTerm, statusFilter, urgencyFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = isolatedRequests.length;
    const pending = isolatedRequests.filter((r) => r.status === 'PENDING').length;
    const approved = isolatedRequests.filter(
      (r) => r.status === 'APPROVED' || r.status === 'MODIFIED_APPROVED'
    ).length;
    const rejected = isolatedRequests.filter((r) => r.status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [isolatedRequests]);

  const handleFormSuccess = (newReq: BlockRequest) => {
    onCreateNewRequest(newReq);
    setLatestSubmittedId(newReq.id);
    setActiveTab('TABLE');
  };

  const renderStatusBadge = (status: BlockStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            Approved
          </span>
        );
      case 'MODIFIED_APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-300">
            <CheckCircle2 className="w-3 h-3 mr-1 text-blue-600" />
            Modified & Approved
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-300">
            <ShieldCheck className="w-3 h-3 mr-1 text-teal-600" />
            Completed / Line Clear
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-800 border border-red-300">
            <XCircle className="w-3 h-3 mr-1 text-red-600" />
            Rejected
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 mr-1 text-amber-600" />
            Pending
          </span>
        );
    }
  };

  const renderUrgencyBadge = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case 'Critical Emergency':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-300">
            <AlertTriangle className="w-3 h-3 mr-1 text-red-600" />
            Critical Emergency
          </span>
        );
      case 'Priority':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 mr-1 text-amber-600" />
            Priority
          </span>
        );
      case 'Routine':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Routine
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Officer Context & Department Security Tag */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase border ${deptConfig.badgeBg} ${deptConfig.badgeText} ${deptConfig.borderColor}`}
            >
              {deptConfig.code} DEPARTMENT CONSOLE
            </span>
            <span className="text-xs text-slate-400 font-mono">Division: {currentUser.division}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center space-x-2">
            <span>{deptConfig.name}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Logged in as <strong>{currentUser.name}</strong> ({currentUser.designation}) • ID:{' '}
            <span className="font-mono text-slate-700">{currentUser.employeeId}</span>
          </p>
        </div>

        {/* Action Buttons for Department Console */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Phase 5: Export Official PDF Roster */}
          <button
            id="dept-export-pdf-roster-btn"
            onClick={() => setIsFieldRosterOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-xs font-bold text-white bg-linear-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 transition-all shadow-xs cursor-pointer"
            title="Generate official Indian Railways Field Maintenance Roster (PDF)"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-200" />
            <span>Export Official PDF Roster</span>
          </button>

          {/* Phase 5: Export Schedule CSV/Excel */}
          <button
            id="dept-export-csv-btn"
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
            title="Download CSV / Excel file of current department demands"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export Schedule (CSV)</span>
            <span className="sm:hidden">CSV</span>
          </button>

          {/* Action Button to Switch to Submit Form */}
          <button
            id="btn-toggle-new-request"
            onClick={() => setActiveTab('FORM')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-md text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 cursor-pointer ${
              activeTab === 'FORM'
                ? 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200'
                : 'bg-[#F97316] text-white hover:bg-orange-600 active:bg-orange-700 focus:ring-orange-400'
            }`}
          >
            {activeTab === 'FORM' ? (
              <>
                <FileText className="w-4 h-4 text-slate-600" />
                <span>View My Department Demands</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-white" />
                <span>Submit New Block Request</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Strict Security Rules Banner (Zero Approval Rights & Department Isolation) */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 flex items-start space-x-3 text-xs text-amber-900">
        <Lock className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
        <div className="leading-relaxed">
          <strong className="font-semibold text-amber-950">
            Railway Board Operational Directives Enforced:
          </strong>{' '}
          Your portal is isolated to <strong>{deptConfig.name}</strong> block demands only. In strict accordance with
          Indian Railways safety rules, <em>department officers have ZERO approval or modification rights</em>. You may
          submit new demands and observe pending, approved, or rejected statuses.
        </div>
      </div>

      {/* Department Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Department Demands
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Filed under {deptConfig.code}</div>
        </div>

        <div className="bg-white rounded-lg border border-amber-200/80 p-4 shadow-xs bg-amber-50/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Pending Control Review</span>
          </div>
          <div className="text-2xl font-black text-amber-800 mt-1">{stats.pending}</div>
          <div className="text-[11px] text-amber-700/80 mt-0.5">Awaiting Section Controller</div>
        </div>

        <div className="bg-white rounded-lg border border-emerald-200/80 p-4 shadow-xs bg-emerald-50/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Sanctioned / Approved</span>
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-1">{stats.approved}</div>
          <div className="text-[11px] text-emerald-700/80 mt-0.5">Corridor Window Granted</div>
        </div>

        <div className="bg-white rounded-lg border border-red-200/80 p-4 shadow-xs bg-red-50/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-red-700 flex items-center space-x-1">
            <XCircle className="w-3 h-3" />
            <span>Regret / Rejected</span>
          </div>
          <div className="text-2xl font-black text-red-800 mt-1">{stats.rejected}</div>
          <div className="text-[11px] text-red-700/80 mt-0.5">Traffic Conflict Precedence</div>
        </div>
      </div>

      {/* Primary Navigation Tabs (Phase 2 Requirement): "My Department Demands" vs "Submit New Block Request" */}
      <div className="flex border-b border-slate-300 space-x-2 overflow-x-auto whitespace-nowrap pb-px scrollbar-none">
        <button
          id="tab-my-department-demands"
          onClick={() => setActiveTab('TABLE')}
          className={`py-2.5 sm:py-3 px-3.5 sm:px-5 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeTab === 'TABLE'
              ? 'border-[#000075] text-[#000075] bg-white rounded-t-md shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 bg-slate-100/60 rounded-t-md'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Department Demands</span>
          <span
            className={`ml-1 text-[10px] px-2 py-0.2 rounded-full font-bold ${
              activeTab === 'TABLE' ? 'bg-[#000075] text-white' : 'bg-slate-300 text-slate-700'
            }`}
          >
            {isolatedRequests.length}
          </span>
        </button>

        <button
          id="tab-submit-new-block-request"
          onClick={() => setActiveTab('FORM')}
          className={`py-2.5 sm:py-3 px-3.5 sm:px-5 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeTab === 'FORM'
              ? 'border-[#F97316] text-[#F97316] bg-white rounded-t-md shadow-xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 bg-slate-100/60 rounded-t-md'
          }`}
        >
          <Plus className="w-4 h-4 text-[#F97316]" />
          <span>Submit New Block Request</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 uppercase font-semibold">
            Form
          </span>
        </button>
      </div>

      {/* Recent Submission Success Banner */}
      {latestSubmittedId && activeTab === 'TABLE' && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg flex items-start justify-between text-emerald-900 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-emerald-950 text-sm">
                Block Request Submitted Successfully!
              </h3>
              <p className="mt-0.5 text-slate-700">
                Tracking ID:{' '}
                <strong className="font-mono text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 text-xs">
                  {latestSubmittedId}
                </strong>{' '}
                has been logged with status <strong>Pending</strong> under {deptConfig.name}. The demand is now
                forwarded to the Section Controller desk for train path clearance.
              </p>
            </div>
          </div>
          <button
            onClick={() => setLatestSubmittedId(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold p-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* CONDITIONAL RENDERING: FORM OR TABLE */}
      {activeTab === 'FORM' ? (
        /* Phase 2: Prominent Department Request Form */
        <div ref={requestFormRef}>
          <DepartmentBlockRequestForm
            currentUser={currentUser}
            onSubmitSuccess={handleFormSuccess}
            onCancel={() => setActiveTab('TABLE')}
          />
        </div>
      ) : (
        /* Phase 2: Updated Requests Table View ("My Department Demands") */
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Search and Filters Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${deptConfig.code} demands by ID, section, type...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
              <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                <span className="text-slate-400 font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="MODIFIED_APPROVED">Modified & Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                <span className="text-slate-400 font-medium">Urgency:</span>
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                >
                  <option value="ALL">All Urgencies</option>
                  <option value="Routine">Routine</option>
                  <option value="Priority">Priority</option>
                  <option value="Critical Emergency">Critical Emergency</option>
                </select>
              </div>

              <div className="h-4 w-px bg-slate-300 mx-0.5 hidden sm:block" />

              {/* Table Quick Export CSV */}
              <button
                onClick={handleExportCsv}
                className="flex items-center space-x-1 px-2 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors cursor-pointer"
                title="Export currently filtered table rows to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV ({filteredRequests.length})</span>
              </button>

              {/* Table Quick PDF Roster */}
              <button
                onClick={() => setIsFieldRosterOpen(true)}
                className="flex items-center space-x-1 px-2 py-1 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                title="View and print official PDF Maintenance Roster"
              >
                <Printer className="w-3.5 h-3.5 text-blue-700" />
                <span>PDF Roster</span>
              </button>
            </div>
          </div>

          {/* Updated Requests Table View with Exact Phase 2 Required Columns:
              Request ID, Section, Block Type, Date & Duration, Urgency Badge, Status Badge */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Block Type</th>
                  <th className="py-3 px-4">Date & Duration</th>
                  <th className="py-3 px-4">Urgency Badge</th>
                  <th className="py-3 px-4">Status Badge</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((req) => {
                    const urgency = getUrgencyDisplay(req);
                    const bType = getBlockTypeDisplay(req);
                    const durationText = req.durationFormatted || `${Math.floor(req.durationMinutes / 60)}h ${req.durationMinutes % 60}m`;

                    return (
                      <tr
                        key={req.id}
                        id={`req-row-${req.id}`}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        {/* 1. Request ID */}
                        <td className="py-3 px-4 font-mono font-bold text-blue-900 whitespace-nowrap">
                          {req.id}
                          <span className="block text-[10px] text-slate-400 font-sans font-normal">
                            Filed: {req.submittedAt}
                          </span>
                        </td>

                        {/* 2. Section */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-semibold text-slate-900">{req.section}</div>
                          <div className="text-[11px] text-slate-500">
                            {req.stationFrom} ➔ {req.stationTo} {req.startKm && req.endKm ? `(${req.startKm} - ${req.endKm})` : ''}
                          </div>
                        </td>

                        {/* 3. Block Type */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-medium text-[11px]">
                            {bType}
                          </span>
                        </td>

                        {/* 4. Date & Duration */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-medium text-slate-800">{req.requestedDate}</div>
                          <div className="font-mono text-slate-600 text-[11px]">
                            {req.requestedStartTime} - {req.requestedEndTime} ({durationText})
                          </div>
                          {req.approvedStartTime && (
                            <div className="font-mono text-emerald-700 text-[10px] font-bold">
                              Granted: {req.approvedStartTime} - {req.approvedEndTime}
                            </div>
                          )}
                        </td>

                        {/* 5. Urgency Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">{renderUrgencyBadge(urgency)}</td>

                        {/* 6. Status Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {renderStatusBadge(req.status)}
                          {req.aiOptimized && (
                            <span
                              className="inline-flex items-center text-[10px] font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded mt-0.5"
                              title="Coordinated corridor block window optimized via AI Solver"
                            >
                              <Sparkles className="w-2.5 h-2.5 mr-1 text-amber-500" />
                              {req.aiBundleId || 'AI Bundled'}
                            </span>
                          )}
                          {req.status === 'REJECTED' && req.controllerRemarks && (
                            <span
                              className="block text-[10px] text-red-600 max-w-[150px] truncate font-medium mt-0.5"
                              title={`Rejection Reason: ${req.controllerRemarks}`}
                            >
                              Reason: {req.controllerRemarks}
                            </span>
                          )}
                          {req.status === 'MODIFIED_APPROVED' && (
                            <span className="block text-[10px] text-blue-800 font-semibold mt-0.5">
                              Modified by Control
                            </span>
                          )}
                        </td>

                        {/* 7. Action: Strict Department Officer Rules - CANNOT approve or reject! Can View Memo or Close Block (Safety Clearance) */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center space-x-2">
                            {(req.status === 'APPROVED' || req.status === 'MODIFIED_APPROVED') && (
                              <button
                                type="button"
                                onClick={() => onOpenSafetyCheckout(req)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded transition-colors cursor-pointer shadow-2xs"
                                title="Site Engineer Safety Clearance & Line Open Checkout"
                              >
                                <HardHat className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Close Block</span>
                              </button>
                            )}

                            {req.status === 'COMPLETED' && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded">
                                <ShieldCheck className="w-3 h-3 text-teal-600" />
                                <span>Line Clear</span>
                              </span>
                            )}

                            <button
                              onClick={() => onViewRequestDetail(req)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-[#000075] bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                              title="View Requisition Memo"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Memo</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500 text-xs">
                      <Info className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                      No demands found matching the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-slate-500 text-[11px] flex items-center justify-between">
            <span>
              Showing <strong>{filteredRequests.length}</strong> of {isolatedRequests.length} demands filed under{' '}
              {deptConfig.code} head.
            </span>
            <span className="italic text-slate-400">
              Department Officers have zero approval/modification authority.
            </span>
          </div>
        </div>
      )}

      {/* MODAL: Official Field Execution Roster (Printable PDF & Excel) */}
      <FieldRosterModal
        isOpen={isFieldRosterOpen}
        onClose={() => setIsFieldRosterOpen(false)}
        requests={isolatedRequests}
        currentUser={currentUser}
      />
    </div>
  );
};
