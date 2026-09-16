import { supabase } from '../lib/supabase';
import {
  JUDGE_DEMO_CREDENTIALS,
  verifyCredentialsAgainstSupabase,
} from '../lib/supabase';
import { getStoredUser, saveStoredUser } from '../data/mockData';
import { User } from '../types';
import { ScheduleBlock } from './solverService';

export type AccessRole =
  | 'Section Controller'
  | 'Engineering Controller'
  | 'Signal Controller'
  | 'TRD Controller';

export interface AuthenticatedRole {
  role: AccessRole;
  assignedSectionJurisdiction: string;
  department: 'ADMIN' | 'TMS' | 'SMMS' | 'TDMS';
  userId?: string;
  displayName?: string;
}

export interface LoginResult {
  success: boolean;
  user?: AuthenticatedRole;
  error?: string;
}

const SESSION_KEY = 'raksha_block_auth_role_v1';

const roleForDepartment = (value: string): AuthenticatedRole | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes('section') || normalized.includes('admin') || normalized.includes('control')) {
    return { role: 'Section Controller', assignedSectionJurisdiction: 'ALL', department: 'ADMIN' };
  }
  if (normalized.includes('engineering') || normalized === 'eng' || normalized.includes('tms')) {
    return { role: 'Engineering Controller', assignedSectionJurisdiction: 'ALL', department: 'TMS' };
  }
  if (normalized.includes('signal') || normalized.includes('s&t') || normalized === 'st' || normalized.includes('smms')) {
    return { role: 'Signal Controller', assignedSectionJurisdiction: 'ALL', department: 'SMMS' };
  }
  if (normalized.includes('trd') || normalized.includes('traction') || normalized.includes('tdms')) {
    return { role: 'TRD Controller', assignedSectionJurisdiction: 'ALL', department: 'TDMS' };
  }
  return null;
};

const roleFromUser = (user: User): AuthenticatedRole => {
  if (user.role === 'SECTION_CONTROLLER') return { role: 'Section Controller', assignedSectionJurisdiction: 'ALL', department: 'ADMIN', userId: user.id, displayName: user.name };
  if (user.role === 'ST_OFFICER') return { role: 'Signal Controller', assignedSectionJurisdiction: 'ALL', department: 'SMMS', userId: user.id, displayName: user.name };
  if (user.role === 'TRD_OFFICER') return { role: 'TRD Controller', assignedSectionJurisdiction: 'ALL', department: 'TDMS', userId: user.id, displayName: user.name };
  return { role: 'Engineering Controller', assignedSectionJurisdiction: 'ALL', department: 'TMS', userId: user.id, displayName: user.name };
};

const readSession = (): AuthenticatedRole | null => {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) as AuthenticatedRole : null;
  } catch {
    return null;
  }
};

const saveSession = (role: AuthenticatedRole): void => {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(role)); } catch { /* private browsing can block storage */ }
};

export async function loginUser(department: string, key: string): Promise<LoginResult> {
  const requestedRole = roleForDepartment(department);
  if (!requestedRole || !key.trim()) return { success: false, error: 'Invalid department or access key.' };

  try {
    const email = department.includes('@') ? department.trim() : `${department.trim().toLowerCase()}@raksha.local`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: key });
    if (!error && data.user) {
      const role = { ...requestedRole, userId: data.user.id, displayName: data.user.user_metadata?.name || data.user.email || department };
      saveSession(role);
      return { success: true, user: role };
    }
  } catch (error) {
    console.warn('Supabase Auth unavailable; trying local/profile authentication.', error);
  }

  const targetRole = requestedRole.role === 'Section Controller' ? 'SECTION_CONTROLLER' : requestedRole.department === 'TMS' ? 'ENG_OFFICER' : requestedRole.department === 'SMMS' ? 'ST_OFFICER' : 'TRD_OFFICER';
  const profileResult = await verifyCredentialsAgainstSupabase(department, key, targetRole);
  if (profileResult.success && profileResult.user) {
    const role = roleFromUser(profileResult.user);
    saveSession(role);
    saveStoredUser(profileResult.user);
    return { success: true, user: role };
  }

  const credential = Object.values(JUDGE_DEMO_CREDENTIALS).find((item) => item.pass.toLowerCase() === key.trim().toLowerCase() && item.id === (targetRole === 'SECTION_CONTROLLER' ? 'MAIN_CONTROL' : targetRole));
  if (credential) {
    const role = { ...requestedRole, displayName: credential.label };
    saveSession(role);
    return { success: true, user: role };
  }
  return { success: false, error: profileResult.error || 'Authentication failed.' };
}

export function getCurrentUserRole(): AuthenticatedRole | null {
  const session = readSession();
  if (session) return session;
  const storedUser = getStoredUser();
  return storedUser ? roleFromUser(storedUser) : null;
}

export function filterBlocksByRole(blocks: ScheduleBlock[], role: string): ScheduleBlock[] {
  const active = roleForDepartment(role) || readSession();
  if (!active || active.role === 'Section Controller') return blocks.map((block) => ({ ...block, readOnly: false }));

  const blockBelongsToRole = (blockDepartment: string): boolean => {
    const normalized = blockDepartment.toLowerCase();
    if (active.department === 'TMS') return normalized.includes('engineering') || normalized === 'eng' || normalized === 'tms';
    if (active.department === 'SMMS') return normalized.includes('s & t') || normalized.includes('signal') || normalized === 'st' || normalized === 'smms';
    return normalized.includes('trd') || normalized.includes('traction') || normalized === 'tdms';
  };
  return blocks.map((block) => ({
    ...block,
    // Global blocks remain visible for section track awareness. Only the
    // user's own source-system jurisdiction is writable.
    readOnly: !blockBelongsToRole(block.department),
  }));
}