import { DefectPayload } from './mlService';
import { ScheduleBlock } from './solverService';

const ESCALATION_AGE_MS = 2 * 60 * 60 * 1000;

type EscalationDepartment = 'TMS' | 'SMMS' | 'TDMS' | 'CROSS_DEPARTMENT';

type DefectWorkflowFields = {
  calculated_risk_score?: number;
  status?: string;
  assignedTo?: string | null;
  assigned_at?: string;
  created_at?: string;
  submitted_at?: string;
  rejected_at?: string;
  updated_at?: string;
  requiresEmergencyAuthorization?: boolean;
};

type ScheduleRiskFields = {
  calculated_risk_score?: number;
  riskScore?: number;
  tracks_count?: number;
  track_count?: number;
  track?: number;
};

export interface EscalationNotice {
  id: string;
  defectId: string;
  department: EscalationDepartment;
  section: string;
  severity: 'CRITICAL' | 'HIGH';
  reason: string;
  ageHours: number;
  requiresEmergencyAuthorization: boolean;
  createdAt: string;
}

export interface BundledScheduleBlock extends ScheduleBlock {
  bundleId: string;
  bundleType: 'SHADOW_BLOCK';
  sourceBlockIds: string[];
  departments: string[];
  cumulativeRiskScore: number;
  unifiedStartTime: string;
  unifiedEndTime: string;
}

type EscalationListener = (notice: EscalationNotice) => void;
const listeners = new Set<EscalationListener>();

const departmentForDefect = (defect: DefectPayload): EscalationDepartment => {
  const source = `${defect.source_system} ${defect.department}`.toLowerCase();
  if (source.includes('smms') || source.includes('signal') || source.includes('s & t') || source === 'st') return 'SMMS';
  if (source.includes('tdms') || source.includes('trd') || source.includes('traction')) return 'TDMS';
  return 'TMS';
};

const departmentForBlock = (block: ScheduleBlock): string => {
  const value = block.department.toLowerCase();
  if (value.includes('signal') || value.includes('s&t') || value.includes('s & t') || value === 'st' || value === 'smms') return 'SMMS';
  if (value.includes('trd') || value.includes('traction') || value === 'tdms') return 'TDMS';
  return 'TMS';
};

const minutes = (value: string): number => {
  const [hours, mins] = value.split(':').map(Number);
  return (hours || 0) * 60 + (mins || 0);
};

const formatTime = (value: number): string => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

const overlaps = (left: ScheduleBlock, right: ScheduleBlock): boolean => (
  left.section === right.section &&
  Math.max(minutes(left.start_time_hhmm), minutes(right.start_time_hhmm)) < Math.min(minutes(left.end_time_hhmm), minutes(right.end_time_hhmm))
);

const riskOf = (block: ScheduleBlock): number => {
  const fields = block as ScheduleBlock & ScheduleRiskFields;
  return fields.calculated_risk_score ?? fields.riskScore ?? 0;
};

const isSingleTrack = (block: ScheduleBlock): boolean => {
  const fields = block as ScheduleBlock & ScheduleRiskFields;
  return (fields.tracks_count ?? fields.track_count ?? 1) <= 1;
};

const workflowFields = (defect: DefectPayload): DefectWorkflowFields => defect as DefectPayload & DefectWorkflowFields;

function escalationStart(defect: DefectPayload & DefectWorkflowFields): Date | null {
  const timestamp = defect.rejected_at || defect.updated_at || defect.assigned_at || defect.submitted_at || defect.created_at;
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isUnresolved(defect: DefectPayload & DefectWorkflowFields): boolean {
  const status = (defect.status || '').toUpperCase();
  return Boolean(!defect.assignedTo || status === 'UNASSIGNED' || status === 'REJECTED' || status === 'PENDING_REVIEW');
}

export function checkEscalationTriggers(defects: DefectPayload[]): EscalationNotice[] {
  const now = Date.now();
  const notices = defects.flatMap((defect) => {
    const fields = workflowFields(defect);
    const risk = Number(fields.calculated_risk_score);
    const start = escalationStart({ ...defect, ...fields });
    if (!(risk > 80) || !isUnresolved({ ...defect, ...fields }) || !start) return [];
    const ageHours = (now - start.getTime()) / (60 * 60 * 1000);
    if (ageHours <= 2) return [];
    const department = departmentForDefect(defect);
    return [{
      id: `ESC-${defect.defect_id}-${start.getTime()}`,
      defectId: defect.defect_id,
      department,
      section: defect.section,
      severity: 'CRITICAL' as const,
      reason: `Tier-1 defect risk ${risk.toFixed(1)} remained ${fields.status === 'REJECTED' ? 'rejected' : 'unassigned'} for ${ageHours.toFixed(1)} hours.`,
      ageHours: Number(ageHours.toFixed(2)),
      requiresEmergencyAuthorization: true,
      createdAt: new Date(now).toISOString(),
    }];
  });
  notices.forEach((notice) => emitEscalationNotice(notice));
  return notices;
}

export function resolveDepartmentConflict(blockA: ScheduleBlock, blockB: ScheduleBlock): BundledScheduleBlock {
  if (!overlaps(blockA, blockB)) throw new Error('Cannot bundle blocks that do not overlap.');
  const departments = [departmentForBlock(blockA), departmentForBlock(blockB)];
  if (!departments.includes('TMS') || !departments.includes('SMMS')) {
    throw new Error('Shadow Block bundling requires Engineering/TMS and Signal/SMMS blocks.');
  }
  if (!isSingleTrack(blockA) || !isSingleTrack(blockB)) {
    throw new Error('Shadow Block bundling requires a single-track section.');
  }
  const start = Math.min(minutes(blockA.start_time_hhmm), minutes(blockB.start_time_hhmm));
  const end = Math.max(minutes(blockA.end_time_hhmm), minutes(blockB.end_time_hhmm));
  const duration = end - start;
  return {
    defect_id: `${blockA.defect_id}+${blockB.defect_id}`,
    section: blockA.section,
    department: 'ENGINEERING + S&T',
    start_time_hhmm: formatTime(start),
    end_time_hhmm: formatTime(end),
    duration_mins: duration,
    priority_rank: Math.min(blockA.priority_rank, blockB.priority_rank),
    bundleId: `SHADOW-${blockA.defect_id}-${blockB.defect_id}`,
    bundleType: 'SHADOW_BLOCK',
    sourceBlockIds: [blockA.defect_id, blockB.defect_id],
    departments,
    cumulativeRiskScore: Number((riskOf(blockA) + riskOf(blockB)).toFixed(2)),
    unifiedStartTime: formatTime(start),
    unifiedEndTime: formatTime(end),
  };
}

export function subscribeToEscalations(listener: EscalationListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function subscribeToSectionControllerEscalations(listener: EscalationListener): () => void {
  return subscribeToEscalations(listener);
}

export function emitEscalationNotice(notice: EscalationNotice): void {
  listeners.forEach((listener) => {
    try {
      listener(notice);
    } catch (error) {
      console.warn('Escalation toast listener failed:', error);
    }
  });
}

export function createEscalationToastMessage(notice: EscalationNotice): string {
  return `Emergency authorization required: ${notice.defectId} in ${notice.section}. ${notice.reason}`;
}
