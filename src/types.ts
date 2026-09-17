export type Department = 'ENGINEERING' | 'ST' | 'TRD';

export type UserRole = 'ENG_OFFICER' | 'ST_OFFICER' | 'TRD_OFFICER' | 'SECTION_CONTROLLER';

export type BlockStatus = 'PENDING' | 'APPROVED' | 'MODIFIED_APPROVED' | 'REJECTED' | 'COMPLETED';

export type BlockPriority = 'SAFETY_CRITICAL' | 'ROUTINE_PLANNED' | 'URGENT';

export type UrgencyLevel = 'Routine' | 'Priority' | 'Critical Emergency';

export type BlockType =
  | 'Track Maintenance'
  | 'OHE Maintenance'
  | 'Signal Interlocking'
  | 'Bridge Repair'
  | 'Level Crossing Gate Interlocking'
  | 'Turnout & Diamond Crossing Overhaul'
  | string;

export type RailwayZoneCode = 'ALL' | 'NR' | 'WR' | 'CR' | 'ER' | 'SR';

export interface ZonalRailwayInfo {
  code: RailwayZoneCode;
  shortName: string;
  fullName: string;
  hindiName: string;
  divisionCode: string;
  divisionName: string;
  headquarters: string;
  coordinates: [number, number]; // [lat, lng]
  defaultZoom: number;
  trafficDensity: string;
  densityMultiplier: number;
  dailyTrains: number;
  color: string;
}

export interface User {
  id: string;
  name: string;
  designation: string;
  role: UserRole;
  department: Department | 'ADMIN';
  division: string;
  zone: string;
  zoneCode?: RailwayZoneCode;
  employeeId: string;
  phone: string;
  avatarBadge: string;
}

export interface BlockRequest {
  id: string;
  department: Department;
  applicantName: string;
  applicantDesignation: string;
  zone?: string;
  zoneCode?: RailwayZoneCode;
  division: string;
  section: string;
  stationFrom: string;
  stationTo: string;
  lineType: string;
  startKm: string;
  endKm: string;
  workCategory: string;
  blockType?: string;
  workDescription: string;
  justification?: string;
  machineryDeployed: string[];
  machineryText?: string;
  requestedDate: string;
  requestedStartTime: string;
  requestedEndTime: string;
  durationMinutes: number;
  durationFormatted?: string;
  powerBlockRequired: boolean;
  trafficBlockRequired: boolean;
  disconnectionMemoRequired: boolean;
  shadowBlockEligible: boolean;
  speedRestrictionKmH: number | null;
  priority: BlockPriority;
  urgencyLevel?: UrgencyLevel;
  status: BlockStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  approvedStartTime?: string;
  approvedEndTime?: string;
  approvedDurationMinutes?: number;
  cautionOrderDetails?: string;
  controllerRemarks?: string;
  integratedWithBlockId?: string;
  safetyChecklistAcknowledged: boolean;
  aiOptimized?: boolean;
  aiBundleId?: string;
  aiOptimizationNotes?: string;
  safetyClearedAt?: string;
  safetyClearedBy?: string;
  safetyChecklistPassed?: boolean;
  closedAt?: string;
}

export interface BundledBlockWindow {
  bundleId: string;
  section: string;
  date: string;
  lineType: string;
  startKm: string;
  endKm: string;
  optimizedStartTime: string;
  optimizedEndTime: string;
  durationMinutes: number;
  durationFormatted: string;
  requests: BlockRequest[];
  departments: Department[];
  priorityScore: number;
  urgencyLevel: UrgencyLevel;
  totalSeparateDurationMinutes: number;
  savedDetentionMinutes: number;
  conflictsResolvedCount: number;
  aiJustification: string;
  coordinationTasks: {
    dept: Department;
    requestId: string;
    workDescription: string;
    machinery: string[];
    roleInWindow: string;
  }[];
}

export interface SolverOptimizationResult {
  bundledWindows: BundledBlockWindow[];
  standaloneApproved: BlockRequest[];
  totalBlockHoursSavedMinutes: number;
  totalBlockHoursSavedFormatted: string;
  percentHoursSaved: number;
  conflictReductionRatePercent: number;
  totalConflictsResolved: number;
  totalBundlesCreated: number;
  totalRequestsProcessed: number;
  hasOverlaps?: boolean;
}

export interface ShadowBlockOpportunity {
  primaryBlockId: string;
  candidateBlockId: string;
  primaryDepartment: Department;
  candidateDepartment: Department;
  section: string;
  lineType: string;
  overlapDate: string;
  reason: string;
  estimatedDetentionSavedMinutes: number;
}

export interface AiScheduleRecord {
  id?: string;
  schedule_name: string;
  total_hours_saved: number;
  conflicts_resolved: number;
  bundled_blocks_json: any;
  created_at?: string;
}

export type SupabaseStatus = 'CONNECTING' | 'CONNECTED' | 'SYNCED' | 'ERROR' | 'OFFLINE_FALLBACK';

export interface SupabaseSyncState {
  status: SupabaseStatus;
  lastSyncedAt: string | null;
  activeChannel: boolean;
  errorMessage: string | null;
  pendingSyncCount: number;
}

export type NotificationType =
  | 'NEW_REQUEST'
  | 'APPROVAL'
  | 'REJECTION'
  | 'MODIFIED_APPROVAL'
  | 'CLOSED'
  | 'SCHEDULE_PUBLISHED'
  | 'NEW_DEMAND'
  | 'STATUS_APPROVED'
  | 'STATUS_MODIFIED'
  | 'STATUS_REJECTED'
  | 'SAFETY_CLEARANCE'
  | 'AI_OPTIMIZATION'
  | 'CAUTION_ORDER'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  requestId?: string;
  department?: Department;
  targetRole?: UserRole | 'ALL';
  sourceRole?: UserRole;
  senderId?: string;
  priority?: 'HIGH' | 'NORMAL';
}
