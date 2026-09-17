import { BlockRequest, Department, SolverOptimizationResult, UrgencyLevel } from '../types';

// Helper: Convert time HH:mm to minutes from midnight
export const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Helper: Convert minutes from midnight to HH:mm
export const minutesToTime = (mins: number): string => {
  const norm = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Normalize section strings for clustering
export const normalizeSectionKey = (sec: string): string => {
  return (sec || '')
    .toLowerCase()
    .replace(/section/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

// Check if two time windows overlap or are within a 45-minute adjacency margin
export const areWindowsCompatible = (
  startA: number,
  endA: number,
  startB: number,
  endB: number,
  adjacencyMarginMins = 45
): boolean => {
  // Handle overnight windows crossing midnight
  let eA = endA;
  if (eA <= startA) eA += 1440;

  let eB = endB;
  if (eB <= startB) eB += 1440;

  // Direct overlap
  const overlaps = Math.max(startA, startB) < Math.min(eA, eB);
  if (overlaps) return true;

  // Adjacent within margin (e.g. finishing within 45 mins)
  const dist = Math.max(0, Math.max(startA, startB) - Math.min(eA, eB));
  return dist <= adjacencyMarginMins;
};

// Calculate priority score (0 - 100)
export const calculatePriorityScore = (reqs: BlockRequest[]): { score: number; highestUrgency: UrgencyLevel } => {
  let highestUrgency: UrgencyLevel = 'Routine';
  let baseScore = 40;

  for (const r of reqs) {
    if (r.urgencyLevel === 'Critical Emergency' || r.priority === 'SAFETY_CRITICAL') {
      highestUrgency = 'Critical Emergency';
      baseScore = Math.max(baseScore, 95);
    } else if (r.urgencyLevel === 'Priority' || r.priority === 'URGENT') {
      if (highestUrgency !== 'Critical Emergency') {
        highestUrgency = 'Priority';
      }
      baseScore = Math.max(baseScore, 75);
    }
  }

  // Bonus for multi-department synergy
  const deptSet = new Set(reqs.map((r) => r.department));
  const multiDeptBonus = (deptSet.size - 1) * 8; // e.g. +16 for 3 departments

  return {
    score: Math.min(100, baseScore + multiDeptBonus),
    highestUrgency,
  };
};

// Generate operational justification for bundled corridor
export const generateAiJustification = (reqs: BlockRequest[], depts: Department[]): string => {
  const hasEng = depts.includes('ENGINEERING');
  const hasST = depts.includes('ST');
  const hasTRD = depts.includes('TRD');

  const workDescSample = reqs.map((r) => r.workCategory || r.blockType).join(' + ');

  if (hasEng && hasST && hasTRD) {
    return `Tri-Department Integrated Mega Block: Synchronized P-Way track packing, S&T point machine overhaul, and 25kV OHE de-energized insulator washing during a single coordinated traffic & power block window. Eliminates 3 separate track possessions and passenger train delays.`;
  }
  if (hasEng && hasTRD) {
    return `Coordinated P-Way & 25kV Traction Window: Heavy track machinery deployment bundled under scheduled OHE power shutdown. Allows simultaneous rail maintenance and catenary contact wire inspection without redundant section blocks.`;
  }
  if (hasEng && hasST) {
    return `Joint Permanent Way & Signalling Corridor: Point machine testing and track circuit insulation calibrated concurrently during track tamping/turnout alignment. Prevents signal failure re-inspections.`;
  }
  if (hasST && hasTRD) {
    return `Combined S&T & Overhead Traction Maintenance: Simultaneous signal cable trench verification and substation feeder maintenance under common line block.`;
  }
  return `Synchronized Multi-Team Block: Bundled multiple ${depts.join(
    ' & '
  )} maintenance activities (${workDescSample}) into a unified window, maximizing sectional train path throughput.`;
};

/**
 * CP-SAT SOLVER & TASK BUNDLING ENGINE
 * Simulates constraint programming formulation:
 * - Decision Variables: Start/End time bounds for each bundle
 * - Constraints: Spatial containment (same section & line), machinery safety clearance, power block isolation
 * - Objective Function: Maximize (sum(individual durations) - bundled duration) and eliminate section conflicts
 */
export const runCpSatSolver = async (requests: BlockRequest[]): Promise<SolverOptimizationResult> => {
  const activePending = requests.filter((request) => request.status.toUpperCase() === 'PENDING');
  const payload = activePending.map((request) => ({
    id: request.id,
    department: request.department.toUpperCase(),
    section: request.section.trim().toUpperCase(),
    date: request.requestedDate,
    start_time: request.requestedStartTime,
    duration_mins: request.durationMinutes,
  }));

  const response = await fetch('http://localhost:8000/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: payload }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`CP-SAT service failed (${response.status}): ${message || response.statusText}`);
  }

  const result = (await response.json()) as SolverOptimizationResult;
  if (!result || typeof result !== 'object') {
    throw new Error('Solver API returned an invalid response.');
  }

  const originalById = new Map(activePending.map((request) => [request.id, request]));
  return {
    ...result,
    bundledWindows: result.bundledWindows.map((bundle) => ({
      ...bundle,
      requests: bundle.requests.map((request) => ({
        ...request,
        ...(originalById.get(request.id) || {}),
      })),
    })),
    standaloneApproved: result.standaloneApproved.map((request) => ({
      ...request,
      ...(originalById.get(request.id) || {}),
    })),
  };

};
