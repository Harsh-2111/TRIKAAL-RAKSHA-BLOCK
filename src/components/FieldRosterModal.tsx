import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileSpreadsheet,
  X,
  CheckCircle2,
  Train,
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  Download,
  Filter,
  Layers,
  Sparkles,
  Loader2
} from 'lucide-react';
import { BlockRequest, Department, User } from '../types';
import { DEPARTMENT_CONFIG } from '../data/mockData';
import { exportRequestsToCsv } from '../utils/exportUtils';
import { downloadElementAsPdf } from '../utils/pdfGenerator';

interface FieldRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: BlockRequest[];
  currentUser: User;
  onToast?: (message: string, type: 'success' | 'info') => void;
}

export const FieldRosterModal: React.FC<FieldRosterModalProps> = ({
  isOpen,
  onClose,
  requests,
  currentUser,
  onToast
}) => {
  // Filter state inside the modal
  const [filterMode, setFilterMode] = useState<'APPROVED_ONLY' | 'ALL'>('APPROVED_ONLY');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  // Filter the requests based on criteria
  const filteredRoster = useMemo(() => {
    return requests.filter((req) => {
      const matchesStatus =
        filterMode === 'APPROVED_ONLY'
          ? req.status === 'APPROVED' || req.status === 'MODIFIED_APPROVED'
          : true;
      const matchesSection = selectedSection === 'ALL' || req.section === selectedSection;
      return matchesStatus && matchesSection;
    });
  }, [requests, filterMode, selectedSection]);

  // Unique sections in the dataset
  const uniqueSections = useMemo(() => {
    return Array.from(new Set(requests.map((r) => r.section))).filter(Boolean);
  }, [requests]);

  // Unique departments involved
  const activeDepartments = useMemo(() => {
    return Array.from(new Set(filteredRoster.map((r) => r.department)));
  }, [filteredRoster]);

  // Date and Time generation stamp
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) + ' IST';
  const rosterRefId = `RB-ROSTER-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;

  // Handle direct PDF document generation and file download
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    const filename = `RAKSHA_BLOCK_Field_Roster_${now.toISOString().slice(0, 10)}.pdf`;
    try {
      const success = await downloadElementAsPdf('printable-roster-document', filename, {
        orientation: 'portrait',
        scale: 2,
      });
      if (success && onToast) {
        onToast(`Official Field Roster downloaded successfully as ${filename}`, 'success');
      }
    } catch (err) {
      console.error('PDF download error:', err);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Handle browser printing
  const handlePrint = () => {
    window.print();
  };

  // Handle CSV export
  const handleCsvDownload = () => {
    const filename = `RAKSHA_BLOCK_Field_Roster_${now.toISOString().slice(0, 10)}.csv`;
    const res = exportRequestsToCsv(filteredRoster, filename);
    if (res.success && onToast) {
      onToast(`Exported ${res.count} block requisitions to ${res.filename}`, 'success');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-2 sm:p-4 md:p-6 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[92vh] min-w-0 flex flex-col overflow-hidden my-auto">
        {/* Top Operational Action Bar (Non-Printable) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 no-print">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Official Field Execution Roster Generator
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  PRINT & PDF READY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Indian Railways Form T/402-B • Standard Field Maintenance & Safety Roster
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* CSV Export Button */}
            <button
              onClick={handleCsvDownload}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600 transition-colors shadow-xs cursor-pointer"
              title="Download formatted Excel/CSV of active roster"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>Export CSV</span>
            </button>

            {/* Print / Save as PDF Button with Direct Download */}
            <button
              id="print-roster-btn"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-60 text-slate-950 transition-all shadow-md cursor-pointer"
              title="Download official PDF to your device"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>Downloading PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-slate-950" />
                  <span>Download / Save as PDF</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close Roster Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar (Non-Printable) */}
        <div className="bg-slate-100 px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700 no-print">
          <div className="flex items-center space-x-3">
            <span className="font-semibold text-slate-600 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Filter Scope:</span>
            </span>

            <div className="inline-flex rounded-md shadow-xs bg-white p-0.5 border border-slate-300">
              <button
                onClick={() => setFilterMode('APPROVED_ONLY')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  filterMode === 'APPROVED_ONLY'
                    ? 'bg-[#000075] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sanctioned / Approved Only ({requests.filter((r) => r.status === 'APPROVED' || r.status === 'MODIFIED_APPROVED').length})
              </button>
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  filterMode === 'ALL'
                    ? 'bg-[#000075] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Demands ({requests.length})
              </button>
            </div>

            {uniqueSections.length > 1 && (
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500">Section:</span>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 font-medium"
                >
                  <option value="ALL">All Railway Sections</option>
                  {uniqueSections.map((sec, i) => (
                    <option key={i} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="text-slate-500 text-[11px] flex items-center space-x-2">
            <span>
              Showing <strong>{filteredRoster.length}</strong> block entries
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Ready for Field Deployment</span>
            </span>
          </div>
        </div>

        {/* PRINTABLE DOCUMENT BODY */}
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-8 bg-slate-50">
          {/* Authentic Document Canvas Container */}
          <div
            id="printable-roster-document"
            className="bg-white mx-auto w-full min-w-0 max-w-[1020px] p-3 sm:p-10 rounded-sm border border-slate-300 shadow-md print:shadow-none print:border-none print:p-0 print:m-0"
          >
            {/* DOCUMENT HEADER: Authentic Indian Railways Letterhead */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                {/* Left: Indian Railways Crest & Official Logo */}
                <div className="flex min-w-0 items-center space-x-3 sm:space-x-4">
                  <img
                    src="/logo.png"
                    alt="RAKSHA-BLOCK Logo"
                    className="h-12 sm:h-16 w-auto max-w-[84px] object-contain shrink-0"
                  />
                  <div>
                    <div className="text-[11px] font-bold tracking-widest text-slate-600 uppercase">
                      Government of India • Ministry of Railways
                    </div>
                    <h1 className="text-base sm:text-xl font-black text-[#000075] tracking-tight uppercase break-words">
                      Indian Railways - Divisional Main Control
                    </h1>
                    <div className="text-xs font-semibold text-slate-700">
                      Delhi Division (Operating & Engineering Control Cell)
                    </div>
                  </div>
                </div>

                {/* Right: Reference & Form Tag */}
                <div className="text-left sm:text-right shrink-0">
                  <div className="inline-block border border-slate-800 px-2.5 py-1 bg-slate-50 text-[11px] font-mono font-bold text-slate-900">
                    FORM T/402-B (REV. 2026)
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1">
                    Ref ID: <strong className="text-slate-800">{rosterRefId}</strong>
                  </div>
                  <div className="text-[10px] text-slate-400">RAKSHA-BLOCK SEC-OPS</div>
                </div>
              </div>

              {/* Title Ribbon */}
              <div className="mt-4 bg-[#000075] text-white py-1.5 px-2 sm:px-4 text-center font-bold tracking-wider text-[10px] sm:text-sm uppercase rounded-xs break-words">
                Daily Master Corridor Maintenance & Field Execution Roster
              </div>
            </div>

            {/* DOCUMENT METADATA STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b border-slate-200 text-xs bg-slate-50/70 px-3 my-3">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Date / Time Stamp
                </span>
                <span className="font-semibold text-slate-800 flex items-center space-x-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{dateStr}</span>
                  <span className="font-mono text-slate-600 text-[11px]">({timeStr})</span>
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Division & Sector
                </span>
                <span className="font-semibold text-slate-800 flex items-center space-x-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Delhi (DLI) - Sub-Division 1</span>
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Total Sanctioned Blocks
                </span>
                <span className="font-semibold text-emerald-800 flex items-center space-x-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{filteredRoster.length} Corridor Possessions</span>
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Executing Departments
                </span>
                <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                  {activeDepartments.map((d) => DEPARTMENT_CONFIG[d]?.name || d).join(', ') || 'All Departments'}
                </span>
              </div>
            </div>

            {/* CAUTION ORDER & SAFETY DIRECTIVES SUMMARY */}
            <div className="bg-amber-50/70 border border-amber-300 rounded p-2.5 my-3 text-[11px] text-amber-950">
              <div className="flex items-center space-x-1.5 font-bold text-amber-900 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="uppercase tracking-wider">Mandatory Operating Safety & Caution Directives:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-800 pl-1">
                <li>
                  No track possession may commence until formal line clear blockage and red flag/detonator protection is established per General & Subsidiary Rules (G&SR).
                </li>
                <li>
                  Traction Power Controller (TPC) permit-to-work and 25kV OHE isolation must be confirmed in writing before rolling track machine booms.
                </li>
                <li>
                  All S&T point clampings and disconnection memos must be acknowledged on site by the Section Engineer (Signal).
                </li>
              </ul>
            </div>

            {/* MASTER ROSTER TABLE */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-[11px] border border-slate-400">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400 text-[10px] uppercase tracking-wider">
                    <th className="py-2 px-2 border-r border-slate-300 text-center w-8">Sl.</th>
                    <th className="py-2 px-2.5 border-r border-slate-300 w-24">Block ID</th>
                    <th className="py-2 px-2.5 border-r border-slate-300 w-28">Department</th>
                    <th className="py-2 px-3 border-r border-slate-300">Section / Track & KM</th>
                    <th className="py-2 px-2.5 border-r border-slate-300 text-center w-20">Start Time</th>
                    <th className="py-2 px-2.5 border-r border-slate-300 text-center w-20">End Time</th>
                    <th className="py-2 px-2 border-r border-slate-300 text-center w-16">Duration</th>
                    <th className="py-2 px-3 border-r border-slate-300">Allocated Machinery / Work</th>
                    <th className="py-2 px-2 text-center w-20">Urgency</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoster.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 italic bg-white">
                        No block records found matching the current roster criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRoster.map((req, idx) => {
                      const dept = DEPARTMENT_CONFIG[req.department];
                      const startTime = req.approvedStartTime || req.requestedStartTime || 'N/A';
                      const endTime = req.approvedEndTime || req.requestedEndTime || 'N/A';
                      const durationHrs = (
                        (req.approvedDurationMinutes || req.durationMinutes || 0) / 60
                      ).toFixed(1);
                      const urgency =
                        req.urgencyLevel ||
                        (req.priority === 'SAFETY_CRITICAL'
                          ? 'Critical'
                          : req.priority === 'URGENT'
                          ? 'Priority'
                          : 'Routine');

                      return (
                        <tr
                          key={req.id}
                          className={`border-b border-slate-300 ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                          }`}
                        >
                          <td className="py-2 px-2 border-r border-slate-300 text-center font-mono font-bold text-slate-700">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-300 font-mono font-bold text-slate-900 whitespace-nowrap">
                            <div>{req.id}</div>
                            {req.aiOptimized && (
                              <span className="inline-flex items-center text-[9px] text-indigo-700 font-semibold mt-0.5">
                                <Sparkles className="w-2.5 h-2.5 mr-0.5 text-amber-500" />
                                {req.aiBundleId || 'AI Bundled'}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-300">
                            <span className="font-bold text-slate-800 block">
                              {dept?.code || req.department}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {dept?.name}
                            </span>
                          </td>
                          <td className="py-2 px-3 border-r border-slate-300">
                            <span className="font-bold text-slate-900 block">{req.section}</span>
                            <span className="text-[10px] text-slate-600 block">
                              {req.lineType} • KM {req.startKm} to {req.endKm}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-300 text-center font-mono font-semibold text-slate-900 whitespace-nowrap">
                            {startTime}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-300 text-center font-mono font-semibold text-slate-900 whitespace-nowrap">
                            {endTime}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-300 text-center font-mono font-bold text-[#000075]">
                            {durationHrs}h
                          </td>
                          <td className="py-2 px-3 border-r border-slate-300">
                            <span className="font-semibold text-slate-800 block truncate max-w-[220px]">
                              {req.workDescription || req.blockType}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-[220px]">
                              Machinery: {req.machineryDeployed?.join(', ') || req.machineryText || 'Manual Work Gang'}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                urgency.includes('Critical')
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : urgency.includes('Priority')
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border border-slate-300'
                              }`}
                            >
                              {urgency}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* OFFICIAL SIGN-OFF FOOTER */}
            <div className="mt-8 pt-6 border-t-2 border-slate-900">
              <div className="text-[10px] text-slate-600 uppercase font-bold tracking-wider mb-3">
                Official Authorization & Field Acknowledgement Sign-Off:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                {/* Signature Block 1: Section Controller */}
                <div className="border border-slate-400 p-3 bg-slate-50/50 rounded-sm">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">
                    Authorized By (Main Control)
                  </div>
                  <div className="mt-6 border-b border-dashed border-slate-600 pb-1 text-xs font-bold text-slate-900">
                    {currentUser.role === 'SECTION_CONTROLLER' ? currentUser.name : 'Shri Rajesh Sharma, IRTS'}
                  </div>
                  <div className="text-[11px] text-slate-700 mt-1 font-semibold">
                    Section Controller (Main Control)
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Delhi Control Room Seal • EMP# {currentUser.employeeId || 'IR-SEC-4091'}
                  </div>
                  <div className="mt-3 text-[10px] text-slate-400">
                    Date: ____________________ Time: __________
                  </div>
                </div>

                {/* Signature Block 2: Departmental Site Engineer */}
                <div className="border border-slate-400 p-3 bg-slate-50/50 rounded-sm">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">
                    Field In-Charge Acknowledgement
                  </div>
                  <div className="mt-6 border-b border-dashed border-slate-600 pb-1 text-xs font-bold text-slate-900">
                    {currentUser.role !== 'SECTION_CONTROLLER' ? currentUser.name : 'Field Site Engineer'}
                  </div>
                  <div className="text-[11px] text-slate-700 mt-1 font-semibold">
                    Departmental Site Engineer (In-Charge)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Designation: {currentUser.designation || 'Sr. Section Engineer'}
                  </div>
                  <div className="mt-3 text-[10px] text-slate-400">
                    Field Gang Safety Memo Handover: [  ] YES
                  </div>
                </div>

                {/* Signature Block 3: Traction & Interlocking Clearance */}
                <div className="border border-slate-400 p-3 bg-slate-50/50 rounded-sm">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">
                    Traction / Signalling Clearance
                  </div>
                  <div className="mt-6 border-b border-dashed border-slate-600 pb-1 text-xs font-bold text-slate-900">
                    Power & Signal Interlocking Cell
                  </div>
                  <div className="text-[11px] text-slate-700 mt-1 font-semibold">
                    TPC / Signal Inspector on Duty
                  </div>
                  <div className="text-[10px] text-slate-500">
                    OHE De-energization Memo Number: ____________
                  </div>
                  <div className="mt-3 text-[10px] text-slate-400">
                    Station Master Station Memo Issued: [  ] YES
                  </div>
                </div>
              </div>

              {/* Watermark Notice */}
              <div className="mt-6 text-center text-[10px] text-slate-500 font-mono">
                *** THIS OFFICIAL ROSTER IS GENERATED ELECTRONICALLY VIA RAKSHA-BLOCK AUTOMATIC CORRIDOR PLANNING SYSTEM • VALID UNDER RAILWAY BOARD DIRECTIVE 2026/CE-II/TK/04 ***
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer (Non-Printable) */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 no-print">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Document ready for high-resolution printing or PDF export.</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-4 py-2 bg-[#000075] hover:bg-blue-900 disabled:opacity-60 text-white rounded font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Downloading PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Official PDF</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Open browser print dialogue"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
