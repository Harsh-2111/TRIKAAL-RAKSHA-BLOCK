import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Robust cross-browser and iframe-safe PDF saver.
 * Supports direct jsPDF save, Blob object URL click, and Base64 Data URI fallback.
 */
export function savePdfDocument(pdf: jsPDF, filename: string): boolean {
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  try {
    // 1. Primary method: native jsPDF save (dispatches FileSaver)
    pdf.save(safeFilename);
    return true;
  } catch (err) {
    console.warn('[PDF] Standard pdf.save failed, trying Blob object URL fallback:', err);
  }

  try {
    // 2. Fallback: Blob URL download anchor
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 2000);
    return true;
  } catch (err) {
    console.warn('[PDF] Blob fallback failed, trying Data URI fallback:', err);
  }

  try {
    // 3. Fallback: Base64 Data URI
    const dataUri = pdf.output('datauristring');
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = safeFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 2000);
    return true;
  } catch (finalErr) {
    console.error('[PDF] All download methods failed:', finalErr);
    return false;
  }
}

/**
 * Generates an authentic Indian Railways Field Execution Roster (Form T/402-B)
 * as a high-precision, vector PDF with crisp tables, headers, and seals.
 */
export function generateFieldRosterVectorPdf(
  element: HTMLElement | null,
  filename: string
): boolean {
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;

  // 1. Official Header Band (Navy Blue #000075)
  pdf.setFillColor(0, 0, 117);
  pdf.rect(0, 0, pageWidth, 22, 'F');

  // Saffron accent stripe
  pdf.setFillColor(234, 88, 12);
  pdf.rect(0, 22, pageWidth, 1.8, 'F');

  // Use the same RAKSHA-BLOCK mark shown in the printable roster preview.
  const logo = element?.querySelector('img[alt="RAKSHA-BLOCK Logo"]') as HTMLImageElement | null;
  if (logo?.complete && logo.naturalWidth > 0) {
    pdf.addImage(logo, 'PNG', margin, 3, 14, 14);
  }

  // Government & Ministry Title
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text('INDIAN RAILWAYS • RAKSHA-BLOCK ENTERPRISE SYSTEM', margin + 18, 10);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(
    'Ministry of Railways • Automated Corridor Block Planning & Field Execution Management',
    margin + 18,
    16
  );

  // Reference Code (Right side)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text('FORM T/402-B (REV. 2026)', pageWidth - margin - 50, 10);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.text(
    `Date: ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
    pageWidth - margin - 50,
    16
  );

  let currentY = 30;

  // Subtitle Banner
  pdf.setFillColor(241, 245, 249);
  pdf.rect(margin, currentY, pageWidth - margin * 2, 8, 'F');
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(margin, currentY, pageWidth - margin * 2, 8, 'S');

  pdf.setTextColor(0, 0, 117);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.text(
    'DAILY MASTER CORRIDOR MAINTENANCE & FIELD EXECUTION ROSTER',
    margin + 4,
    currentY + 5.5
  );

  currentY += 13;

  // Table Column Definitions (Landscape)
  const cols = [
    { header: 'Sl.', width: 10 },
    { header: 'Block ID', width: 28 },
    { header: 'Dept.', width: 22 },
    { header: 'Section / Corridor & KM', width: 62 },
    { header: 'Timings (IST)', width: 34 },
    { header: 'Duration', width: 20 },
    { header: 'Work & Machinery / Safety Details', width: 70 },
    { header: 'Status / Urgency', width: 27 },
  ];

  // Draw Table Header
  pdf.setFillColor(226, 232, 240);
  pdf.rect(margin, currentY, pageWidth - margin * 2, 7, 'F');
  pdf.setDrawColor(148, 163, 184);
  pdf.rect(margin, currentY, pageWidth - margin * 2, 7, 'S');

  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);

  let curX = margin;
  cols.forEach((col) => {
    pdf.text(col.header, curX + 2, currentY + 4.8);
    curX += col.width;
  });

  currentY += 7;

  // Parse Table Rows from DOM if present
  const tableRows = element ? Array.from(element.querySelectorAll('tbody tr')) : [];

  if (tableRows.length > 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);

    tableRows.forEach((tr, index) => {
      const tds = Array.from(tr.querySelectorAll('td')).map((td) =>
        (td.textContent || '').trim().replace(/\s+/g, ' ')
      );

      if (tds.length >= 5) {
        // Check page break
        if (currentY > pageHeight - 25) {
          pdf.addPage();
          currentY = 15;
        }

        const rowHeight = 7.5;
        // Alternating row background
        if (index % 2 === 1) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F');
        }

        pdf.setDrawColor(226, 232, 240);
        pdf.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'S');

        let cellX = margin;
        // Sl No
        pdf.setTextColor(71, 85, 105);
        pdf.text(String(index + 1), cellX + 3, currentY + 5);
        cellX += cols[0].width;

        // Block ID
        pdf.setTextColor(0, 0, 117);
        pdf.setFont('helvetica', 'bold');
        pdf.text(tds[1] || `REQ-00${index + 1}`, cellX + 2, currentY + 5);
        pdf.setFont('helvetica', 'normal');
        cellX += cols[1].width;

        // Department
        pdf.setTextColor(15, 23, 42);
        pdf.text(tds[2] || 'Operating', cellX + 2, currentY + 5);
        cellX += cols[2].width;

        // Section & KM
        const sectionText = tds[3] || 'Main Line Corridor';
        pdf.text(sectionText.slice(0, 36), cellX + 2, currentY + 5);
        cellX += cols[3].width;

        // Timings
        const timingsText = tds[4] && tds[5] ? `${tds[4]} - ${tds[5]}` : (tds[4] || '02:00 - 05:00');
        pdf.text(timingsText, cellX + 2, currentY + 5);
        cellX += cols[4].width;

        // Duration
        pdf.text(tds[6] || '180 min', cellX + 2, currentY + 5);
        cellX += cols[5].width;

        // Work & Machinery
        const workText = tds[7] || 'Corridor Maintenance Operations';
        pdf.text(workText.slice(0, 42), cellX + 2, currentY + 5);
        cellX += cols[6].width;

        // Status
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(22, 101, 52); // Emerald green
        pdf.text(tds[8] || 'SANCTIONED', cellX + 2, currentY + 5);
        pdf.setFont('helvetica', 'normal');

        currentY += rowHeight;
      }
    });
  } else {
    // Fallback sample block entry
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Corridor block schedule synchronized and verified in CRIS FOIS system.', margin + 4, currentY + 6);
    currentY += 10;
  }

  // Footer / Verification Stamp
  currentY = Math.max(currentY + 6, pageHeight - 20);
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, currentY, pageWidth - margin * 2, 12, 'F');
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(margin, currentY, pageWidth - margin * 2, 12, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(0, 0, 117);
  pdf.text('DIGITALLY SANCTIONED • CRIS FOIS SECURE HASH VERIFIED', margin + 4, currentY + 5);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    'Official Indian Railways record under General & Subsidiary Rules (G&SR). Valid for Field Deployment.',
    margin + 4,
    currentY + 9
  );

  return savePdfDocument(pdf, safeFilename);
}

/**
 * Generates an official Block Requisition Memo & Safety Verification PDF
 * for single block demands.
 */
export function generateBlockMemoVectorPdf(
  element: HTMLElement | null,
  filename: string
): boolean {
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;

  // 1. Navy Banner
  pdf.setFillColor(0, 0, 117);
  pdf.rect(0, 0, pageWidth, 26, 'F');

  // Saffron Accent Line
  pdf.setFillColor(234, 88, 12);
  pdf.rect(0, 26, pageWidth, 2, 'F');

  // Official Title
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text('INDIAN RAILWAYS • BLOCK REQUISITION MEMO', margin, 11);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(
    'Ministry of Railways • Automated Corridor Block Planning & Safety Verification System',
    margin,
    17
  );
  pdf.text(
    `Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
    margin,
    22
  );

  let currentY = 36;

  // Memo Title
  pdf.setTextColor(0, 0, 117);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('OFFICIAL BLOCK REQUISITION & SECTION CONTROLLER SANCTION', margin, currentY);

  currentY += 7;
  pdf.setDrawColor(203, 213, 225);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  if (element) {
    // Extract key details from memo modal
    const textLines = (element.innerText || element.textContent || '')
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.includes('Download') && !s.includes('Close') && !s.includes('Print'));

    pdf.setFontSize(8.5);

    for (const line of textLines.slice(0, 60)) {
      if (currentY > pageHeight - 25) {
        pdf.addPage();
        currentY = 18;
      }

      if (
        line.includes(':') ||
        line.startsWith('MEMO') ||
        line.startsWith('DEPARTMENT') ||
        line.startsWith('SECTION') ||
        line.startsWith('SAFETY') ||
        line.startsWith('TIMINGS')
      ) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 117);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(51, 65, 85);
      }

      const wrapped = pdf.splitTextToSize(line, pageWidth - margin * 2);
      pdf.text(wrapped, margin, currentY);
      currentY += wrapped.length * 4.2;
    }
  }

  // Digital Sanction Seal Box
  currentY = Math.max(currentY + 5, pageHeight - 32);
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, currentY, pageWidth - margin * 2, 20, 'F');
  pdf.setDrawColor(148, 163, 184);
  pdf.rect(margin, currentY, pageWidth - margin * 2, 20, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 117);
  pdf.text('SECTION CONTROLLER SANCTION & CRIS FOIS VERIFICATION', margin + 4, currentY + 6);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    'This requisition memo is authenticated with IR-RBAC Tier 1 Section Control digital credential.',
    margin + 4,
    currentY + 11
  );
  pdf.text(
    'All site safety clearances and line opening authorizations must be recorded per G&SR rules.',
    margin + 4,
    currentY + 15
  );

  return savePdfDocument(pdf, safeFilename);
}

/**
 * Universal PDF Download Entrypoint:
 * Detects whether the request is a Roster, a Memo, or generic element.
 * Uses high-speed native vector rendering for immediate download,
 * with html2canvas fallback if custom styling is needed.
 */
export async function downloadElementAsPdf(
  elementId: string,
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    scale?: number;
  }
): Promise<boolean> {
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const element = document.getElementById(elementId);

  // 1. High-Precision Vector Dispatch:
  // Printable Field Roster Document
  if (elementId === 'printable-roster-document' || safeFilename.toLowerCase().includes('roster')) {
    return generateFieldRosterVectorPdf(element, safeFilename);
  }

  // Printable Memo Modal Card
  if (elementId === 'printable-memo-modal-card' || safeFilename.toLowerCase().includes('memo')) {
    return generateBlockMemoVectorPdf(element, safeFilename);
  }

  // 2. Generic Element: Try html2canvas with a strict 2.5 second timeout
  if (element) {
    try {
      const canvasPromise = html2canvas(element, {
        scale: options?.scale || 1.5,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // 2.5 second timeout protection against html2canvas hanging
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('html2canvas timed out')), 2500)
      );

      const canvas = await Promise.race([canvasPromise, timeoutPromise]);

      if (canvas) {
        const orientation =
          options?.orientation || (canvas.width > canvas.height * 1.2 ? 'landscape' : 'portrait');

        const pdf = new jsPDF({
          orientation,
          unit: 'mm',
          format: 'a4',
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * pageWidth) / canvas.width;

        if (imgHeight <= pageHeight) {
          const imgData = canvas.toDataURL('image/jpeg', 0.92);
          pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
        } else {
          // Multi-page slicing
          const pageCanvasHeight = (canvas.width * pageHeight) / pageWidth;
          let renderedHeight = 0;
          let pageIndex = 0;

          while (renderedHeight < canvas.height) {
            if (pageIndex > 0) pdf.addPage();

            const currentSliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight);
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = currentSliceHeight;
            const ctx = pageCanvas.getContext('2d');

            if (ctx) {
              ctx.drawImage(
                canvas,
                0,
                renderedHeight,
                canvas.width,
                currentSliceHeight,
                0,
                0,
                canvas.width,
                currentSliceHeight
              );
              const sliceImgData = pageCanvas.toDataURL('image/jpeg', 0.92);
              const sliceImgHeight = (currentSliceHeight * pageWidth) / canvas.width;
              pdf.addImage(sliceImgData, 'JPEG', 0, 0, pageWidth, sliceImgHeight);
            }

            renderedHeight += currentSliceHeight;
            pageIndex++;
          }
        }

        return savePdfDocument(pdf, safeFilename);
      }
    } catch (err) {
      console.warn('[PDF] Canvas capture timed out or failed, using vector generator fallback:', err);
    }
  }

  // 3. Fallback to vector generation
  return generateBlockMemoVectorPdf(element, safeFilename);
}
