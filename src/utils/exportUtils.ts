import { BlockRequest } from '../types';
import { DEPARTMENT_CONFIG } from '../data/mockData';
import { calculateSectionDelays } from './delayCalculator';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch('/logo.jpg');
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportRequestsToOfficialPdf(
  requests: BlockRequest[],
  customFilename?: string,
): Promise<{ success: boolean; count: number; filename: string }> {
  if (!requests || requests.length === 0) {
    return { success: false, count: 0, filename: '' };
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `RAKSHA_BLOCK_Corridor_Report_${dateStamp}.pdf`;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const generatedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const logoDataUrl = await loadLogoDataUrl();

  const drawHeader = () => {
    pdf.setFillColor(0, 0, 117);
    pdf.rect(0, 0, pageWidth, 25, 'F');
    pdf.setFillColor(234, 88, 12);
    pdf.rect(0, 25, pageWidth, 1.5, 'F');
    if (logoDataUrl) {
      pdf.addImage(logoDataUrl, 'JPEG', margin, 3, 18, 18);
    }
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('INDIAN RAILWAYS - TRIKAAL RAKSHA BLOCK PLATFORM', margin + 22, 10);
    pdf.setFontSize(9);
    pdf.text('OFFICIAL CORRIDOR BLOCK POSSESSION REPORT', margin + 22, 17);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text(`Generated: ${generatedAt} IST`, pageWidth - margin - 48, 10);
    pdf.text('Centralized Corridor Management', pageWidth - margin - 48, 17);
  };

  const drawFooter = (pageNumber: number, totalPages: number) => {
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

  const headers = [[
    'Requisition ID',
    'Dept',
    'Section',
    'Date & Window',
    'Duration',
    'Delay (P/F)',
    'Status',
  ]];

  autoTable(pdf, {
    head: headers,
    body: rows,
    startY: 32,
    margin: { top: 32, right: margin, bottom: 15, left: margin },
    tableWidth: 'auto',
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      overflow: 'linebreak',
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 31, fontStyle: 'bold' },
      1: { cellWidth: 29 },
      2: { cellWidth: 53 },
      3: { cellWidth: 52 },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 29, halign: 'center' },
      6: { cellWidth: 37, halign: 'center' },
    },
    didDrawPage: () => drawHeader(),
  });

  const totalPages = pdf.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    pdf.setPage(pageNumber);
    drawFooter(pageNumber, totalPages);
  }
  pdf.save(filename);
  return { success: true, count: requests.length, filename };
}
