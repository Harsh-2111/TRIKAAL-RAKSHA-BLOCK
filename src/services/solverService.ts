import { supabase } from '../lib/supabase';

const SOLVER_API_URL = (() => {
  try {
    return ((import.meta as any).env && (import.meta as any).env.VITE_SOLVER_API_URL) || 'http://localhost:8000';
  } catch {
    return 'http://localhost:8000';
  }
})();

const SAFETY_BUFFER_MINUTES = 15;

export interface SolverDefect {
  defect_id: string;
  section: string;
  department: string;
  calculated_risk_score: number;
  required_duration_mins: number;
}

export interface SolverTimeWindow {
  section: string;
  start_time_hhmm: string;
  end_time_hhmm: string;
  train_no?: string;
  train_name?: string;
}

export interface SectionCapacityLimit {
  max_daily_block_mins: number;
  tracks_count: number;
}

export interface SolverInputPayload {
  defects: SolverDefect[];
  available_time_windows: SolverTimeWindow[];
  section_capacity_limits: Record<string, SectionCapacityLimit>;
  premium_train_windows?: SolverTimeWindow[];
  penalty_weights?: {
    train_detention?: number;
    capacity_loss?: number;
  };
}

export interface ScheduleBlock {
  defect_id: string;
  section: string;
  department: string;
  start_time_hhmm: string;
  end_time_hhmm: string;
  duration_mins: number;
  priority_rank: number;
}

export interface OptimizedScheduleResponse {
  schedule_blocks: ScheduleBlock[];
  total_risk_reduced: number;
  estimated_train_delay_mins: number;
  solver_status: string;
  execution_time_ms: number;
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function toTime(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

function localGreedySchedule(payload: SolverInputPayload): OptimizedScheduleResponse {
  const started = performance.now();
  const premiumWindows = payload.premium_train_windows || [];
  const availableWindows = payload.available_time_windows.length > 0
    ? payload.available_time_windows
    : Object.keys(payload.section_capacity_limits).map((section) => ({
        section,
        start_time_hhmm: '00:00',
        end_time_hhmm: '24:00',
      }));
  const usedBlocks: ScheduleBlock[] = [];
  const usedMinutes: Record<string, number> = {};
  const rankedDefects = [...payload.defects].sort(
    (left, right) => right.calculated_risk_score - left.calculated_risk_score
  );

  rankedDefects.forEach((defect, index) => {
    const sectionWindows = availableWindows.filter((window) => window.section === defect.section);
    const capacity = payload.section_capacity_limits[defect.section];
    if (!capacity) return;

    for (const window of sectionWindows) {
      const windowStart = toMinutes(window.start_time_hhmm);
      const windowEnd = toMinutes(window.end_time_hhmm);
      for (let start = windowStart; start + defect.required_duration_mins <= windowEnd; start += SAFETY_BUFFER_MINUTES) {
        const end = start + defect.required_duration_mins;
        if ((usedMinutes[defect.section] || 0) + defect.required_duration_mins > capacity.max_daily_block_mins) break;

        const sectionBlocks = usedBlocks.filter((block) => block.section === defect.section);
        const hasSafetyConflict = sectionBlocks.some((block) => {
          const blockStart = toMinutes(block.start_time_hhmm);
          const blockEnd = toMinutes(block.end_time_hhmm);
          return start < blockEnd + SAFETY_BUFFER_MINUTES && end + SAFETY_BUFFER_MINUTES > blockStart;
        });
        const hitsPremiumWindow = premiumWindows
          .filter((premium) => premium.section === defect.section)
          .some((premium) => overlaps(start, end, toMinutes(premium.start_time_hhmm), toMinutes(premium.end_time_hhmm)));
        if (hasSafetyConflict || hitsPremiumWindow) continue;

        usedBlocks.push({
          defect_id: defect.defect_id,
          section: defect.section,
          department: defect.department,
          start_time_hhmm: toTime(start),
          end_time_hhmm: toTime(end),
          duration_mins: defect.required_duration_mins,
          priority_rank: index + 1,
        });
        usedMinutes[defect.section] = (usedMinutes[defect.section] || 0) + defect.required_duration_mins;
        break;
      }
      if (usedBlocks.some((block) => block.defect_id === defect.defect_id)) break;
    }
  });

  const scheduledIds = new Set(usedBlocks.map((block) => block.defect_id));
  const totalRisk = payload.defects
    .filter((defect) => scheduledIds.has(defect.defect_id))
    .reduce((total, defect) => total + defect.calculated_risk_score * defect.required_duration_mins, 0);
  return {
    schedule_blocks: usedBlocks.sort((left, right) => toMinutes(left.start_time_hhmm) - toMinutes(right.start_time_hhmm)),
    total_risk_reduced: Number(totalRisk.toFixed(2)),
    estimated_train_delay_mins: 0,
    solver_status: 'FEASIBLE_HEURISTIC',
    execution_time_ms: Number((performance.now() - started).toFixed(2)),
  };
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${SOLVER_API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Solver API returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function runOptimization(payload: SolverInputPayload): Promise<OptimizedScheduleResponse> {
  try {
    return await postJson<OptimizedScheduleResponse>('/solver/optimize', payload);
  } catch (error) {
    console.warn('CP-SAT backend unavailable; using local greedy scheduling fallback.', error);
    return localGreedySchedule(payload);
  }
}

export async function simulateConflict(blocks: ScheduleBlock[]): Promise<any> {
  try {
    return await postJson<any>('/solver/simulate-conflict', { maintenance_blocks: blocks });
  } catch (error) {
    console.warn('Conflict simulation backend unavailable; using local overlap check.', error);
    const violations = blocks
      .map((block, index) => ({ block, index }))
      .flatMap(({ block, index }) => blocks.slice(index + 1).flatMap((other) => {
        if (block.section !== other.section) return [];
        const gap = toMinutes(other.start_time_hhmm) - toMinutes(block.end_time_hhmm);
        if (gap >= SAFETY_BUFFER_MINUTES) return [];
        return [{ type: 'SAFETY_BUFFER_VIOLATION', section: block.section, defect_ids: [block.defect_id, other.defect_id] }];
      }));
    return { has_conflicts: violations.length > 0, estimated_train_delay_mins: 0, constraint_violations: violations };
  }
}

export async function saveScheduleToSupabase(schedule: ScheduleBlock[]): Promise<boolean> {
  if (schedule.length === 0) return true;
  try {
    const { error } = await supabase.from('maintenance_schedules').upsert(
      schedule.map((block) => ({
        defect_id: block.defect_id,
        section: block.section,
        department: block.department,
        start_time_hhmm: block.start_time_hhmm,
        end_time_hhmm: block.end_time_hhmm,
        duration_mins: block.duration_mins,
        priority_rank: block.priority_rank,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'defect_id' }
    );
    if (error) {
      console.warn('Could not persist maintenance schedule:', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('Maintenance schedule persistence unavailable:', error);
    return false;
  }
}