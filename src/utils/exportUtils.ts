import { BlockRequest } from '../types';
import { DEPARTMENT_CONFIG } from '../data/mockData';

/**
 * Cleanly escapes a string value for standard RFC 4180 CSV compliance
 */
function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exports a list of BlockRequest objects as a downloadable CSV / Excel file
 */
export function exportRequestsToCsv(
  requests: BlockRequest[],
  customFilename?: string
): { success: boolean; count: number; filename: string } {
  if (!requests || requests.length === 0) {
    return { success: false, count: 0, filename: '' };
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultFilename = `RAKSHA_BLOCK_Approved_Roster_${dateStr}.csv`;
  const filename = customFilename || defaultFilename;

  // CSV Columns required by Phase 5
  const headers = [
    'Sl. No.',
    'Request ID',
    'Department',
    'Section / Line',
    'Block Type',
    'Start Time',
    'End Time',
    'Duration (Hrs)',
    'Urgency',
    'Status',
    'AI Bundling Tag',
    'KM Range',
    'Machinery & Equipment',
    'Caution Orders / Remarks'
  ];

  const rows = requests.map((req, index) => {
    const deptName = DEPARTMENT_CONFIG[req.department]?.name || req.department;
    const blockType = req.blockType || req.workCategory || 'Maintenance';
    const startTime = req.approvedStartTime || req.requestedStartTime || 'N/A';
    const endTime = req.approvedEndTime || req.requestedEndTime || 'N/A';
    
    // Duration in hours
    const durationMins = req.approvedDurationMinutes || req.durationMinutes || 0;
    const durationHrs = (durationMins / 60).toFixed(2);

    const urgency = req.urgencyLevel || (req.priority === 'SAFETY_CRITICAL' ? 'Critical Emergency' : req.priority === 'URGENT' ? 'Priority' : 'Routine');
    const kmRange = `KM ${req.startKm} - ${req.endKm}`;
    
    const machinery = [
      ...(req.machineryDeployed || []),
      ...(req.machineryText ? [req.machineryText] : [])
    ].join('; ') || 'Manual Maintenance Gang';

    const aiTag = req.aiOptimized ? req.aiBundleId || 'AI Bundled' : 'Standalone';
    const remarks = [
      req.cautionOrderDetails ? `Caution: ${req.cautionOrderDetails}` : '',
      req.controllerRemarks ? `Remarks: ${req.controllerRemarks}` : ''
    ].filter(Boolean).join(' | ') || 'Standard Railway Operating Rules Apply';

    return [
      escapeCsvCell(index + 1),
      escapeCsvCell(req.id),
      escapeCsvCell(deptName),
      escapeCsvCell(`${req.section} (${req.lineType})`),
      escapeCsvCell(blockType),
      escapeCsvCell(startTime),
      escapeCsvCell(endTime),
      escapeCsvCell(durationHrs),
      escapeCsvCell(urgency),
      escapeCsvCell(req.status),
      escapeCsvCell(aiTag),
      escapeCsvCell(kmRange),
      escapeCsvCell(machinery),
      escapeCsvCell(remarks)
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, count: requests.length, filename };
}
