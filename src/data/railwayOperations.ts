import corridorCapacityCsv from '../../data/synthetic/corridor_capacity.csv?raw';
import sectionTimetableCsv from '../../data/synthetic/section_timetable.csv?raw';
import trainsMasterCsv from '../../data/synthetic/trains_master.csv?raw';
import defectsCsv from '../../data/synthetic/defects.csv?raw';
import { BlockRequest } from '../types';

export interface TrainMasterRecord {
  trainNumber: string;
  trainName: string;
  type: string;
  source: string;
  destination: string;
  priorityClass: string;
  daysOfRun: string;
  punctualityPct: number;
  averagePassengers: number;
}

export interface SectionTimetableRecord {
  trainNumber: string;
  section: string;
  arrivalTime: string;
  departureTime: string;
  direction: string;
  days: string;
}

export interface CorridorCapacityRecord {
  section: string;
  totalTracks: number;
  lineType: string;
  dailyTrainCount: number;
  criticalityTier: string;
  maxHourlyCapacity: number;
}

export interface DefectRecord {
  defectId: string;
  sourceSystem: string;
  department: string;
  section: string;
  severity: number;
  daysOverdue: number;
  assetAgeYears: number;
  pastFailureCount: number;
  deferredCount: number;
  calculatedRiskScore: number;
}

export interface DefectAutofill {
  department: 'ENGINEERING' | 'ST' | 'TRD';
  sectionId: string;
  kmStart: string;
  kmEnd: string;
  location: string;
  defectType: string;
  urgencyLevel: 'Routine' | 'Priority' | 'Critical Emergency';
}

export interface AffectedTrain {
  id: string;
  name: string;
  type: 'Passenger' | 'Freight';
  delayMins: number;
  arrTime: string;
  depTime: string;
}

export interface AffectedTrainMovement extends TrainMasterRecord {
  scheduledSectionTime: string;
  direction: string;
  delayMinutes: number;
  mitigation: string;
}

export interface SectionCapacitySummary {
  section: string;
  totalTracks: number;
  lineType: string;
  dailyTrainCount: number;
  affectedTrainCount: number;
  maxHourlyCapacity: number;
  utilizationPercent: number;
  safetyMarginPercent: number;
  safetyStatus: 'WITHIN ENVELOPE' | 'NARROW MARGIN' | 'CAPACITY EXCEEDED' | 'NO CAPACITY DATA';
  criticalityTier: string;
}

const parseCsv = (csv: string): Record<string, string>[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const next = csv[index + 1];
    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (cell || row.length > 0) {
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
};

export const normalizeRailwaySection = (value: string): string => {
  const normalized = (value || '').toUpperCase().replace(/SECTION/g, '').replace(/[^A-Z0-9]/g, '');
  const aliases: Record<string, string> = {
    PANIPATAMBALA: 'PNPUMB',
    PANIPATAMBALASECTION: 'PNPUMB',
    VAPISURAT: 'VAPIST',
    VAPISURATSECTION: 'VAPIST',
  };
  return aliases[normalized] || normalized;
};

const splitSection = (section: string): [string, string] => {
  const parts = section.toUpperCase().split('-').map((part) => part.trim()).filter(Boolean);
  return [parts[0] || section, parts[parts.length - 1] || section];
};

const toMinutes = (value: string): number => {
  const [hours, minutes] = (value || '').split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const intervalOverlaps = (startA: number, endA: number, startB: number, endB: number): boolean => {
  const adjustedEndA = endA <= startA ? endA + 1440 : endA;
  const adjustedEndB = endB <= startB ? endB + 1440 : endB;
  return Math.max(startA, startB) < Math.min(adjustedEndA, adjustedEndB);
};

const trainRows = parseCsv(trainsMasterCsv);
const timetableRows = parseCsv(sectionTimetableCsv);
const capacityRows = parseCsv(corridorCapacityCsv);
const defectRows = parseCsv(defectsCsv);

const timetableByTrain = new Map<string, SectionTimetableRecord[]>();
timetableRows.forEach((row) => {
  const record: SectionTimetableRecord = {
    trainNumber: row.train_no || row.train_number,
    section: row.section,
    arrivalTime: row.arr_time,
    departureTime: row.dep_time,
    direction: row.direction,
    days: row.days,
  };
  const records = timetableByTrain.get(record.trainNumber) || [];
  records.push(record);
  timetableByTrain.set(record.trainNumber, records);
});

export const TRAIN_MASTER: TrainMasterRecord[] = trainRows.map((row) => {
  const routeSections = (timetableByTrain.get(row.train_no || row.train_number) || []).map((entry) => entry.section);
  const [derivedSource] = splitSection(routeSections[0] || 'Unknown');
  const [, derivedDestination] = splitSection(routeSections[routeSections.length - 1] || 'Unknown');
  return {
    trainNumber: row.train_no || row.train_number,
    trainName: row.train_name,
    type: row.type || 'Passenger',
    source: row.source || derivedSource,
    destination: row.destination || derivedDestination,
    priorityClass: row.priority_class || 'Unclassified',
    daysOfRun: row.days_of_run,
    punctualityPct: Number(row.punctuality_pct || 0),
    averagePassengers: Number(row.avg_passengers || 0),
  };
});

export const SECTION_TIMETABLE: SectionTimetableRecord[] = timetableRows.map((row) => ({
  trainNumber: row.train_no || row.train_number,
  section: row.section,
  arrivalTime: row.arr_time,
  departureTime: row.dep_time,
  direction: row.direction,
  days: row.days,
}));

export const CORRIDOR_CAPACITY: CorridorCapacityRecord[] = capacityRows.map((row) => ({
  section: row.section,
  totalTracks: Number(row.total_tracks || 0),
  lineType: row.line_type || 'Unknown',
  dailyTrainCount: Number(row.daily_train_count || 0),
  criticalityTier: row.criticality_tier || 'Unclassified',
  maxHourlyCapacity: Number(row.max_hourly_capacity || 0),
}));

export const DEFECTS: DefectRecord[] = defectRows.map((row) => ({
  defectId: row.defect_id,
  sourceSystem: row.source_system,
  department: row.department,
  section: row.section,
  severity: Number(row.severity || 0),
  daysOverdue: Number(row.days_overdue || 0),
  assetAgeYears: Number(row.asset_age_years || 0),
  pastFailureCount: Number(row.past_failure_count || 0),
  deferredCount: Number(row.deferred_count || 0),
  calculatedRiskScore: Number(row.calculated_risk_score || 0),
}));

const defectCategories = {
  ENGINEERING: ['Geometry fault', 'Rail fracture', 'Sleeper defect'],
  ST: ['Interlocking failure', 'Track circuit fault', 'Signal gantry issue'],
  TRD: ['OHE cable sagging', 'Insulator flashover', 'Power supply sectioning gap'],
} as const;

export function getDefectAutofill(defect: DefectRecord, department: 'ENGINEERING' | 'ST' | 'TRD'): DefectAutofill {
  const category = defectCategories[department][defect.severity % defectCategories[department].length];
  const urgencyLevel = defect.severity >= 4 || defect.calculatedRiskScore >= 80
    ? 'Critical Emergency'
    : defect.severity >= 3 || defect.calculatedRiskScore >= 60
    ? 'Priority'
    : 'Routine';

  return {
    department,
    sectionId: defect.section,
    kmStart: 'KM 00/00',
    kmEnd: 'KM 00/00',
    location: `${defect.section} corridor - ${category}`,
    defectType: category,
    urgencyLevel,
  };
}

export function getSectionTimetable(section?: string): SectionTimetableRecord[] {
  if (!section) return SECTION_TIMETABLE;
  const normalized = normalizeRailwaySection(section);
  return SECTION_TIMETABLE.filter((entry) => normalizeRailwaySection(entry.section) === normalized);
}

export function getCorridorCapacity(section?: string): CorridorCapacityRecord[] {
  if (!section) return CORRIDOR_CAPACITY;
  const normalized = normalizeRailwaySection(section);
  return CORRIDOR_CAPACITY.filter((entry) => normalizeRailwaySection(entry.section) === normalized);
}

const TRAIN_BY_NUMBER = new Map(TRAIN_MASTER.map((train) => [train.trainNumber, train]));

const capacityBySection = new Map<string, CorridorCapacityRecord>();
capacityRows.forEach((row) => {
  capacityBySection.set(normalizeRailwaySection(row.section), {
    section: row.section,
    totalTracks: Number(row.total_tracks || 0),
    lineType: row.line_type || 'Unknown',
    dailyTrainCount: Number(row.daily_train_count || 0),
    criticalityTier: row.criticality_tier || 'Unclassified',
    maxHourlyCapacity: Number(row.max_hourly_capacity || 0),
  });
});

const mitigationFor = (type: string, direction: string): string => {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes('freight') || normalizedType.includes('goods')) return 'Held at loop until section clears';
  if (direction.toUpperCase() === 'DOWN') return 'Regulated at previous station';
  return 'Rerouted via Up Loop';
};

export function getAffectedTrains(section = '', durationMinutes = 0): AffectedTrain[] {
  const blockDelay = Math.max(1, Math.round(Math.max(0, durationMinutes) / 60 * 12));
  const normalizedSection = normalizeRailwaySection(section);

  return SECTION_TIMETABLE
    .filter((entry) => !normalizedSection || normalizeRailwaySection(entry.section) === normalizedSection)
    .map((entry) => {
      const train = TRAIN_BY_NUMBER.get(entry.trainNumber);
      if (!train) return null;
      const isFreight = train.type.toLowerCase().includes('freight') || train.type.toLowerCase().includes('goods');
      return {
        id: train.trainNumber,
        name: train.trainName,
        type: isFreight ? 'Freight' : 'Passenger',
        delayMins: isFreight ? Math.max(1, Math.round(blockDelay * 25 / 12)) : blockDelay,
        arrTime: entry.arrivalTime,
        depTime: entry.departureTime,
      };
    })
    .filter((train): train is AffectedTrain => Boolean(train));
}

export function getAffectedTrainMovements(request: Pick<BlockRequest, 'section' | 'requestedStartTime' | 'requestedEndTime' | 'durationMinutes'>): AffectedTrainMovement[] {
  const requestedSection = normalizeRailwaySection(request.section);
  const blockStart = toMinutes(request.requestedStartTime);
  const blockEnd = toMinutes(request.requestedEndTime);
  const movements: AffectedTrainMovement[] = [];

  timetableRows.forEach((row) => {
    if (normalizeRailwaySection(row.section) !== requestedSection) return;
    const train = TRAIN_BY_NUMBER.get(row.train_no || row.train_number);
    if (!train) return;
    const trainStart = toMinutes(row.arr_time);
    const trainEnd = toMinutes(row.dep_time);
    if (!intervalOverlaps(blockStart, blockEnd, trainStart, trainEnd)) return;
    const delayMinutes = train.type.toLowerCase().includes('freight') || train.type.toLowerCase().includes('goods')
      ? Math.max(1, Math.round(request.durationMinutes / 60 * 25))
      : Math.max(1, Math.round(request.durationMinutes / 60 * 12));
    movements.push({
      ...train,
      scheduledSectionTime: `${row.arr_time} - ${row.dep_time}`,
      direction: row.direction,
      delayMinutes,
      mitigation: mitigationFor(train.type, row.direction),
    });
  });

  return movements.sort(
    (left, right) => toMinutes(left.scheduledSectionTime.split(' - ')[0]) - toMinutes(right.scheduledSectionTime.split(' - ')[0]),
  );
}

export function getSectionCapacitySummary(
  request: Pick<BlockRequest, 'section' | 'requestedStartTime' | 'requestedEndTime' | 'durationMinutes'>,
  affectedTrainCount: number,
): SectionCapacitySummary {
  const capacity = capacityBySection.get(normalizeRailwaySection(request.section));
  if (!capacity) {
    return {
      section: request.section,
      totalTracks: 0,
      lineType: 'Unknown',
      dailyTrainCount: 0,
      affectedTrainCount,
      maxHourlyCapacity: 0,
      utilizationPercent: 0,
      safetyMarginPercent: 0,
      safetyStatus: 'NO CAPACITY DATA',
      criticalityTier: 'Unclassified',
    };
  }
  const blockHours = Math.max(0, request.durationMinutes) / 60;
  const utilizationPercent = Math.min(100, Math.round((blockHours / Math.max(capacity.maxHourlyCapacity, 0.1)) * 100));
  const safetyMarginPercent = Math.max(0, 100 - utilizationPercent);
  const safetyStatus = utilizationPercent >= 100 ? 'CAPACITY EXCEEDED' : utilizationPercent >= 75 ? 'NARROW MARGIN' : 'WITHIN ENVELOPE';
  return {
    section: capacity.section,
    totalTracks: capacity.totalTracks,
    lineType: capacity.lineType,
    dailyTrainCount: capacity.dailyTrainCount,
    affectedTrainCount,
    maxHourlyCapacity: capacity.maxHourlyCapacity,
    utilizationPercent,
    safetyMarginPercent,
    safetyStatus,
    criticalityTier: capacity.criticalityTier,
  };
}
