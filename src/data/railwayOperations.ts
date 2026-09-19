import corridorCapacityCsv from '../../data/synthetic/corridor_capacity.csv?raw';
import sectionTimetableCsv from '../../data/synthetic/section_timetable.csv?raw';
import trainsMasterCsv from '../../data/synthetic/trains_master.csv?raw';
import defectsCsv from '../../data/synthetic/defects.csv?raw';
import { BlockRequest, RailwayZoneCode } from '../types';

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
  sectionId: string;
  sectionName: string;
  zoneCode: RailwayZoneCode;
  divisionName: string;
  divisionCode: string;
  kmStart: string;
  kmEnd: string;
  totalTracks: number;
  lineType: string;
  dailyTrainCount: number;
  capacityHoursUsed: number;
  maxCapacityHours: number;
  criticalityTier: string;
  maxHourlyCapacity: number;
}

const DIVISION_NAMES: Record<string, string> = {
  DLI: 'Delhi Division', MMCT: 'Mumbai Central Division', BRC: 'Vadodara Division', ADI: 'Ahmedabad Division',
  RTM: 'Ratlam Division', BB: 'Mumbai Division', PA: 'Pune Division', NGP: 'Nagpur Division', BSL: 'Bhusaval Division',
  SDAH: 'Sealdah Division', HWH: 'Howrah Division', ASN: 'Asansol Division', MLDT: 'Malda Division', MAS: 'Chennai Division', TPJ: 'Tiruchchirappalli Division',
};

export const extractZoneCode = (selectedZone = ''): RailwayZoneCode => {
  const normalized = selectedZone.trim().toUpperCase();
  if (!normalized || normalized === 'ALL' || normalized === 'PAN-INDIA' || normalized.includes('PAN-INDIA')) return 'ALL';
  const match = normalized.match(/\b(NR|WR|CR|ER|SR)\b/);
  if (match) return match[1] as RailwayZoneCode;
  if (normalized.includes('NORTHERN')) return 'NR';
  if (normalized.includes('WESTERN')) return 'WR';
  if (normalized.includes('CENTRAL')) return 'CR';
  if (normalized.includes('EASTERN')) return 'ER';
  if (normalized.includes('SOUTHERN')) return 'SR';
  return 'ALL';
};

const corridorMetadata = (row: Record<string, string>) => {
  const zoneCode = extractZoneCode(row.zone);
  const divisionCode = row.division || '';
  return {
    zoneCode,
    divisionCode,
    divisionName: DIVISION_NAMES[divisionCode] || (divisionCode ? `${divisionCode} Division` : 'Indian Railways'),
    kmStart: row.km_start || '0',
    kmEnd: row.km_end || '0',
  };
};

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

export const resolveRequestZoneCode = (
  request?: Pick<BlockRequest, 'zoneCode' | 'zone' | 'division' | 'section'> | null,
): RailwayZoneCode => {
  const zoneCode = request?.zoneCode?.toUpperCase();
  if (zoneCode === 'NR' || zoneCode === 'WR' || zoneCode === 'CR' || zoneCode === 'ER' || zoneCode === 'SR') {
    return zoneCode;
  }

  const zoneText = request?.zone || request?.division || request?.section || '';
  const normalized = zoneText.toUpperCase();

  if (normalized.includes('WESTERN') || normalized.includes('WR') || normalized.includes('MMCT')) return 'WR';
  if (normalized.includes('CENTRAL') || normalized.includes('CR') || normalized.includes('PA')) return 'CR';
  if (normalized.includes('EASTERN') || normalized.includes('ER') || normalized.includes('SDAH')) return 'ER';
  if (normalized.includes('SOUTHERN') || normalized.includes('SR') || normalized.includes('MAS')) return 'SR';
  if (normalized.includes('NORTHERN') || normalized.includes('NR') || normalized.includes('DLI') || normalized.includes('GZB') || normalized.includes('NDLS')) return 'NR';

  return 'ALL';
};

export const matchesZoneScope = (
  request: Pick<BlockRequest, 'zoneCode' | 'zone' | 'division' | 'section'>,
  activeZone: RailwayZoneCode = 'ALL',
): boolean => {
  if (!activeZone || activeZone === 'ALL') return true;
  return resolveRequestZoneCode(request) === activeZone;
};

export const filterRequestsByZone = <T extends Pick<BlockRequest, 'zoneCode' | 'zone' | 'division' | 'section'>>(
  requests: T[],
  activeZone: RailwayZoneCode = 'ALL',
): T[] => {
  if (!activeZone || activeZone === 'ALL') return requests;
  return requests.filter((request) => matchesZoneScope(request, activeZone));
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
  section: row.section_id || row.section,
  sectionId: row.section_id || normalizeRailwaySection(row.section),
  sectionName: row.section_name || row.section_id || row.section,
  ...corridorMetadata(row),
  totalTracks: Number(row.total_tracks || (row.line_type === 'QUADRUPLE' ? 4 : row.line_type === 'TRIPLE' ? 3 : row.line_type === 'SINGLE' ? 1 : 2)),
  lineType: row.line_type || 'Unknown',
  dailyTrainCount: Number(row.daily_train_count || 0),
  capacityHoursUsed: Number(row.capacity_hours_used || 0),
  maxCapacityHours: Number(row.max_capacity_hours || 0),
  criticalityTier: row.criticality_tier || (Number(row.capacity_hours_used || 0) >= 20 ? 'Tier-1 (High Utilization)' : 'Unclassified'),
  maxHourlyCapacity: Number(row.max_capacity_hours || row.max_hourly_capacity || 0),
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
  if (!section || extractZoneCode(section) !== 'ALL' && ['NR', 'WR', 'CR', 'ER', 'SR'].includes(extractZoneCode(section))) {
    const zone = extractZoneCode(section);
    if (zone === 'ALL' && !section) return SECTION_TIMETABLE;
    return SECTION_TIMETABLE.filter((entry) => getCorridorZoneCode(entry.section) === zone);
  }
  const normalized = normalizeRailwaySection(section);
  return SECTION_TIMETABLE.filter((entry) => normalizeRailwaySection(entry.section) === normalized);
}

export function getCorridorCapacity(section?: string): CorridorCapacityRecord[] {
  const zone = extractZoneCode(section);
  if (!section || zone !== 'ALL') return zone === 'ALL' ? CORRIDOR_CAPACITY : CORRIDOR_CAPACITY.filter((entry) => entry.zoneCode === zone);
  const normalized = normalizeRailwaySection(section);
  return CORRIDOR_CAPACITY.filter((entry) => (
    entry.sectionId === normalized ||
    normalizeRailwaySection(entry.section) === normalized ||
    normalizeRailwaySection(entry.sectionName) === normalized
  ));
}

const getCorridorZoneCode = (section: string): RailwayZoneCode => {
  const normalized = normalizeRailwaySection(section);
  return CORRIDOR_CAPACITY.find((corridor) => normalizeRailwaySection(corridor.sectionId) === normalized)?.zoneCode || 'ALL';
};

export function getDefects(selectedZone?: string): DefectRecord[] {
  const zone = extractZoneCode(selectedZone);
  if (zone === 'ALL') return DEFECTS;
  return DEFECTS.filter((defect) => getCorridorZoneCode(defect.section) === zone);
}

export function getRequisitions<T extends Pick<BlockRequest, 'zoneCode' | 'zone' | 'division' | 'section'>>(
  requisitions: T[],
  selectedZone?: string,
): T[] {
  const zone = extractZoneCode(selectedZone);
  return zone === 'ALL' ? requisitions : requisitions.filter((request) => resolveRequestZoneCode(request) === zone);
}

const TRAIN_BY_NUMBER = new Map(TRAIN_MASTER.map((train) => [train.trainNumber, train]));

const capacityBySection = new Map<string, CorridorCapacityRecord>();
capacityRows.forEach((row) => {
  const sectionId = row.section_id || row.section;
  const metadata = corridorMetadata(row);
  capacityBySection.set(normalizeRailwaySection(sectionId), {
    section: sectionId,
    sectionId,
    sectionName: row.section_name || sectionId,
    ...metadata,
    totalTracks: Number(row.total_tracks || (row.line_type === 'QUADRUPLE' ? 4 : row.line_type === 'TRIPLE' ? 3 : row.line_type === 'SINGLE' ? 1 : 2)),
    lineType: row.line_type || 'Unknown',
    dailyTrainCount: Number(row.daily_train_count || 0),
    capacityHoursUsed: Number(row.capacity_hours_used || 0),
    maxCapacityHours: Number(row.max_capacity_hours || 0),
    criticalityTier: row.criticality_tier || 'Unclassified',
    maxHourlyCapacity: Number(row.max_capacity_hours || row.max_hourly_capacity || 0),
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
  const normalizedSection = normalizeRailwaySection(request.section);
  const capacity = capacityBySection.get(normalizedSection) || Array.from(capacityBySection.values()).find((entry) => normalizeRailwaySection(entry.sectionName) === normalizedSection);
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
