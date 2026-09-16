import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  SlidersHorizontal,
  Eye,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Filter,
  Check,
  X,
  Layers,
  MapPin,
  Calendar,
  Zap,
  Info,
  Cpu,
  Printer,
  FileSpreadsheet,
  Download,
  HardHat,
  Trash2
} from 'lucide-react';
import { DEPARTMENT_CONFIG, detectShadowBlockOpportunities, RAILWAY_SECTIONS } from '../data/mockData';
import { BlockPriority, BlockRequest, BlockStatus, Department, User, RailwayZoneCode } from '../types';
import { AdminApproveModal } from './AdminApproveModal';
import { AdminRejectModal } from './AdminRejectModal';
import { AdminModifyModal } from './AdminModifyModal';
import { AiOptimizerModal } from './AiOptimizerModal';
import { FieldRosterModal } from './FieldRosterModal';
import { AiCoPilotModal } from './AiCoPilotModal';
import { calculateTrainImpact } from './TrainImpactWidget';
import { exportRequestsToCsv } from '../utils/exportUtils';
import { MLPredictionResult, predictRiskScore } from '../services/mlService';
import { GeminiChatPanel } from './GeminiChatPanel';

interface AdminDashboardProps {
  currentUser: User;
  allRequests: BlockRequest[];
  onOpenActionModal?: (req: BlockRequest) => void;
  onViewRequestDetail: (req: BlockRequest) => void;
  onResetData: () => void;
  onClearAllRequests: () => void;
  onAdminAction: (updatedReq: BlockRequest) => void;
  onApplyAiSchedule?: (updatedRequests: BlockRequest[]) => void;
  onOpenSafetyCheckout?: (req: BlockRequest) => void;
  activeZone?: RailwayZoneCode;
}

// Conflict info interface
export interface ConflictInfo {
  conflictingWith: BlockRequest[];
  summary: string;
}

const deduplicateRequests = (requests: BlockRequest[]): BlockRequest[] => {
  const byId = new Map<string, BlockRequest>();
  requests.forEach((request) => {
    if (!byId.has(request.id)) byId.set(request.id, request);
  });
  return Array.from(byId.values());
};

const normalizeDepartment = (department: string): Department => {
  const normalized = department.toUpperCase().replace(/\s+/g, ' ').trim();
  if (normalized === 'S&T' || normalized === 'S & T' || normalized === 'ST') return 'ST';
  if (normalized === 'TRD') return 'TRD';
  return 'ENGINEERING';
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  allRequests,
  onViewRequestDetail,
  onResetData,
  onClearAllRequests,
  onAdminAction,
  onApplyAiSchedule,
  onOpenSafetyCheckout,
  activeZone = 'ALL',
}) => {
  const [selectedDeptTab, setSelectedDeptTab] = useState<'ALL' | Department>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [riskScores, setRiskScores] = useState<Record<string, MLPredictionResult>>({});

  useEffect(() => {
    let isCurrent = true;
    const loadRiskScores = async () => {
      const scoredRequests = await Promise.all(
        allRequests.map(async (request) => {
          const result = await predictRiskScore({
            defect_id: request.id,
            source_system: 'block_requests',
            department: request.department,
            section: request.section,
            severity: request.priority === 'SAFETY_CRITICAL' ? 5 : request.priority === 'URGENT' ? 4 : 2,
            days_overdue: 0,
            asset_age_years: 0,
            past_failure_count: 0,
            deferred_count: request.status === 'PENDING' ? 1 : 0,
          });
          return [request.id, result] as const;
        })
      );
      if (isCurrent) setRiskScores(Object.fromEntries(scoredRequests));
    };

    void loadRiskScores();
    return () => {
      isCurrent = false;
    };
  }, [allRequests]);

  // Modal states for Admin Exclusive Actions
  const [approveTargetReq, setApproveTargetReq] = useState<BlockRequest | null>(null);
  const [rejectTargetReq, setRejectTargetReq] = useState<BlockRequest | null>(null);
  const [modifyTargetReq, setModifyTargetReq] = useState<BlockRequest | null>(null);
  const [aiCoPilotTargetReq, setAiCoPilotTargetReq] = useState<BlockRequest | null>(null);

  // Phase 4: AI CP-SAT Solver Modal state
  const [isAiOptimizerOpen, setIsAiOptimizerOpen] = useState(false);

  // Phase 5: Official Field Roster PDF Modal state
  const [isFieldRosterOpen, setIsFieldRosterOpen] = useState(false);

  // Export filtered requests or approved requests to CSV
  const handleExportCsv = (customList?: BlockRequest[], customName?: string) => {
    const listToExport = customList || filteredRequests;
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = customName || `RAKSHA_BLOCK_Approved_Roster_${dateStr}.csv`;
    exportRequestsToCsv(listToExport, filename);
  };

  // Conflict popover hover/click state
  const [activeConflictTooltipId, setActiveConflictTooltipId] = useState<string | null>(null);

  // Convert time string HH:mm to minutes from midnight
  const timeToMinutes = (t: string): number => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Check if two time intervals overlap (handles crossing midnight)
  const isTimeOverlapping = (sA: string, eA: string, sB: string, eB: string): boolean => {
    const startA = timeToMinutes(sA);
    let endA = timeToMinutes(eA);
    if (endA <= startA) endA += 24 * 60;

    const startB = timeToMinutes(sB);
    let endB = timeToMinutes(eB);
    if (endB <= startB) endB += 24 * 60;

    return Math.max(startA, startB) < Math.min(endA, endB);
  };

  // Normalize section string to compare sections
  const normalizeSection = (sec: string): string => {
    return (sec || '')
      .toLowerCase()
      .replace(/section/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  // REQUIREMENT 3: Conflict & Overlap Calculation:
  // If two or more pending requests share the same Railway Section and overlapping date/time window,
  // record them in conflictMap.
  const conflictMap = useMemo(() => {
    const map = new Map<string, ConflictInfo>();
    const pendingList = allRequests.filter((r) => r.status === 'PENDING');

    for (let i = 0; i < pendingList.length; i++) {
      for (let j = i + 1; j < pendingList.length; j++) {
        const a = pendingList[i];
        const b = pendingList[j];

        // 1. Same requested date
        if (a.requestedDate !== b.requestedDate) continue;

        // 2. Same or overlapping Railway Section
        const normA = normalizeSection(a.section);
        const normB = normalizeSection(b.section);
        const isSameSection =
          normA === normB ||
          normA.includes(normB) ||
          normB.includes(normA) ||
          (a.stationFrom &&
            b.stationFrom &&
            a.stationFrom.toLowerCase().trim() === b.stationFrom.toLowerCase().trim() &&
            a.stationTo.toLowerCase().trim() === b.stationTo.toLowerCase().trim());

        if (isSameSection) {
          // 3. Overlapping time window
          if (isTimeOverlapping(a.requestedStartTime, a.requestedEndTime, b.requestedStartTime, b.requestedEndTime)) {
            if (!map.has(a.id)) {
              map.set(a.id, { conflictingWith: [], summary: '' });
            }
            if (!map.has(b.id)) {
              map.set(b.id, { conflictingWith: [], summary: '' });
            }

            map.get(a.id)!.conflictingWith.push(b);
            map.get(b.id)!.conflictingWith.push(a);
          }
        }
      }
    }

    // Set readable summaries
    map.forEach((val) => {
      val.summary = val.conflictingWith
        .map((c) => `${c.id} (${c.department}, ${c.requestedStartTime}-${c.requestedEndTime})`)
        .join(', ');
    });

    return map;
  }, [allRequests]);

  // Unique sections list for the section filter dropdown
  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    allRequests.forEach((r) => {
      if (r.section) set.add(r.section.trim());
    });
    return Array.from(set).sort();
  }, [allRequests]);

  // AI Shadow Block Opportunities for integrated corridors
  const shadowOpportunities = useMemo(() => {
    return detectShadowBlockOpportunities(allRequests);
  }, [allRequests]);

  // Filtered requests based on all controls
  const filteredRequests = useMemo(() => {
    return deduplicateRequests(allRequests).filter((req) => {
      // 0. Zone filter
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

      // 1. Department filter
      const matchesDept = selectedDeptTab === 'ALL' || normalizeDepartment(req.department) === selectedDeptTab;

      // 2. Status filter
      let matchesStatus = true;
      if (statusFilter === 'PENDING') matchesStatus = req.status === 'PENDING';
      else if (statusFilter === 'APPROVED') matchesStatus = req.status === 'APPROVED';
      else if (statusFilter === 'MODIFIED') matchesStatus = req.status === 'MODIFIED_APPROVED';
      else if (statusFilter === 'REJECTED') matchesStatus = req.status === 'REJECTED';
      else if (statusFilter === 'COMPLETED') matchesStatus = req.status === 'COMPLETED';
      else if (statusFilter !== 'ALL') matchesStatus = req.status === statusFilter;

      // 3. Section/Line filter
      const matchesSection =
        sectionFilter === 'ALL' ||
        req.section.toLowerCase().includes(sectionFilter.toLowerCase()) ||
        req.lineType.toLowerCase().includes(sectionFilter.toLowerCase());

      // 4. Conflicts only toggle
      const matchesConflicts = !showConflictsOnly || conflictMap.has(req.id);

      // 5. Search text query
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        req.id.toLowerCase().includes(query) ||
        req.section.toLowerCase().includes(query) ||
        req.workDescription.toLowerCase().includes(query) ||
        (req.blockType && req.blockType.toLowerCase().includes(query)) ||
        req.workCategory.toLowerCase().includes(query) ||
        req.applicantName.toLowerCase().includes(query) ||
        req.startKm.toLowerCase().includes(query) ||
        req.endKm.toLowerCase().includes(query) ||
        req.lineType.toLowerCase().includes(query);

      return matchesDept && matchesStatus && matchesSection && matchesConflicts && matchesSearch;
    });
  }, [allRequests, activeZone, selectedDeptTab, statusFilter, sectionFilter, showConflictsOnly, searchTerm, conflictMap]);

  const zoneScopedRequests = useMemo(() => {
    if (!activeZone || activeZone === 'ALL') return allRequests;
    return allRequests.filter((req) => {
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
      return reqZone === activeZone;
    });
  }, [allRequests, activeZone]);

  // REQUIREMENT 1: Executive Summary Cards (Top Row)
  const stats = useMemo(() => {
    const totalPending = zoneScopedRequests.filter((r) => r.status === 'PENDING').length;

    const approvedToday = zoneScopedRequests.filter(
      (r) => r.status === 'APPROVED' || r.status === 'MODIFIED_APPROVED'
    ).length;

    const highUrgencyCritical = zoneScopedRequests.filter(
      (r) =>
        r.urgencyLevel === 'Critical Emergency' ||
        r.priority === 'SAFETY_CRITICAL' ||
        r.priority === 'URGENT'
    ).length;

    const totalConflicts = conflictMap.size;

    let totalPendingPassengerDelay = 0;
    let totalPendingFreightDelay = 0;
    zoneScopedRequests
      .filter((r) => r.status === 'PENDING')
      .forEach((r) => {
        const imp = calculateTrainImpact(r.durationMinutes, r.section);
        totalPendingPassengerDelay += imp.passengerDelayMinutes;
        totalPendingFreightDelay += imp.freightDelayMinutes;
      });

    return {
      totalPending,
      approvedToday,
      highUrgencyCritical,
      totalConflicts,
      totalPendingPassengerDelay,
      totalPendingFreightDelay,
    };
  }, [zoneScopedRequests, conflictMap]);

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
            Modified
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <ShieldCheck className="w-3 h-3 mr-1 text-slate-500" />
            Closed / Completed
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

  const getDeptBadge = (dept: Department) => {
    const config = DEPARTMENT_CONFIG[dept];
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${config.badgeBg} ${config.badgeText} ${config.borderColor}`}
      >
        {config.code}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Section Controller Authority Highlight */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-[#000075] text-amber-300 border border-blue-900">
              MAIN CONTROL ADMINISTRATOR
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Delhi Division (DLI) • Operating Control Desk
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center space-x-2">
            <span>Central Maintenance Demand Management & Approval Workflow</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Logged in as <strong>{currentUser.name}</strong> ({currentUser.designation}) • Real-Time Cross-Department
            Master Sync
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Phase 5: Prominent Export Official PDF Roster Button */}
          <button
            id="export-pdf-roster-btn"
            onClick={() => setIsFieldRosterOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-linear-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 rounded-lg shadow-sm hover:shadow-md border border-emerald-900 transition-all transform active:scale-98 cursor-pointer"
            title="Generate print-ready official Indian Railways Field Maintenance Roster (PDF)"
          >
            <Printer className="w-4 h-4 text-emerald-200" />
            <span>Export Official PDF Roster</span>
          </button>

          {/* Phase 5: Export Schedule CSV/Excel Button */}
          <button
            id="export-schedule-csv-btn"
            onClick={() => handleExportCsv()}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors shadow-xs cursor-pointer"
            title="Download CSV / Excel schedule of filtered demands"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export Schedule (CSV/Excel)</span>
            <span className="sm:hidden">Export CSV</span>
          </button>

          {/* Phase 4: Prominent Run AI Block Optimizer Button */}
          <button
            id="run-ai-optimizer-btn"
            onClick={() => setIsAiOptimizerOpen(true)}
            className="flex items-center space-x-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white bg-linear-to-r from-blue-700 via-[#000075] to-indigo-900 hover:from-blue-800 hover:to-indigo-950 rounded-lg shadow-md hover:shadow-lg border border-blue-950 transition-all transform active:scale-98 ring-2 ring-amber-400/70 cursor-pointer"
            title="Execute Google OR-Tools CP-SAT Constraint Optimization & Task Bundling Engine"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Run AI Auto-Planner (CP-SAT)</span>
            <span className="hidden lg:inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-amber-400 text-blue-950 font-black tracking-wider">
              SOLVER
            </span>
          </button>
        </div>
      </div>

      {/* REQUIREMENT 1: Executive Summary Cards (Top Row) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pending Demands */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING');
            setShowConflictsOnly(false);
          }}
          className={`bg-white rounded-lg border p-4 shadow-xs transition-all cursor-pointer ${
            statusFilter === 'PENDING'
              ? 'border-amber-500 ring-2 ring-amber-300 bg-amber-50/40'
              : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Total Pending Demands</span>
            </div>
            <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-semibold">
              Action Needed
            </span>
          </div>
          <div className="text-3xl font-black text-amber-950 mt-2">{stats.totalPending}</div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting train path clearance</div>
        </div>

        {/* Card 2: Approved Blocks Today */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED');
            setShowConflictsOnly(false);
          }}
          className={`bg-white rounded-lg border p-4 shadow-xs transition-all cursor-pointer ${
            statusFilter === 'APPROVED'
              ? 'border-emerald-500 ring-2 ring-emerald-300 bg-emerald-50/40'
              : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Approved Blocks Today</span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded font-semibold">
              Sanctioned
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-950 mt-2">{stats.approvedToday}</div>
          <div className="text-[11px] text-slate-500 mt-1">Full & Modified Corridors Granted</div>
        </div>

        {/* Card 3: High Urgency/Critical Requests */}
        <div
          onClick={() => {
            setSearchTerm(searchTerm === 'Critical' ? '' : 'Critical');
          }}
          className="bg-white rounded-lg border border-red-200 hover:border-red-300 p-4 shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-red-800 flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>High Urgency / Critical</span>
            </div>
            <span className="text-[10px] bg-red-100 text-red-900 px-1.5 py-0.2 rounded font-semibold">
              Priority
            </span>
          </div>
          <div className="text-3xl font-black text-red-950 mt-2">{stats.highUrgencyCritical}</div>
          <div className="text-[11px] text-slate-500 mt-1">Safety Critical or Urgent Demands</div>
        </div>

        {/* Card 4: Overlapping/Conflict Alerts Counter */}
        <div
          onClick={() => setShowConflictsOnly(!showConflictsOnly)}
          className={`bg-white rounded-lg border p-4 shadow-xs transition-all cursor-pointer ${
            showConflictsOnly
              ? 'border-orange-500 ring-2 ring-orange-300 bg-orange-50/40'
              : 'border-orange-200 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-orange-800 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-orange-600" />
              <span>Conflict & Overlap Alerts</span>
            </div>
            <span className="text-[10px] bg-orange-100 text-orange-900 px-1.5 py-0.2 rounded font-semibold">
              {showConflictsOnly ? 'Filter Active' : 'Click to Filter'}
            </span>
          </div>
          <div className="text-3xl font-black text-orange-950 mt-2">{stats.totalConflicts}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Simultaneous demands on same section/time
          </div>
        </div>
      </div>

      {/* AI Co-Pilot Train Movement Impact Simulation & Recommendation Engine Banner */}
      <div className="p-4 bg-linear-to-r from-[#000075] via-blue-900 to-indigo-950 text-white rounded-lg shadow-md border border-blue-900 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center space-x-1.5">
                <span>Train Movement Impact Simulation & AI Co-Pilot Recommendation Engine</span>
              </h3>
              <span className="text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded bg-amber-400 text-blue-950">
                Admin Exclusive
              </span>
            </div>
            <p className="text-xs text-blue-200 mt-1 max-w-3xl">
              Live corridor modeling evaluates passenger & freight delays (Passenger: 12 mins/hr, Freight: 25 mins/hr). Co-Pilot advises 3 smart mitigations: <strong>Night Shift Reschedule (01:00 - 04:00)</strong>, <strong>TSR Speed Restriction Attachment (Form T/409)</strong>, and <strong>Multi-Department Corridor Bundling</strong>.
            </p>
            <div className="flex items-center space-x-4 mt-2 text-xs font-mono">
              <span className="text-amber-300 flex items-center space-x-1">
                <span className="font-sans text-slate-300 text-[11px]">Active Demand Impact:</span>
                <strong>{stats.totalPendingPassengerDelay}m Passenger Delay</strong>
              </span>
              <span className="text-blue-300">•</span>
              <span className="text-emerald-300 flex items-center space-x-1">
                <strong>{stats.totalPendingFreightDelay}m Freight Detention</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              const pendingReq =
                allRequests.find((r) => r.status === 'PENDING' && (r.priority === 'SAFETY_CRITICAL' || r.priority === 'URGENT')) ||
                allRequests.find((r) => r.status === 'PENDING') ||
                allRequests[0];
              if (pendingReq) setAiCoPilotTargetReq(pendingReq);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-blue-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm transition-colors cursor-pointer"
            title="Open AI Co-Pilot Simulation & Decision Directives"
          >
            <Sparkles className="w-4 h-4 text-blue-950" />
            <span>Open Co-Pilot Engine</span>
          </button>
        </div>
      </div>

      {/* AI CP-SAT Recommendation Banner if Pending Demands Exist */}
      {stats.totalPending > 1 && (
        <div className="p-3.5 bg-linear-to-r from-blue-50 via-indigo-50/50 to-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-[#000075] text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-blue-950">
                  AI Integrated Task Bundling Engine Available
                </span>
                <span className="text-[10px] font-mono font-bold bg-amber-200 text-blue-950 px-1.5 py-0.2 rounded">
                  {stats.totalPending} Pending Demands
                </span>
              </div>
              <p className="text-[11px] text-blue-900/80 mt-0.5">
                Simultaneously cluster Engineering (P-Way), S&T, and TRD corridor blocks into unified windows to eliminate section conflicts and minimize passenger train detention.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAiOptimizerOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded text-xs font-bold text-white bg-[#000075] hover:bg-blue-900 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Launch CP-SAT Engine</span>
          </button>
        </div>
      )}

      {/* Conflict Filter Banner Notification (when active) */}
      {showConflictsOnly && (
        <div className="p-3.5 bg-orange-50 border border-orange-300 rounded-lg flex items-center justify-between text-xs text-orange-900">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <span>
              <strong>Filtered by Section/Time Conflicts:</strong> Showing only the {stats.totalConflicts}{' '}
              pending demands that share overlapping railway sections and time slots.
            </span>
          </div>
          <button
            onClick={() => setShowConflictsOnly(false)}
            className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-orange-100 text-orange-800 rounded border border-orange-300"
          >
            Clear Conflict Filter
          </button>
        </div>
      )}

      {/* REQUIREMENT 2: Centralized Demand Management Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {/* Department Switcher Tabs (All, Engineering, S&T, TRD) */}
        <div className="border-b border-slate-200 bg-slate-50 flex items-center justify-between px-3 sm:px-4 pt-2 overflow-x-auto whitespace-nowrap scrollbar-none">
          <div className="flex space-x-1 shrink-0">
            <button
              onClick={() => setSelectedDeptTab('ALL')}
              className={`py-2 px-3 sm:px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                selectedDeptTab === 'ALL'
                  ? 'border-[#000075] text-[#000075] bg-white rounded-t'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              All Departments
            </button>
            <button
              onClick={() => setSelectedDeptTab('ENGINEERING')}
              className={`py-2 px-3 sm:px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                selectedDeptTab === 'ENGINEERING'
                  ? 'border-blue-700 text-blue-900 bg-white rounded-t'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Engineering / P-Way
            </button>
            <button
              onClick={() => setSelectedDeptTab('ST')}
              className={`py-2 px-3 sm:px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                selectedDeptTab === 'ST'
                  ? 'border-emerald-700 text-emerald-900 bg-white rounded-t'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              S&T / Signalling
            </button>
            <button
              onClick={() => setSelectedDeptTab('TRD')}
              className={`py-2 px-3 sm:px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                selectedDeptTab === 'TRD'
                  ? 'border-amber-700 text-amber-900 bg-white rounded-t'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              TRD / 25kV OHE
            </button>
          </div>

          <div className="py-2 text-[11px] text-slate-500 hidden xl:flex items-center space-x-2 shrink-0">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Central Dispatch Register</span>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, Officer, Section, KM, Work..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-[#000075] focus:border-[#000075]"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            {/* Filter by Status */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
              <span className="text-slate-400 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-xs bg-white font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="MODIFIED">Modified</option>
                <option value="REJECTED">Rejected</option>
                <option value="COMPLETED">Closed / Completed</option>
              </select>
            </div>

            {/* Filter by Section/Line */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
              <span className="text-slate-400 font-medium">Section / Line:</span>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-xs bg-white max-w-[200px] truncate"
              >
                <option value="ALL">All Sections</option>
                {uniqueSections.map((sec, idx) => (
                  <option key={idx} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters Quick Button */}
            {(statusFilter !== 'ALL' ||
              sectionFilter !== 'ALL' ||
              searchTerm !== '' ||
              showConflictsOnly ||
              selectedDeptTab !== 'ALL') && (
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setSectionFilter('ALL');
                  setSearchTerm('');
                  setShowConflictsOnly(false);
                  setSelectedDeptTab('ALL');
                }}
                className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                Clear Filters
              </button>
            )}

            <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block" />

            {/* Quick Export Table CSV Button */}
            <button
              onClick={() => handleExportCsv(filteredRequests, `RAKSHA_BLOCK_Filtered_Demands_${new Date().toISOString().slice(0,10)}.csv`)}
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
              title={`Download CSV/Excel of ${filteredRequests.length} currently filtered records`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV ({filteredRequests.length})</span>
            </button>

            {/* Quick PDF Roster Button */}
            <button
              onClick={() => setIsFieldRosterOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer shadow-2xs"
              title="Open print-ready official PDF Field Roster"
            >
              <Printer className="w-3.5 h-3.5 text-blue-700" />
              <span>PDF Roster</span>
            </button>

            <GeminiChatPanel currentUser={currentUser} />

            {currentUser.role === 'SECTION_CONTROLLER' && (
              <button
                onClick={onClearAllRequests}
                className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-red-800 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors cursor-pointer shadow-2xs"
                title="Permanently delete all block requests"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-700" />
                <span>Clear All Requests</span>
              </button>
            )}
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Request ID & Dept</th>
                <th className="py-3 px-4">Section / Stretch</th>
                <th className="py-3 px-4">Line & KM Post</th>
                <th className="py-3 px-4">Block Type & Scope</th>
                <th className="py-3 px-4">Date & Time Window</th>
                <th className="py-3 px-4">Conflict Alert</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center min-w-[260px]">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRequests.length > 0 ? (
                filteredRequests
                  .filter((req) => selectedDeptTab === 'ALL' || normalizeDepartment(req.department) === selectedDeptTab)
                  .map((req) => {
                  const conflict = conflictMap.get(req.id);
                  const isConflictOpen = activeConflictTooltipId === req.id;

                  return (
                    <tr
                      key={req.id}
                      id={`req-row-${req.id}`}
                      className={`hover:bg-slate-50 transition-colors ${
                        conflict ? 'bg-orange-50/20' : ''
                      }`}
                    >
                      {/* 1. Request ID & Dept */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-blue-900">{req.id}</span>
                          {getDeptBadge(req.department)}
                        </div>
                        {riskScores[req.id] ? (
                          <span
                            className={`mt-1 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                              riskScores[req.id].risk_tier === 'CRITICAL'
                                ? 'border-red-300 bg-red-50 text-red-800'
                                : riskScores[req.id].risk_tier === 'HIGH'
                                ? 'border-orange-300 bg-orange-50 text-orange-800'
                                : riskScores[req.id].risk_tier === 'MEDIUM'
                                ? 'border-amber-300 bg-amber-50 text-amber-800'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            }`}
                            title={`LightGBM risk tier: ${riskScores[req.id].risk_tier}`}
                          >
                            ML Risk {riskScores[req.id].predicted_risk_score.toFixed(1)} · {riskScores[req.id].risk_tier}
                          </span>
                        ) : (
                          <span className="mt-1 block text-[10px] text-slate-400">ML Risk loading...</span>
                        )}
                        <span className="text-[10px] text-slate-500 block font-normal">
                          By: {req.applicantName.split(' ')[0]} {req.applicantName.split(' ')[1] || ''} (
                          {req.applicantDesignation.split('(')[0]})
                        </span>
                      </td>

                      {/* 2. Section */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900">{req.section}</div>
                        <div className="text-[11px] text-slate-500">
                          {req.stationFrom} ➔ {req.stationTo}
                        </div>
                      </td>

                      {/* 3. Line & KM Post */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[11px]">
                          {req.lineType}
                        </span>
                        <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                          {req.startKm} - {req.endKm}
                        </div>
                      </td>

                      {/* 4. Block Type & Scope */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-900 truncate">
                          {req.blockType || req.workCategory}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{req.workDescription}</div>
                        {req.machineryDeployed && req.machineryDeployed.length > 0 && (
                          <div className="text-[10px] text-blue-800 truncate mt-0.5 font-medium">
                            Plant: {req.machineryDeployed.join(', ')}
                          </div>
                        )}
                      </td>

                      {/* 5. Date & Time Window */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{req.requestedDate}</div>
                        <div className="font-mono text-slate-700 text-[11px]">
                          {req.requestedStartTime} - {req.requestedEndTime} ({req.durationMinutes}m)
                        </div>
                        {req.approvedStartTime && (
                          <div className="font-mono text-emerald-700 text-[10px] font-bold">
                            Granted: {req.approvedStartTime} - {req.approvedEndTime}
                          </div>
                        )}
                        {/* Live IRCTC Train Impact Simulation Tag */}
                        {(() => {
                          const effDuration = req.approvedDurationMinutes || req.durationMinutes;
                          const impact = calculateTrainImpact(effDuration, req.section);
                          return (
                            <div className="mt-1">
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#000075] text-white shadow-2xs whitespace-nowrap border border-blue-900"
                                title={`Live Movement Impact: ~${impact.passengerDelayMinutes}m passenger detention and ~${impact.freightDelayMinutes}m freight detention.`}
                              >
                                <span className="mr-1">🚆</span>
                                <span className="text-amber-300 font-mono">{impact.passengerDelayMinutes}m P</span>
                                <span className="mx-1 text-blue-300">|</span>
                                <span className="text-emerald-300 font-mono">{impact.freightDelayMinutes}m F</span>
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* 6. REQUIREMENT 3: Conflict & Overlap Warning Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {conflict ? (
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveConflictTooltipId(isConflictOpen ? null : req.id)
                              }
                              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer"
                              title="Click to inspect overlapping blocks"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-700 flex-shrink-0 animate-bounce" />
                              <span>Attention: Time & Section Overlap</span>
                            </button>

                            {/* Detailed Conflict Popover */}
                            {isConflictOpen && (
                              <div className="absolute left-0 top-7 z-30 w-72 bg-white border border-amber-300 rounded-lg shadow-xl p-3 text-xs text-slate-700 animate-in fade-in duration-150">
                                <div className="flex items-center justify-between border-b border-amber-200 pb-1.5 mb-1.5">
                                  <span className="font-bold text-amber-950 flex items-center space-x-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Section & Slot Conflict</span>
                                  </span>
                                  <button
                                    onClick={() => setActiveConflictTooltipId(null)}
                                    className="text-slate-400 hover:text-slate-700 p-0.5"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                                <p className="text-[11px] text-slate-600 mb-2">
                                  This requisition overlaps with{' '}
                                  <strong>{conflict.conflictingWith.length} other demand(s)</strong> on{' '}
                                  <strong>{req.section}</strong> on <strong>{req.requestedDate}</strong>:
                                </p>
                                <div className="space-y-1.5">
                                  {conflict.conflictingWith.map((cReq) => (
                                    <div
                                      key={cReq.id}
                                      className="p-1.5 bg-amber-50/70 border border-amber-200 rounded text-[11px]"
                                    >
                                      <div className="font-bold text-blue-950 flex items-center justify-between">
                                        <span>{cReq.id}</span>
                                        <span className="font-mono text-amber-900">
                                          {cReq.requestedStartTime} - {cReq.requestedEndTime}
                                        </span>
                                      </div>
                                      <div className="text-slate-600">
                                        Dept: {cReq.department} • {cReq.workCategory}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-2 text-[10px] text-amber-800 bg-amber-50 p-1 rounded font-medium text-center">
                                  Tip: Use "Modify & Approve" to stagger or coordinate as Mega Block.
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">No Conflict</span>
                        )}
                      </td>

                      {/* 7. Status Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderStatusBadge(req.status)}
                        {req.aiOptimized && (
                          <span
                            className="inline-flex items-center text-[10px] font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded mt-0.5"
                            title="Bundled via CP-SAT Solver into synchronized corridor window"
                          >
                            <Sparkles className="w-2.5 h-2.5 mr-1 text-amber-500" />
                            {req.aiBundleId || 'AI Bundled'}
                          </span>
                        )}
                        {req.status === 'REJECTED' && req.controllerRemarks && (
                          <span
                            className="block text-[10px] text-red-600 max-w-[140px] truncate"
                            title={`Rejection Reason: ${req.controllerRemarks}`}
                          >
                            Reason: {req.controllerRemarks}
                          </span>
                        )}
                      </td>

                      {/* 8. REQUIREMENT 4: Action Controls (Admin Exclusive) */}
                      {/* For every request row, provide 3 explicit action buttons: APPROVE, REJECT, MODIFY & APPROVE */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1.5">
                            {req.status === 'COMPLETED' ? (
                              <span className="inline-flex items-center rounded border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500" title={req.closedAt ? `Closed at ${new Date(req.closedAt).toLocaleString()}` : 'Block closed'}>
                                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                                Closed
                              </span>
                            ) : (
                              <>
                          {/* 1. APPROVE Button (Green) */}
                          <button
                            type="button"
                            onClick={() => setApproveTargetReq(req)}
                            id={`btn-approve-${req.id}`}
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold rounded transition-colors shadow-xs cursor-pointer ${
                              req.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
                            }`}
                            title={
                              req.status === 'APPROVED'
                                ? 'Already Sanctioned'
                                : 'Sanction corridor block as requested'
                            }
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{req.status === 'APPROVED' ? 'Approved' : 'Approve'}</span>
                          </button>

                          {/* AI Co-Pilot Recommendation Engine Button */}
                          <button
                            type="button"
                            onClick={() => setAiCoPilotTargetReq(req)}
                            id={`btn-copilot-${req.id}`}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 rounded transition-colors shadow-xs cursor-pointer"
                            title="Open AI Co-Pilot Live Simulation & 3 Actionable Recommendations (Night Shift, TSR, Bundling)"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>AI Co-Pilot</span>
                          </button>

                          {/* 2. MODIFY & APPROVE Button (Amber/Orange) */}
                          <button
                            type="button"
                            onClick={() => setModifyTargetReq(req)}
                            id={`btn-modify-${req.id}`}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded transition-colors shadow-xs cursor-pointer"
                            title="Adjust start time, end time, or duration before approving"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Modify & Approve</span>
                          </button>

                          {/* 3. REJECT Button (Red) */}
                          <button
                            type="button"
                            onClick={() => setRejectTargetReq(req)}
                            id={`btn-reject-${req.id}`}
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold rounded transition-colors shadow-xs cursor-pointer ${
                              req.status === 'REJECTED'
                                ? 'bg-red-100 text-red-800 border border-red-300 cursor-default'
                                : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'
                            }`}
                            title="Deny requisition with operational reason"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{req.status === 'REJECTED' ? 'Rejected' : 'Reject'}</span>
                          </button>

                          {/* Close Block / Safety Clearance Button (for Active/Approved blocks) */}
                          {(req.status === 'APPROVED' || req.status === 'MODIFIED_APPROVED') && onOpenSafetyCheckout && (
                            <button
                              type="button"
                              onClick={() => onOpenSafetyCheckout(req)}
                              id={`btn-close-block-${req.id}`}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded transition-colors shadow-xs cursor-pointer"
                              title="Site Engineer Safety Checkout & Line Open Clearance"
                            >
                              <HardHat className="w-3.5 h-3.5 text-amber-300" />
                              <span>Close Block</span>
                            </button>
                          )}

                          {/* View Memo Button */}
                          <button
                            type="button"
                            onClick={() => onViewRequestDetail(req)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors"
                            title="Inspect Official Block Memo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="font-semibold text-slate-700">No block requisitions match the selected filters.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Try selecting "All Departments" or clearing search/status filters.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary Counter */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-slate-500 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Displaying <strong>{filteredRequests.length}</strong> of <strong>{allRequests.length}</strong> block
            requisitions across Engineering (P-Way), S&T, and TRD.
          </span>
          <div className="flex items-center space-x-3 text-slate-600">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Approved: {stats.approvedToday}</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Pending: {stats.totalPending}</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span>Conflicts: {stats.totalConflicts}</span>
            </span>
          </div>
        </div>
      </div>

      {/* MODAL 1: Admin Approve Modal */}
      <AdminApproveModal
        request={approveTargetReq}
        currentUser={currentUser}
        allRequests={allRequests}
        isOpen={!!approveTargetReq}
        onClose={() => setApproveTargetReq(null)}
        onConfirmApprove={(updatedReq) => {
          onAdminAction(updatedReq);
          setApproveTargetReq(null);
        }}
      />

      {/* MODAL: AI Co-Pilot Live Simulation & Recommendation Engine */}
      <AiCoPilotModal
        request={aiCoPilotTargetReq}
        allRequests={allRequests}
        currentUser={currentUser}
        isOpen={!!aiCoPilotTargetReq}
        onClose={() => setAiCoPilotTargetReq(null)}
        onApplyNightShift={(updatedReq) => {
          onAdminAction(updatedReq);
          setAiCoPilotTargetReq(null);
        }}
        onAttachTsr={(updatedReq) => {
          onAdminAction(updatedReq);
        }}
        onBundleAndApprove={(bundledReqs) => {
          if (onApplyAiSchedule) {
            onApplyAiSchedule(bundledReqs);
          } else {
            bundledReqs.forEach((r) => onAdminAction(r));
          }
          setAiCoPilotTargetReq(null);
        }}
      />

      {/* MODAL 2: Admin Reject Modal with Reason for Rejection */}
      <AdminRejectModal
        request={rejectTargetReq}
        currentUser={currentUser}
        isOpen={!!rejectTargetReq}
        onClose={() => setRejectTargetReq(null)}
        onConfirmReject={(updatedReq) => {
          onAdminAction(updatedReq);
          setRejectTargetReq(null);
        }}
      />

      {/* MODAL 3: Admin Modify & Approve Modal */}
      <AdminModifyModal
        request={modifyTargetReq}
        currentUser={currentUser}
        isOpen={!!modifyTargetReq}
        onClose={() => setModifyTargetReq(null)}
        onConfirmModifyApprove={(updatedReq) => {
          onAdminAction(updatedReq);
          setModifyTargetReq(null);
        }}
      />

      {/* MODAL 4: AI CP-SAT Solver & Task Bundling Engine Modal */}
      <AiOptimizerModal
        isOpen={isAiOptimizerOpen}
        onClose={() => setIsAiOptimizerOpen(false)}
        currentUser={currentUser}
        allRequests={allRequests}
        onApplyAiSchedule={(updatedReqs) => {
          if (onApplyAiSchedule) {
            onApplyAiSchedule(updatedReqs);
          } else {
            updatedReqs.forEach((r) => onAdminAction(r));
          }
        }}
      />

      {/* MODAL 5: Official Field Execution Roster (Printable PDF & Excel Roster) */}
      <FieldRosterModal
        isOpen={isFieldRosterOpen}
        onClose={() => setIsFieldRosterOpen(false)}
        requests={allRequests}
        currentUser={currentUser}
      />
    </div>
  );
};
