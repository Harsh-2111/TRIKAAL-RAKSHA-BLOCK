import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { BlockRequest, User, UserRole, Department, AiScheduleRecord, SupabaseSyncState } from '../types';
import { OFFICIAL_ROLES, normalizePersonName } from '../data/mockData';

// Pre-configured Production Supabase Credentials
const getEnv = (key: string, fallback: string): string => {
  try {
    return ((import.meta as any).env && (import.meta as any).env[key]) || fallback;
  } catch {
    return fallback;
  }
};

export const SUPABASE_URL =
  getEnv('VITE_SUPABASE_URL', 'https://rywnmfynpenbwfbzqxyg.supabase.co');

export const SUPABASE_ANON_KEY =
  getEnv(
    'VITE_SUPABASE_ANON_KEY',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5d25tZnlucGVuYndmYnpxeHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMzYxMzAsImV4cCI6MjEwNDYxMjEzMH0.KSy4uyXv-YUC_yxXivUDdDG6Aws8I8OK5kNyu2yf6LA'
  );

// Initialize the Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ==========================================
// DB Adapter: BlockRequest <-> Supabase row
// Supports both snake_case and camelCase DB schemas
// ==========================================

export function dbToBlockRequest(row: any): BlockRequest {
  if (!row) return {} as BlockRequest;

  const storedRequest = row.request_data && typeof row.request_data === 'object'
    ? { ...row, ...row.request_data }
    : row;
  const normalizedDepartment = String(storedRequest.department || 'ENGINEERING').toUpperCase();
  const normalizedStatus = String(storedRequest.status || 'PENDING').toUpperCase().replace(/ /g, '_');
  const startTimestamp = storedRequest.start_time || storedRequest.startTime;
  const endTimestamp = storedRequest.end_time || storedRequest.endTime;
  const startTime = storedRequest.requested_start_time ?? storedRequest.requestedStartTime ?? (startTimestamp ? String(startTimestamp).slice(11, 16) : '01:00');
  const endTime = storedRequest.requested_end_time ?? storedRequest.requestedEndTime ?? (endTimestamp ? String(endTimestamp).slice(11, 16) : '04:00');
  const requestedDate = storedRequest.requested_date ?? storedRequest.requestedDate ?? (startTimestamp ? String(startTimestamp).slice(0, 10) : new Date().toISOString().split('T')[0]);

  const rawDivision = storedRequest.division ?? 'Delhi (DLI)';
  const rawZone = storedRequest.zone ?? storedRequest.railway_zone;
  const resolvedZone = rawZone ?? (
    rawDivision.includes('MMCT') || rawDivision.includes('Mumbai') ? 'Western Railway (WR)' :
    rawDivision.includes('PA') || rawDivision.includes('Pune') ? 'Central Railway (CR)' :
    rawDivision.includes('SDAH') || rawDivision.includes('Sealdah') ? 'Eastern Railway (ER)' :
    rawDivision.includes('MAS') || rawDivision.includes('Chennai') ? 'Southern Railway (SR)' :
    'NR (Delhi Division)'
  );

  const resolvedZoneCode: any = row.zone_code ?? row.zoneCode ?? (
    resolvedZone.includes('WR') ? 'WR' :
    resolvedZone.includes('CR') ? 'CR' :
    resolvedZone.includes('ER') ? 'ER' :
    resolvedZone.includes('SR') ? 'SR' :
    'NR'
  );

  return {
    id: storedRequest.request_id ?? storedRequest.id ?? storedRequest.block_id ?? `RB-REQ-${Date.now()}`,
    department: (normalizedDepartment === 'S&T' || normalizedDepartment === 'S & T' ? 'ST' : normalizedDepartment) as Department,
    applicantName: normalizePersonName(storedRequest.applicant_name ?? storedRequest.applicantName ?? 'Railway Official') || 'Railway Official',
    applicantDesignation: storedRequest.applicant_designation ?? storedRequest.applicantDesignation ?? 'Sr. Section Engineer',
    zone: resolvedZone,
    zoneCode: resolvedZoneCode,
    division: rawDivision,
    section: storedRequest.section ?? storedRequest.section_name ?? 'Corridor Section',
    stationFrom: storedRequest.station_from ?? storedRequest.stationFrom ?? 'Station A',
    stationTo: storedRequest.station_to ?? storedRequest.stationTo ?? 'Station B',
    lineType: storedRequest.line_type ?? storedRequest.lineType ?? 'UP Main Line',
    startKm: storedRequest.start_km ?? storedRequest.startKm ?? 'KM 0/0',
    endKm: storedRequest.end_km ?? storedRequest.endKm ?? 'KM 2/0',
    workCategory: storedRequest.work_category ?? storedRequest.workCategory ?? storedRequest.block_type ?? 'Track Maintenance',
    blockType: storedRequest.block_type ?? storedRequest.blockType ?? storedRequest.work_category ?? 'Track Maintenance',
    workDescription: storedRequest.work_description ?? storedRequest.workDescription ?? storedRequest.justification ?? 'Routine Maintenance',
    justification: storedRequest.justification ?? '',
    machineryDeployed: Array.isArray(storedRequest.machinery_deployed)
      ? storedRequest.machinery_deployed
      : Array.isArray(storedRequest.machineryDeployed)
      ? storedRequest.machineryDeployed
      : typeof (storedRequest.machinery_deployed ?? storedRequest.machinery) === 'string'
      ? (storedRequest.machinery_deployed ?? storedRequest.machinery).split(',').map((s: string) => s.trim())
      : ['Standard Maintenance Team'],
    machineryText: storedRequest.machinery_text ?? storedRequest.machineryText ?? storedRequest.machinery ?? '',
    requestedDate,
    requestedStartTime: startTime,
    requestedEndTime: endTime,
    durationMinutes: Number(storedRequest.duration_minutes ?? storedRequest.durationMinutes ?? Number(storedRequest.duration_hours || 3) * 60),
    durationFormatted: storedRequest.duration_formatted ?? storedRequest.durationFormatted ?? '3 hrs 00 mins',
    powerBlockRequired: Boolean(storedRequest.power_block_required ?? storedRequest.powerBlockRequired ?? false),
    trafficBlockRequired: Boolean(storedRequest.traffic_block_required ?? storedRequest.trafficBlockRequired ?? true),
    disconnectionMemoRequired: Boolean(storedRequest.disconnection_memo_required ?? storedRequest.disconnectionMemoRequired ?? false),
    shadowBlockEligible: Boolean(storedRequest.shadow_block_eligible ?? storedRequest.shadowBlockEligible ?? false),
    speedRestrictionKmH: storedRequest.speed_restriction_kmh ?? storedRequest.speedRestrictionKmH ?? null,
    priority: storedRequest.priority ?? 'ROUTINE_PLANNED',
    urgencyLevel: storedRequest.urgency_level ?? storedRequest.urgency ?? storedRequest.urgencyLevel ?? 'Routine',
    status: normalizedStatus as BlockRequest['status'],
    submittedAt: storedRequest.submitted_at ?? storedRequest.submittedAt ?? storedRequest.created_at ?? new Date().toISOString(),
    reviewedAt: storedRequest.reviewed_at ?? storedRequest.reviewedAt ?? undefined,
    reviewedBy: normalizePersonName(storedRequest.reviewed_by ?? storedRequest.reviewedBy),
    approvedStartTime: storedRequest.approved_start_time ?? storedRequest.approvedStartTime ?? undefined,
    approvedEndTime: storedRequest.approved_end_time ?? storedRequest.approvedEndTime ?? undefined,
    approvedDurationMinutes: storedRequest.approved_duration_minutes ?? storedRequest.approvedDurationMinutes ?? undefined,
    cautionOrderDetails: storedRequest.caution_order_details ?? storedRequest.cautionOrderDetails ?? undefined,
    controllerRemarks: storedRequest.controller_remarks ?? storedRequest.controllerRemarks ?? storedRequest.rejection_reason ?? undefined,
    integratedWithBlockId: storedRequest.integrated_with_block_id ?? storedRequest.integratedWithBlockId ?? undefined,
    safetyChecklistAcknowledged: Boolean(storedRequest.safety_checklist_acknowledged ?? storedRequest.safetyChecklistAcknowledged ?? true),
    aiOptimized: Boolean(storedRequest.ai_optimized ?? storedRequest.aiOptimized ?? false),
    aiBundleId: storedRequest.ai_bundle_id ?? storedRequest.aiBundleId ?? undefined,
    aiOptimizationNotes: storedRequest.ai_optimization_notes ?? storedRequest.aiOptimizationNotes ?? undefined,
  };
}

export function blockRequestToDb(req: BlockRequest): Record<string, any> {
  return {
    department: req.department === 'ENGINEERING' ? 'Engineering' : req.department === 'ST' ? 'S & T' : 'TRD',
    route_section: req.section,
    work_type: req.blockType || req.workCategory,
    requested_time: `${req.requestedDate}T${req.requestedStartTime}:00`,
    duration_hours: req.durationMinutes / 60,
    urgency: req.urgencyLevel || 'Routine',
    affected_trains: req.machineryDeployed.join(', '),
    remarks: req.justification || req.workDescription,
    status: req.status === 'APPROVED' || req.status === 'MODIFIED_APPROVED' || req.status === 'COMPLETED' ? 'Approved' : req.status === 'REJECTED' ? 'Rejected' : 'Pending',
    request_data: req,
  };
}

// ==========================================
// DB Adapter: User Profile <-> Supabase row
// ==========================================

export function dbToUserProfile(row: any): User {
  return {
    id: row.id || `usr-${row.role?.toLowerCase() || 'off'}`,
    name: normalizePersonName(row.name || 'Railway Official') || 'Railway Official',
    designation: row.designation || 'Section Officer',
    role: (row.role || 'ENG_OFFICER') as UserRole,
    department: (row.department || 'ENGINEERING') as Department | 'ADMIN',
    division: row.division || 'Delhi (DLI)',
    zone: row.zone || 'Indian Railways',
    employeeId: row.employee_id ?? row.employeeId ?? 'NR/OFF/001',
    phone: row.phone ?? '+91 98765 43210',
    avatarBadge: row.avatar_badge ?? row.avatarBadge ?? (row.department === 'ADMIN' ? 'CTL' : row.department || 'ENG'),
  };
}

export function userProfileToDb(user: User): Record<string, any> {
  return {
    id: user.id,
    name: user.name,
    designation: user.designation,
    role: user.role,
    department: user.department,
    division: user.division,
    zone: user.zone,
    employee_id: user.employeeId,
    phone: user.phone,
    avatar_badge: user.avatarBadge,
  };
}

// ==========================================
// Service 1: Profiles Query & Dynamic Authentication
// ==========================================

export async function fetchProfilesFromSupabase(): Promise<{
  profiles: User[];
  fromSupabase: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.from('profiles').select('*');

    if (error) {
      console.warn('Supabase profiles query returned notice:', error.message);
      // Attempt auto-seeding if the table is freshly created or empty
      return {
        profiles: Object.values(OFFICIAL_ROLES),
        fromSupabase: false,
        error: error.message,
      };
    }

    if (data && data.length > 0) {
      const mapped = data.map(dbToUserProfile);
      // Ensure all 4 mandatory roles are present
      const hasEng = mapped.some((p) => p.role === 'ENG_OFFICER');
      const hasSt = mapped.some((p) => p.role === 'ST_OFFICER');
      const hasTrd = mapped.some((p) => p.role === 'TRD_OFFICER');
      const hasCtl = mapped.some((p) => p.role === 'SECTION_CONTROLLER');

      if (hasEng && hasSt && hasTrd && hasCtl) {
        return { profiles: mapped, fromSupabase: true };
      }

      // Merge with default roles if some are missing
      const fullList: User[] = [
        mapped.find((p) => p.role === 'ENG_OFFICER') || OFFICIAL_ROLES.ENG_OFFICER,
        mapped.find((p) => p.role === 'ST_OFFICER') || OFFICIAL_ROLES.ST_OFFICER,
        mapped.find((p) => p.role === 'TRD_OFFICER') || OFFICIAL_ROLES.TRD_OFFICER,
        mapped.find((p) => p.role === 'SECTION_CONTROLLER') || OFFICIAL_ROLES.SECTION_CONTROLLER,
      ];
      return { profiles: fullList, fromSupabase: true };
    }

    // Table is empty: seed default 4 official roles
    try {
      const seedPayload = Object.values(OFFICIAL_ROLES).map(userProfileToDb);
      await supabase.from('profiles').upsert(seedPayload);
    } catch (seedErr) {
      console.warn('Could not auto-seed profiles table:', seedErr);
    }

    return {
      profiles: Object.values(OFFICIAL_ROLES),
      fromSupabase: false,
    };
  } catch (err: any) {
    console.warn('Network error accessing Supabase profiles:', err.message);
    return {
      profiles: Object.values(OFFICIAL_ROLES),
      fromSupabase: false,
      error: err.message,
    };
  }
}

// ==========================================
// Service 1B: Department Modal Credential Verification
// Queries supabase.from('profiles').select('*').eq('user_id', entered_id)
// Validates against official department credentials & demo judge credentials
// ==========================================

export interface SupabaseAuthResult {
  success: boolean;
  user?: User;
  error?: string;
  matchedDepartment?: Department | 'ADMIN';
}

export const JUDGE_DEMO_CREDENTIALS: Record<
  UserRole,
  { id: string; pass: string; label: string; departmentName: string }
> = {
  ENG_OFFICER: {
    id: 'ENG_OFFICER',
    pass: 'ENG@1234',
    label: 'Engineering (P-Way)',
    departmentName: 'Engineering Department Portal',
  },
  ST_OFFICER: {
    id: 'ST_OFFICER',
    pass: 'ST@1234',
    label: 'S&T (Signalling & Telecom)',
    departmentName: 'S&T Department Portal',
  },
  TRD_OFFICER: {
    id: 'TRD_OFFICER',
    pass: 'TRD@1234',
    label: 'TRD (Traction Distribution 25kV OHE)',
    departmentName: 'TRD Department Portal',
  },
  SECTION_CONTROLLER: {
    id: 'MAIN_CONTROL',
    pass: 'ADMIN@1234',
    label: 'Main Control Admin',
    departmentName: 'Main Control Administration',
  },
};

export async function verifyCredentialsAgainstSupabase(
  enteredId: string,
  enteredPassword: string,
  targetRole?: UserRole
): Promise<SupabaseAuthResult> {
  const trimmedId = (enteredId || '').trim();
  const trimmedPass = (enteredPassword || '').trim();

  if (!trimmedId || !trimmedPass) {
    return {
      success: false,
      error: '❌ Please enter both User ID and Password',
    };
  }

  try {
    // 1. Direct query on user_id as instructed:
    // query: supabase.from('profiles').select('*').eq('user_id', entered_id)
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', trimmedId.toLowerCase());

    // 2. If no direct record is returned, check judge alias mapping (e.g. ENG_OFFICER -> eng)
    if (!data || data.length === 0) {
      const aliasMap: Record<string, string> = {
        ENG_OFFICER: 'eng',
        ST_OFFICER: 'st',
        TRD_OFFICER: 'trd',
        MAIN_CONTROL: 'admin',
        ENG: 'eng',
        ST: 'st',
        TRD: 'trd',
        ADMIN: 'admin',
        SECTION_CONTROLLER: 'admin',
      };
      const alias = aliasMap[trimmedId.toUpperCase()];
      if (alias) {
        const aliasRes = await supabase
          .from('profiles')
          .select('*')
          .eq('username', alias);
        if (aliasRes.data && aliasRes.data.length > 0) {
          data = aliasRes.data;
        }
        if (aliasRes.error) {
          error = aliasRes.error;
        }
      }
    }

    if (error) {
      console.warn('Supabase profile query notice:', error.message);
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: '❌ Invalid User ID or Password',
      };
    }

    const profile = data[0];

    // 3. Password Verification:
    // Check against official demo credentials for judges & evaluators
    const expectedPasswordMap: Record<string, string> = {
      eng: 'eng@1234',
      st: 'st@1234',
      trd: 'trd@1234',
      admin: 'admin@1234',
    };

    const expectedPass = expectedPasswordMap[profile.username.toLowerCase()];
    let isValidPassword = false;

    if (expectedPass && trimmedPass === expectedPass) {
      isValidPassword = true;
    } else if (profile.password) {
      isValidPassword = trimmedPass === profile.password;
    } else if (profile.password_hash) {
      try {
        isValidPassword = bcrypt.compareSync(trimmedPass, profile.password_hash);
      } catch (e) {
        console.warn('Bcrypt evaluation notice:', e);
      }
    }

    if (!isValidPassword) {
      return {
        success: false,
        error: '❌ Invalid User ID or Password',
      };
    }

    // 4. Resolve authenticated role
    let resolvedRole: UserRole = 'ENG_OFFICER';
    const rawRole = String(profile.role || '').toLowerCase();
    const rawDepartment = String(profile.department || '').toLowerCase();
    const rawUsername = String(profile.username || '').toLowerCase();
    const rawKey = `${rawRole} ${rawDepartment} ${rawUsername}`;
    if (rawRole.includes('admin') || rawRole.includes('control') || rawDepartment.includes('admin') || rawUsername === 'admin') {
      resolvedRole = 'SECTION_CONTROLLER';
    } else if (rawDepartment.includes('s & t') || rawDepartment.includes('s&t') || rawUsername === 'st' || rawRole.includes('st')) {
      resolvedRole = 'ST_OFFICER';
    } else if (rawDepartment.includes('trd') || rawUsername === 'trd' || rawRole.includes('trd')) {
      resolvedRole = 'TRD_OFFICER';
    } else if (rawKey.includes('eng') || rawDepartment.includes('engineering') || rawUsername === 'eng') {
      resolvedRole = 'ENG_OFFICER';
    }

    // 5. If modal was opened for a specific role, verify department match
    if (targetRole && targetRole !== resolvedRole) {
      const deptNames: Record<UserRole, string> = {
        ENG_OFFICER: 'Engineering Department (P-Way)',
        ST_OFFICER: 'S&T Department',
        TRD_OFFICER: 'TRD Department',
        SECTION_CONTROLLER: 'Main Control Admin',
      };
      return {
        success: false,
        error: `❌ User ID belongs to ${deptNames[resolvedRole]}. Please log in through the ${deptNames[resolvedRole]} portal.`,
      };
    }

    // 6. Build the authentic railway officer profile object
    const baseTemplate = OFFICIAL_ROLES[resolvedRole];
    const user: User = {
      id: profile.id || baseTemplate.id,
      name: profile.role_name || baseTemplate.name,
      designation: baseTemplate.designation,
      role: resolvedRole,
      department: baseTemplate.department,
      division: 'Delhi (DLI)',
      zone: 'Indian Railways',
      employeeId: baseTemplate.employeeId,
      phone: baseTemplate.phone,
      avatarBadge: baseTemplate.avatarBadge,
    };

    return {
      success: true,
      user,
      matchedDepartment: baseTemplate.department,
    };
  } catch (err: any) {
    console.error('Credential verification error:', err);
    return {
      success: false,
      error: '❌ Network error during credential verification. Please retry.',
    };
  }
}

// ==========================================
// Service 2: Block Requests Fetch, Insert & Update
// ==========================================

export async function fetchBlockRequestsFromSupabase(activeZone?: string): Promise<{
  requests: BlockRequest[];
  fromSupabase: boolean;
  error?: string;
}> {
  try {
    const query = supabase.from('block_requests').select('*');

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase block_requests select notice:', error.message);
      return { requests: [], fromSupabase: false, error: error.message };
    }

    if (data && data.length > 0) {
      const allParsed = data.map(dbToBlockRequest);
      const completedRequests = allParsed.filter((request) => request.status === 'COMPLETED');
      if (completedRequests.length > 0) {
        await Promise.all(completedRequests.map((request) => deleteBlockRequestInSupabase(request.id)));
      }
      const parsed = allParsed.filter((request) => request.status !== 'COMPLETED');
      const filtered = activeZone && activeZone !== 'ALL'
        ? parsed.filter((request) => request.zoneCode === activeZone || request.zone?.includes(activeZone) || request.division?.includes(activeZone))
        : parsed;
      return { requests: filtered, fromSupabase: true };
    }

    return { requests: [], fromSupabase: true };
  } catch (err: any) {
    console.warn('Fetch block_requests caught error:', err.message);
    return { requests: [], fromSupabase: false, error: err.message };
  }
}

export async function insertBlockRequestToSupabase(
  request: BlockRequest
): Promise<{ success: boolean; data?: BlockRequest; error?: string }> {
  try {
    const payload = blockRequestToDb(request);
    const { data, error } = await supabase
      .from('block_requests')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.warn('Supabase insertBlockRequest warning:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: data ? dbToBlockRequest(data) : request };
  } catch (err: any) {
    console.error('Exception in insertBlockRequestToSupabase:', err);
    return { success: false, error: err.message };
  }
}

export async function updateBlockRequestInSupabase(
  request: BlockRequest
): Promise<{ success: boolean; data?: BlockRequest; error?: string }> {
  try {
    const payload = blockRequestToDb(request);
    const { data, error } = await supabase
      .from('block_requests')
      .update(payload)
      .eq('request_data->>id', request.id)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Supabase updateBlockRequest warning:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: data ? dbToBlockRequest(data) : request };
  } catch (err: any) {
    console.error('Exception in updateBlockRequestInSupabase:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteBlockRequestInSupabase(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('block_requests')
      .delete()
      .eq('request_data->>id', requestId);

    if (error) {
      console.warn('Supabase deleteBlockRequest warning:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Exception in deleteBlockRequestInSupabase:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteAllBlockRequestsInSupabase(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('block_requests')
      .delete()
      .not('id', 'is', null);

    if (error) {
      console.warn('Supabase deleteAllBlockRequests warning:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Exception in deleteAllBlockRequestsInSupabase:', err);
    return { success: false, error: err.message };
  }
}

export async function batchUpdateBlockRequestsInSupabase(
  requests: BlockRequest[]
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  try {
    const payloads = requests.map(blockRequestToDb);
    const { error } = await supabase.from('block_requests').upsert(payloads);

    if (error) {
      console.warn('Supabase batchUpdateBlockRequests error:', error.message);
      return { success: false, updatedCount: 0, error: error.message };
    }

    return { success: true, updatedCount: requests.length };
  } catch (err: any) {
    console.error('Exception in batchUpdateBlockRequestsInSupabase:', err);
    return { success: false, updatedCount: 0, error: err.message };
  }
}

// ==========================================
// Service 3: AI Schedules Audit Log
// ==========================================

export async function insertAiScheduleLogToSupabase(
  scheduleLog: AiScheduleRecord
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const payload = {
      schedule_name: scheduleLog.schedule_name,
      total_hours_saved: Number(scheduleLog.total_hours_saved),
      conflicts_resolved: Number(scheduleLog.conflicts_resolved),
      bundled_blocks_json: typeof scheduleLog.bundled_blocks_json === 'string'
        ? scheduleLog.bundled_blocks_json
        : JSON.stringify(scheduleLog.bundled_blocks_json),
      created_at: scheduleLog.created_at || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('ai_schedule')
      .insert({
        block_request_id: null,
        scheduled_start: scheduleLog.created_at || new Date().toISOString(),
        scheduled_end: scheduleLog.created_at || new Date().toISOString(),
        optimized_score: scheduleLog.total_hours_saved,
        ai_remarks: JSON.stringify(payload),
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Supabase insertAiScheduleLog error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Exception in insertAiScheduleLogToSupabase:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchAiScheduleLogsFromSupabase(): Promise<{
  logs: AiScheduleRecord[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('ai_schedule')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);

    if (error) {
      return { logs: [], error: error.message };
    }

    const mapped: AiScheduleRecord[] = (data || []).map((row: any) => {
      const metadata = JSON.parse(row.ai_remarks || '{}');
      return {
      id: row.id,
      schedule_name: metadata.schedule_name || 'CP-SAT Auto-Schedule',
      total_hours_saved: Number(metadata.total_hours_saved || 0),
      conflicts_resolved: Number(metadata.conflicts_resolved || 0),
      bundled_blocks_json: metadata.bundled_blocks_json || [],
      created_at: row.created_at,
      };
    });

    return { logs: mapped };
  } catch (err: any) {
    return { logs: [], error: err.message };
  }
}

// ==========================================
// Service 4: Multi-Table Real-Time Auto-Sync
// ==========================================

export function setupRealtimeSync(callbacks: {
  onBlockRequestChange: (changeType: 'INSERT' | 'UPDATE' | 'DELETE', record: BlockRequest, oldRecord?: any) => void;
  onAiScheduleChange: (newSchedule: AiScheduleRecord) => void;
  onStatusChange: (status: SupabaseSyncState) => void;
}): () => void {
  callbacks.onStatusChange({
    status: 'CONNECTING',
    lastSyncedAt: null,
    activeChannel: false,
    errorMessage: null,
    pendingSyncCount: 0,
  });

  const channel = supabase.channel('public-db-changes');

  // Listen to block_requests table changes
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'block_requests' },
    (payload) => {
      const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
      if (eventType === 'INSERT' && payload.new) {
        const req = dbToBlockRequest(payload.new);
        callbacks.onBlockRequestChange('INSERT', req);
      } else if (eventType === 'UPDATE' && payload.new) {
        const req = dbToBlockRequest(payload.new);
        callbacks.onBlockRequestChange('UPDATE', req, payload.old);
      } else if (eventType === 'DELETE' && payload.old) {
        const req = dbToBlockRequest(payload.old);
        callbacks.onBlockRequestChange('DELETE', req);
      }

      callbacks.onStatusChange({
        status: 'SYNCED',
        lastSyncedAt: new Date().toLocaleTimeString(),
        activeChannel: true,
        errorMessage: null,
        pendingSyncCount: 0,
      });
    }
  );

  // Listen to ai_schedule table changes
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'ai_schedule' },
    (payload) => {
      if (payload.new) {
        const metadata = JSON.parse(payload.new.ai_remarks || '{}');
        const record: AiScheduleRecord = {
          id: payload.new.id,
          schedule_name: metadata.schedule_name || 'CP-SAT Auto-Schedule',
          total_hours_saved: Number(metadata.total_hours_saved || 0),
          conflicts_resolved: Number(metadata.conflicts_resolved || 0),
          bundled_blocks_json: metadata.bundled_blocks_json || [],
          created_at: payload.new.created_at,
        };
        callbacks.onAiScheduleChange(record);
      }
    }
  );

  // Subscribe and track connection status
  channel.subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      callbacks.onStatusChange({
        status: 'CONNECTED',
        lastSyncedAt: new Date().toLocaleTimeString(),
        activeChannel: true,
        errorMessage: null,
        pendingSyncCount: 0,
      });
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.warn('Supabase Realtime subscription failed:', err?.message || status);
      callbacks.onStatusChange({
        status: 'OFFLINE_FALLBACK',
        lastSyncedAt: null,
        activeChannel: false,
        errorMessage: err ? err.message : `Channel subscription status: ${status}`,
        pendingSyncCount: 0,
      });
    } else if (status === 'CLOSED') {
      console.warn('Supabase Realtime channel closed; polling fallback remains active.');
      callbacks.onStatusChange({
        status: 'OFFLINE_FALLBACK',
        lastSyncedAt: null,
        activeChannel: false,
        errorMessage: 'Connection closed. Fallback active.',
        pendingSyncCount: 0,
      });
    }
  });

  return () => {
    supabase.removeChannel(channel);
  };
}
