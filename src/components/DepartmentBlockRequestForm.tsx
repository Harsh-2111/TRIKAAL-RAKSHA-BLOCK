import React, { useState, useEffect } from 'react';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  Lock,
  TrainTrack,
  Wrench,
  Sparkles,
  Zap,
  Radio,
  FileText,
  Calendar,
  Send,
  RotateCcw
} from 'lucide-react';
import { BlockRequest, Department, UrgencyLevel, User } from '../types';
import { DEPARTMENT_CONFIG } from '../data/mockData';

interface DepartmentBlockRequestFormProps {
  currentUser: User;
  onSubmitSuccess: (newReq: BlockRequest) => void;
  onCancel: () => void;
}

const SECTION_PRESETS = [
  'Delhi - Ambala Section, KM 45/2 - 48/6',
  'Ghaziabad - New Delhi Section, KM 14/12 - 16/40',
  'Aligarh - Tundla Section, KM 1350/08 - 1352/20',
  'New Delhi - Tuglakabad Section, KM 8/10 - 11/20',
  'Delhi Shahdara - Moradabad Section, KM 22/4 - 26/8',
  'Panipat - Ambala Section, KM 122/0 - 126/5',
  'Custom Section (Type Below)',
];

const COMMON_MACHINERY = [
  'BCM (Ballast Cleaning Machine)',
  'Tower Wagon (8-Wheeler RU)',
  'Unimat (Turnout Tamper)',
  'Rail Crane (140T Heavy Lift)',
  'CSM (Continuous Tamping Machine)',
  'DGS (Dynamic Track Stabilizer)',
  'Point Motor Test Console',
  'Rail Grinding Machine (RGM)',
  'OHE Ladder Gang & Earthing Rods',
];

export const DepartmentBlockRequestForm: React.FC<DepartmentBlockRequestFormProps> = ({
  currentUser,
  onSubmitSuccess,
  onCancel,
}) => {
  const userDept = currentUser.department as Department;
  const deptConfig = DEPARTMENT_CONFIG[userDept] || DEPARTMENT_CONFIG.ENGINEERING;

  // Default block type tailored to department
  const defaultBlockType =
    userDept === 'ENGINEERING'
      ? 'Track Maintenance'
      : userDept === 'ST'
      ? 'Signal Interlocking'
      : 'OHE Maintenance';

  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [selectedSectionPreset, setSelectedSectionPreset] = useState<string>(SECTION_PRESETS[0]);
  const [customSectionText, setCustomSectionText] = useState<string>('');
  const [blockType, setBlockType] = useState<string>(defaultBlockType);
  const [proposedDate, setProposedDate] = useState<string>(todayStr);
  const [startTime, setStartTime] = useState<string>('01:30');
  const [endTime, setEndTime] = useState<string>('04:30');
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>('Routine');
  const [selectedMachineryChips, setSelectedMachineryChips] = useState<string[]>([]);
  const [machineryCustomText, setMachineryCustomText] = useState<string>('');
  const [justification, setJustification] = useState<string>('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrorBanner, setShowErrorBanner] = useState<boolean>(false);

  // Auto-calculate duration in hours and minutes
  const calculateDuration = () => {
    if (!startTime || !endTime) return { minutes: 0, text: '0 Hours 00 Minutes' };
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    let diff = eH * 60 + eM - (sH * 60 + sM);
    if (diff < 0) diff += 24 * 60; // Overnight block
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    const padM = mins < 10 ? `0${mins}` : mins;
    return {
      minutes: diff,
      text: `${hours} Hour${hours !== 1 ? 's' : ''} ${padM} Minute${mins !== 1 ? 's' : ''} (${diff} mins)`,
    };
  };

  const durationInfo = calculateDuration();

  const handleToggleMachineryChip = (mach: string) => {
    if (selectedMachineryChips.includes(mach)) {
      setSelectedMachineryChips(selectedMachineryChips.filter((m) => m !== mach));
    } else {
      setSelectedMachineryChips([...selectedMachineryChips, mach]);
    }
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};

    const resolvedSection =
      selectedSectionPreset === 'Custom Section (Type Below)'
        ? customSectionText.trim()
        : selectedSectionPreset;

    if (!resolvedSection) {
      errs.section = 'Railway Division & Section is required.';
    }
    if (!blockType) {
      errs.blockType = 'Block Type is required.';
    }
    if (!proposedDate) {
      errs.date = 'Proposed Date is required.';
    }
    if (!startTime) {
      errs.startTime = 'Start Time is required.';
    }
    if (!endTime) {
      errs.endTime = 'End Time is required.';
    }
    if (durationInfo.minutes <= 0) {
      errs.duration = 'Block duration must be greater than 0 minutes.';
    }
    if (!urgencyLevel) {
      errs.urgency = 'Urgency Level is required.';
    }

    const allMachinery = [
      ...selectedMachineryChips,
      ...(machineryCustomText.trim() ? [machineryCustomText.trim()] : []),
    ];
    if (allMachinery.length === 0) {
      errs.machinery = 'Please select or specify at least one item of Machinery/Equipment.';
    }

    if (!justification.trim() || justification.trim().length < 10) {
      errs.justification = 'Justification / Operational Reason must be at least 10 characters.';
    }

    setErrors(errs);
    setShowErrorBanner(Object.keys(errs).length > 0);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const resolvedSection =
      selectedSectionPreset === 'Custom Section (Type Below)'
        ? customSectionText.trim()
        : selectedSectionPreset;

    const allMachinery = [
      ...selectedMachineryChips,
      ...(machineryCustomText.trim() ? [machineryCustomText.trim()] : []),
    ];

    // Generate Tracking Request ID (e.g., REQ-ENG-2026-089)
    const randomSerial = Math.floor(100 + Math.random() * 900);
    const trackingId = `REQ-${deptConfig.code}-${new Date().getFullYear()}-${randomSerial}`;

    // Extract Station and KM hints from section string if possible
    let stationFrom = 'Station A';
    let stationTo = 'Station B';
    let startKm = 'KM 00/00';
    let endKm = 'KM 00/00';

    if (resolvedSection.includes('Section')) {
      const parts = resolvedSection.split('Section');
      const route = parts[0].trim();
      const stations = route.split('-');
      if (stations.length >= 2) {
        stationFrom = stations[0].trim();
        stationTo = stations[1].trim();
      }
      if (parts[1] && parts[1].includes('KM')) {
        const kmPart = parts[1].replace(',', '').trim();
        const kms = kmPart.split('-');
        if (kms.length >= 2) {
          startKm = kms[0].trim();
          endKm = kms[1].trim();
        }
      }
    }

    // Map urgency level to BlockPriority
    const priorityMap = {
      Routine: 'ROUTINE_PLANNED' as const,
      Priority: 'URGENT' as const,
      'Critical Emergency': 'SAFETY_CRITICAL' as const,
    };

    const newRequest: BlockRequest = {
      id: trackingId,
      department: userDept, // Automatically append current logged-in user's department name
      applicantName: currentUser.name,
      applicantDesignation: currentUser.designation,
      division: currentUser.division,
      section: resolvedSection,
      stationFrom,
      stationTo,
      lineType: 'Main Line',
      startKm,
      endKm,
      workCategory: blockType,
      blockType,
      workDescription: justification.trim(),
      justification: justification.trim(),
      machineryDeployed: allMachinery,
      machineryText: allMachinery.join(', '),
      requestedDate: proposedDate,
      requestedStartTime: startTime,
      requestedEndTime: endTime,
      durationMinutes: durationInfo.minutes,
      durationFormatted: durationInfo.text,
      powerBlockRequired: userDept === 'TRD' || blockType.includes('OHE'),
      trafficBlockRequired: true,
      disconnectionMemoRequired: userDept === 'ST' || blockType.includes('Signal'),
      shadowBlockEligible: true,
      speedRestrictionKmH: urgencyLevel === 'Critical Emergency' ? 30 : 45,
      priority: priorityMap[urgencyLevel],
      urgencyLevel,
      status: 'PENDING', // Defaulted to "Pending"
      submittedAt: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' })} IST`,
      safetyChecklistAcknowledged: true,
    };

    onSubmitSuccess(newRequest);
  };

  const handleResetForm = () => {
    setSelectedSectionPreset(SECTION_PRESETS[0]);
    setCustomSectionText('');
    setBlockType(defaultBlockType);
    setProposedDate(todayStr);
    setStartTime('01:30');
    setEndTime('04:30');
    setUrgencyLevel('Routine');
    setSelectedMachineryChips([]);
    setMachineryCustomText('');
    setJustification('');
    setErrors({});
    setShowErrorBanner(false);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden animate-in fade-in duration-150">
      {/* IRCTC Inspired Header Banner */}
      <div className="bg-[#000075] text-white px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-amber-500">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
            <TrainTrack className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
                Submit New Block Requisition
              </h2>
            </div>
            <p className="text-xs text-blue-200 mt-0.5">
              Department: <strong className="text-white">{deptConfig.name}</strong> • Officer ID:{' '}
              <span className="font-mono text-amber-300">{currentUser.employeeId}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[11px] bg-blue-900/80 border border-blue-700 text-blue-200 px-2.5 py-1 rounded">
            Auto-Status: <strong className="text-amber-300">Pending Review</strong>
          </span>
        </div>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 text-xs text-slate-700">
        {/* Error Banner */}
        {showErrorBanner && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-md flex items-start space-x-2 text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="font-semibold block text-xs">Validation Notice:</strong>
              <p className="text-[11px]">
                Please complete all required fields marked with an asterisk (*) before submitting your block request.
              </p>
            </div>
          </div>
        )}

        {/* Department Binding Info Card */}
        <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-[#000075]">
            <Lock className="w-4 h-4 text-[#000075] flex-shrink-0" />
            <span>
              <strong>Automatic Department Attribution:</strong> Submitting under{' '}
              <strong className="underline decoration-amber-500 underline-offset-2">
                {deptConfig.name} ({deptConfig.code})
              </strong>
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
            Division: {currentUser.division} (NR)
          </span>
        </div>

        {/* SECTION 1: Section & Block Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Railway Division & Section */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Railway Division & Section <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSectionPreset}
              onChange={(e) => setSelectedSectionPreset(e.target.value)}
              className={`w-full border rounded px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-blue-600 ${
                errors.section ? 'border-red-500' : 'border-slate-300'
              }`}
            >
              {SECTION_PRESETS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>

            {selectedSectionPreset === 'Custom Section (Type Below)' && (
              <input
                type="text"
                placeholder="e.g. Delhi - Ambala Section, KM 45/2 - 48/6"
                value={customSectionText}
                onChange={(e) => setCustomSectionText(e.target.value)}
                className="mt-2 w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-blue-600"
                required
              />
            )}
            <p className="text-[10px] text-slate-500 mt-1">
              Specify railway corridor stretch with kilometre post indicators.
            </p>
            {errors.section && <span className="text-[11px] text-red-600 block mt-0.5">{errors.section}</span>}
          </div>

          {/* Block Type Dropdown */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Block Type <span className="text-red-500">*</span>
            </label>
            <select
              value={blockType}
              onChange={(e) => setBlockType(e.target.value)}
              className={`w-full border rounded px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-blue-600 ${
                errors.blockType ? 'border-red-500' : 'border-slate-300'
              }`}
            >
              <option value="Track Maintenance">Track Maintenance (Tamping, BCM, Deep Screening)</option>
              <option value="OHE Maintenance">OHE Maintenance (25kV Overhead Wire, Insulators)</option>
              <option value="Signal Interlocking">Signal Interlocking (Point Machines, Axle Counters)</option>
              <option value="Bridge Repair">Bridge Repair & Structural Engineering</option>
              <option value="Level Crossing Gate Interlocking">Level Crossing Gate Interlocking</option>
              <option value="Turnout & Diamond Crossing Overhaul">Turnout & Diamond Crossing Overhaul</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Select technical classification of the corridor block.
            </p>
            {errors.blockType && <span className="text-[11px] text-red-600 block mt-0.5">{errors.blockType}</span>}
          </div>
        </div>

        {/* SECTION 2: Proposed Date & Time Range & Auto-Calculated Duration */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-800 uppercase text-[11px] tracking-wider flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-[#000075]" />
              Proposed Window & Real-time Duration
            </span>
            <span className="text-[10px] text-slate-500">24-Hour Railway Time Format</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Proposed Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                min={todayStr}
                className={`w-full border rounded px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-blue-600 ${
                  errors.date ? 'border-red-500' : 'border-slate-300'
                }`}
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Start Time (HH:mm) <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={`w-full border rounded px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-blue-600 ${
                  errors.startTime ? 'border-red-500' : 'border-slate-300'
                }`}
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                End Time (HH:mm) <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={`w-full border rounded px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-blue-600 ${
                  errors.endTime ? 'border-red-500' : 'border-slate-300'
                }`}
                required
              />
            </div>
          </div>

          {/* Auto-calculated Duration Highlight Banner */}
          <div className="p-3 bg-white rounded border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700 shrink-0" />
              <span className="text-slate-600 font-medium">
                Duration Requested (Auto-calculated):
              </span>
              <strong className="text-[#000075] font-mono text-xs sm:text-sm bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {durationInfo.text}
              </strong>
            </div>
            <span className="text-[10px] text-slate-400">
              Subject to Section Controller timetable pathing
            </span>
          </div>
          {errors.duration && <span className="text-[11px] text-red-600 block">{errors.duration}</span>}
        </div>

        {/* SECTION 3: Urgency Level & Machinery / Equipment Required */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Urgency Level Dropdown */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Urgency Level <span className="text-red-500">*</span>
            </label>
            <select
              value={urgencyLevel}
              onChange={(e) => setUrgencyLevel(e.target.value as UrgencyLevel)}
              className={`w-full border rounded px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-blue-600 ${
                errors.urgency ? 'border-red-500' : 'border-slate-300'
              }`}
            >
              <option value="Routine">Routine (Regular Periodic Maintenance)</option>
              <option value="Priority">Priority (High Track Vibrations / Train Punctuality Delay)</option>
              <option value="Critical Emergency">Critical Emergency (Rail Defect / OHE Flash / Safety Hazard)</option>
            </select>

            <div className="mt-2 flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                  urgencyLevel === 'Critical Emergency'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : urgencyLevel === 'Priority'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                }`}
              >
                Classification: {urgencyLevel}
              </span>
              <span className="text-[10px] text-slate-500">
                {urgencyLevel === 'Critical Emergency'
                  ? 'Urgent caution order & immediate path clearance needed'
                  : urgencyLevel === 'Priority'
                  ? 'Preferred slot requested within next 24 hours'
                  : 'Normal corridor maintenance cycle'}
              </span>
            </div>
            {errors.urgency && <span className="text-[11px] text-red-600 block mt-0.5">{errors.urgency}</span>}
          </div>

          {/* Machinery / Equipment Required */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Machinery / Equipment Required <span className="text-red-500">*</span>
            </label>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded max-h-36 overflow-y-auto space-y-1">
              <div className="text-[10px] text-slate-500 font-semibold mb-1">
                Quick Select Standard Railway Plant:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_MACHINERY.map((mach) => {
                  const isSelected = selectedMachineryChips.includes(mach);
                  return (
                    <button
                      key={mach}
                      type="button"
                      onClick={() => handleToggleMachineryChip(mach)}
                      className={`px-2 py-1 rounded text-[11px] transition-colors border flex items-center space-x-1 cursor-pointer ${
                        isSelected
                          ? 'bg-[#000075] text-white border-[#000075]'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span>{mach}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <input
              type="text"
              placeholder="Or type additional machinery / gang serials..."
              value={machineryCustomText}
              onChange={(e) => setMachineryCustomText(e.target.value)}
              className="mt-2 w-full border border-slate-300 rounded px-3 py-1.5 text-xs bg-white focus:ring-1 focus:ring-blue-600"
            />
            {errors.machinery && <span className="text-[11px] text-red-600 block mt-0.5">{errors.machinery}</span>}
          </div>
        </div>

        {/* SECTION 4: Justification / Operational Reason (Text Area) */}
        <div>
          <label className="block font-bold text-slate-800 mb-1.5">
            Justification / Operational Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Explain the specific technical reason, track defect, OHE tension requirement, or signal overhaul necessity requiring train traffic stoppage..."
            className={`w-full border rounded px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-blue-600 ${
              errors.justification ? 'border-red-500' : 'border-slate-300'
            }`}
            required
          />
          <p className="text-[10px] text-slate-500 mt-1">
            This justification is reviewed by the Section Controller (DOM Office) prior to sanctioning corridor paths.
          </p>
          {errors.justification && (
            <span className="text-[11px] text-red-600 block mt-0.5">{errors.justification}</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel & Return to Table
          </button>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Form</span>
            </button>

            <button
              type="submit"
              id="btn-submit-block-request"
              className="px-6 py-2.5 rounded-md text-xs font-bold text-white bg-[#F97316] hover:bg-orange-600 active:bg-orange-700 transition-colors shadow-sm flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
            >
              <Send className="w-4 h-4 text-white" />
              <span>Submit Block Request</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
