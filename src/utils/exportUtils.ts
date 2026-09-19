import { BlockRequest } from '../types';
import { DEPARTMENT_CONFIG } from '../data/mockData';
import { calculateSectionDelays } from './delayCalculator';
import { jsPDF } from 'jspdf';

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

  const headers = [
    'Requisition ID',
    'Department',
    'Section / Location',
    'Date & Time Window',
    'Granted Duration',
    'Delays (P/F)',
    'Approval Status',
  ];

  const rows = requests.map((req, index) => {
    const deptName = DEPARTMENT_CONFIG[req.department]?.name || req.department;
    const startTime = req.approvedStartTime || req.requestedStartTime || 'N/A';
    const endTime = req.approvedEndTime || req.requestedEndTime || 'N/A';
    const durationMins = req.approvedDurationMinutes || req.durationMinutes || 0;
    const delays = calculateSectionDelays(durationMins, req.section);
    const passengerDelay = req.passengerDelayMins ?? delays.passengerDelayMins;
    const freightDelay = req.freightDelayMins ?? delays.freightDelayMins;

    return [
      escapeCsvCell(req.id),
      escapeCsvCell(deptName),
      escapeCsvCell(`${req.section} (${req.stationFrom} - ${req.stationTo})`),
      escapeCsvCell(`${req.requestedDate} ${startTime} - ${endTime}`),
      escapeCsvCell(`${durationMins} minutes`),
      escapeCsvCell(`${passengerDelay}m P | ${freightDelay}m F`),
      escapeCsvCell(req.status),
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

export function exportRequestsToOfficialPdf(
  requests: BlockRequest[],
  customFilename?: string,
): { success: boolean; count: number; filename: string } {
  if (!requests || requests.length === 0) {
    return { success: false, count: 0, filename: '' };
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `RAKSHA_BLOCK_Corridor_Report_${dateStamp}.pdf`;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const columns = [
    { label: 'Requisition ID', width: 31 },
    { label: 'Department', width: 29 },
    { label: 'Section / Location', width: 53 },
    { label: 'Date & Time Window', width: 52 },
    { label: 'Granted Duration', width: 30 },
    { label: 'Delays (P/F)', width: 29 },
    { label: 'Approval Status', width: 37 },
  ];
  const tableWidth = columns.reduce((total, column) => total + column.width, 0);
  const generatedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const drawEmblem = (x: number, y: number) => {
    pdf.setDrawColor(255, 193, 7);
    pdf.setLineWidth(0.6);
    pdf.circle(x + 7, y + 7, 6, 'S');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text('RB', x + 3.7, y + 8.5);
    pdf.setLineWidth(0.8);
    pdf.line(x + 1, y + 15, x + 13, y + 15);
    pdf.line(x + 1, y + 17, x + 13, y + 17);
  };

  const drawHeader = () => {
    pdf.setFillColor(0, 0, 117);
    pdf.rect(0, 0, pageWidth, 25, 'F');
    pdf.setFillColor(234, 88, 12);
    pdf.rect(0, 25, pageWidth, 1.5, 'F');
    drawEmblem(margin, 4);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('INDIAN RAILWAYS - TRIKAAL RAKSHA BLOCK PLATFORM', margin + 20, 10);
    pdf.setFontSize(9);
    pdf.text('OFFICIAL CORRIDOR BLOCK POSSESSION REPORT', margin + 20, 17);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text(`Generated: ${generatedAt} IST`, pageWidth - margin - 48, 10);
    pdf.text('Centralized Corridor Management', pageWidth - margin - 48, 17);
  };

  const totalPagesPlaceholder = '{total_pages_count_string}';
  const drawFooter = (pageNumber: number, totalPages: number | string) => {
    pdf.setDrawColor(30, 58, 138);
    pdf.setLineWidth(0.3);
    pdf.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(71, 85, 105);
    pdf.text('Generated via Centralized Indian Railways Corridor Management Portal', margin, pageHeight - 5);
    pdf.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin - 25, pageHeight - 5);
  };

  const rows = requests.map((request) => {
    const duration = request.approvedDurationMinutes || request.durationMinutes || 0;
    const delays = calculateSectionDelays(duration, request.section);
    return [
      request.id,
      DEPARTMENT_CONFIG[request.department]?.name || request.department,
      `${request.section}\n${request.stationFrom} - ${request.stationTo}`,
      `${request.requestedDate}\n${request.approvedStartTime || request.requestedStartTime} - ${request.approvedEndTime || request.requestedEndTime}`,
      `${duration} min`,
      `${request.passengerDelayMins ?? delays.passengerDelayMins}m P | ${request.freightDelayMins ?? delays.freightDelayMins}m F`,
      request.status,
    ];
  });

  drawHeader();
  let y = 34;
  let pageNumber = 1;
  const headerHeight = 9;
  const rowPadding = 3;
  const drawTableHeader = () => {
    let x = margin;
    pdf.setFillColor(30, 58, 138);
    pdf.setDrawColor(30, 58, 138);
    columns.forEach((column) => {
      pdf.rect(x, y, column.width, headerHeight, 'FD');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text(column.label, x + 2, y + 5.8);
      x += column.width;
    });
    y += headerHeight;
  };
  drawTableHeader();

  rows.forEach((row, rowIndex) => {
    const wrapped = row.map((value, index) => pdf.splitTextToSize(value, columns[index].width - rowPadding * 2));
    const rowHeight = Math.max(...wrapped.map((lines) => lines.length)) * 3.7 + rowPadding * 2;
    if (y + rowHeight > pageHeight - 14) {
      drawFooter(pageNumber, totalPagesPlaceholder);
      pdf.addPage();
      pageNumber += 1;
      drawHeader();
      y = 34;
      drawTableHeader();
    }
    let x = margin;
    pdf.setFillColor(rowIndex % 2 === 0 ? 248 : 239, rowIndex % 2 === 0 ? 250 : 246, rowIndex % 2 === 0 ? 252 : 255);
    wrapped.forEach((lines, index) => {
      pdf.setDrawColor(30, 58, 138);
      pdf.setLineWidth(0.2);
      pdf.rect(x, y, columns[index].width, rowHeight, 'FD');
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', index === 0 ? 'bold' : 'normal');
      pdf.setFontSize(7);
      pdf.text(lines, x + rowPadding, y + rowPadding + 2.7, { baseline: 'top' });
      x += columns[index].width;
    });
    y += rowHeight;
  });

  drawFooter(pageNumber, totalPagesPlaceholder);
  pdf.putTotalPages(totalPagesPlaceholder);
  pdf.save(filename);
  return { success: true, count: requests.length, filename };
}
