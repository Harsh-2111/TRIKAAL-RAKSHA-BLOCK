export interface TrainCatalogEntry {
  id: string;
  name: string;
  type: 'Passenger' | 'Freight';
}

export interface SectionTimetableEntry {
  trainId: string;
  section: string;
  arrTime: string;
  depTime: string;
}

export const TRAIN_CATALOG: TrainCatalogEntry[] = [
  { id: '04284', name: 'Express Passenger 001', type: 'Passenger' },
  { id: '12094', name: 'Superfast Express 002', type: 'Passenger' },
  { id: '04300', name: 'Rajdhani Express 003', type: 'Passenger' },
  { id: '12875', name: 'Superfast Express 004', type: 'Passenger' },
  { id: '22363', name: 'Shatabdi Express 005', type: 'Passenger' },
  { id: '22276', name: 'Express Passenger 006', type: 'Passenger' },
  { id: '12216', name: 'Superfast Express 007', type: 'Passenger' },
  { id: '04269', name: 'Goods Freight 008', type: 'Freight' },
  { id: '12156', name: 'Rajdhani Express 009', type: 'Passenger' },
  { id: '04738', name: 'Rajdhani Express 010', type: 'Passenger' },
  { id: '12976', name: 'Express Passenger 011', type: 'Passenger' },
  { id: '12382', name: 'Superfast Express 012', type: 'Passenger' },
];

export const SECTION_TIMETABLE: SectionTimetableEntry[] = [
  { trainId: '04284', section: 'DLI-DEC', arrTime: '21:45', depTime: '21:53' },
  { trainId: '04284', section: 'DEC-GGN', arrTime: '22:51', depTime: '22:58' },
  { trainId: '12094', section: 'GZB-MTC', arrTime: '19:00', depTime: '19:05' },
  { trainId: '12094', section: 'GZB-ALJN', arrTime: '19:55', depTime: '20:01' },
  { trainId: '04300', section: 'GZB-MTC', arrTime: '14:40', depTime: '14:43' },
  { trainId: '04300', section: 'GZB-ALJN', arrTime: '15:38', depTime: '15:41' },
  { trainId: '12875', section: 'DLI-DEC', arrTime: '03:35', depTime: '03:38' },
  { trainId: '12875', section: 'DEC-GGN', arrTime: '04:12', depTime: '04:17' },
  { trainId: '22363', section: 'DLI-DEC', arrTime: '19:25', depTime: '19:29' },
  { trainId: '22363', section: 'DEC-GGN', arrTime: '20:27', depTime: '20:33' },
  { trainId: '22276', section: 'DLI-DEC', arrTime: '04:05', depTime: '04:11' },
  { trainId: '22276', section: 'DEC-GGN', arrTime: '05:04', depTime: '05:09' },
  { trainId: '12216', section: 'NDLS-GZB', arrTime: '01:50', depTime: '01:58' },
  { trainId: '12216', section: 'GZB-ALJN', arrTime: '02:30', depTime: '02:33' },
  { trainId: '04269', section: 'DLI-DEC', arrTime: '07:00', depTime: '07:08' },
  { trainId: '04269', section: 'DEC-GGN', arrTime: '07:48', depTime: '07:55' },
  { trainId: '12156', section: 'NDLS-PWL', arrTime: '14:05', depTime: '14:12' },
  { trainId: '04738', section: 'NDLS-PWL', arrTime: '07:50', depTime: '07:54' },
  { trainId: '12976', section: 'NDLS-GZB', arrTime: '19:10', depTime: '19:17' },
  { trainId: '12382', section: 'NDLS-GZB', arrTime: '08:45', depTime: '08:50' },
];

const normalizeSection = (value: string): string => value.toLowerCase().replace(/section/g, '').replace(/[^a-z0-9]/g, '');
const toMinutes = (value: string): number => {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

export interface AffectedTrain {
  id: string;
  name: string;
  type: 'Passenger' | 'Freight';
  delayMins: number;
  arrTime: string;
  depTime: string;
}

export function getAffectedTrains(section = '', durationMinutes = 0): AffectedTrain[] {
  const normalizedSection = normalizeSection(section);
  const blockDelay = Math.max(1, Math.round(Math.max(0, durationMinutes) / 60 * 12));
  const catalog = new Map(TRAIN_CATALOG.map((train) => [train.id, train]));

  return SECTION_TIMETABLE
    .filter((entry) => {
      const timetableSection = normalizeSection(entry.section);
      return normalizedSection && (timetableSection === normalizedSection || timetableSection.includes(normalizedSection) || normalizedSection.includes(timetableSection));
    })
    .map((entry) => {
      const train = catalog.get(entry.trainId);
      if (!train) return null;
      const scheduledMinutes = Math.max(1, toMinutes(entry.depTime) - toMinutes(entry.arrTime));
      return {
        ...train,
        delayMins: train.type === 'Freight' ? Math.max(1, Math.round(blockDelay * 25 / 12)) : Math.max(blockDelay, scheduledMinutes),
        arrTime: entry.arrTime,
        depTime: entry.depTime,
      };
    })
    .filter((train): train is AffectedTrain => Boolean(train));
}
