import React, { useState } from 'react';
import {
  X,
  Plus,
  AlertCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Lock,
  TrainTrack
} from 'lucide-react';
import { DEPARTMENT_CONFIG, RAILWAY_SECTIONS } from '../data/mockData';
import { BlockPriority, BlockRequest, Department, User } from '../types';

interface NewRequestModalProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSubmitRequest: (newReq: BlockRequest) => void;
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSubmitRequest,
}) => {
  if (!isOpen) return null;

  const userDept = currentUser.department as Department;
  const deptConfig = DEPARTMENT_CONFIG[userDept];

  const todayStr = new Date().toISOString().split('T')[0];

  const [sectionCode, setSectionCode] = useState(RAILWAY_SECTIONS[0].code);
  const [stationFrom, setStationFrom] = useState('');
  const [stationTo, setStationTo] = useState('');
  const [lineType, setLineType] = useState('DN Main');
  const [startKm, setStartKm] = useState('');
  const [endKm, setEndKm] = useState('');
  const [workCategory, setWorkCategory] = useState(deptConfig?.categories[0] || '');
  const [workDescription, setWorkDescription] = useState('');
  const [selectedMachinery, setSelectedMachinery] = useState<string[]>([]);
  const [customMachine, setCustomMachine] = useState('');
  const [requestedDate, setRequestedDate] = useState(todayStr);
  const [requestedStartTime, setRequestedStartTime] = useState('01:30');
  const [requestedEndTime, setRequestedEndTime] = useState('04:30');
  const [powerBlockRequired, setPowerBlockRequired] = useState(userDept === 'TRD');
  const [trafficBlockRequired, setTrafficBlockRequired] = useState(true);
  const [disconnectionMemoRequired, setDisconnectionMemoRequired] = useState(userDept === 'ST');
  const [shadowBlockEligible, setShadowBlockEligible] = useState(true);
  const [speedRestriction, setSpeedRestriction] = useState<number | ''>(45);
  const [priority, setPriority] = useState<BlockPriority>('ROUTINE_PLANNED');
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Selected section object
  const currentSection =
    RAILWAY_SECTIONS.find((s) => s.code === sectionCode) || RAILWAY_SECTIONS[0];

  const calculateDuration = () => {
    if (!requestedStartTime || !requestedEndTime) return 0;
    const [sH, sM] = requestedStartTime.split(':').map(Number);
    const [eH, eM] = requestedEndTime.split(':').map(Number);
    let diff = eH * 60 + eM - (sH * 60 + sM);
    if (diff < 0) diff += 24 * 60; // overnight
    return diff;
  };

  const handleToggleMachinery = (item: string) => {
    if (selectedMachinery.includes(item)) {
      setSelectedMachinery(selectedMachinery.filter((m) => m !== item));
    } else {
      setSelectedMachinery([...selectedMachinery, item]);
    }
  };

  const handleAddCustomMachinery = () => {
    if (customMachine.trim() && !selectedMachinery.includes(customMachine.trim())) {
      setSelectedMachinery([...selectedMachinery, customMachine.trim()]);
      setCustomMachine('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!workDescription.trim()) {
      setFormError('Please enter a brief technical description of the proposed block work.');
      return;
    }
    if (!stationFrom.trim() || !stationTo.trim()) {
      setFormError('Please specify both Station From and Station To.');
      return;
    }
    if (!startKm.trim() || !endKm.trim()) {
      setFormError('Please provide both Start KM and End KM markers (e.g., KM 14/10 to KM 16/40).');
      return;
    }
    if (!safetyAcknowledged) {
      setFormError('Mandatory: You must acknowledge the Railway Safety Clearance & Lookout checklist.');
      return;
    }

    const duration = calculateDuration();
    if (duration <= 0) {
      setFormError('Requested end time must be later than start time.');
      return;
    }

    const randomSerial = Math.floor(100 + Math.random() * 900);
    const blockId = `RB-${deptConfig.code}-${new Date().getFullYear()}-${randomSerial}`;

    const newRequest: BlockRequest = {
      id: blockId,
      department: userDept, // STRICT ENFORCEMENT: department is strictly locked to logged-in user
      applicantName: currentUser.name,
      applicantDesignation: currentUser.designation,
      division: currentUser.division,
      section: currentSection.name,
      stationFrom: stationFrom.trim(),
      stationTo: stationTo.trim(),
      lineType,
      startKm: startKm.startsWith('KM') ? startKm.trim() : `KM ${startKm.trim()}`,
      endKm: endKm.startsWith('KM') ? endKm.trim() : `KM ${endKm.trim()}`,
      workCategory,
      blockType: workCategory,
      workDescription: workDescription.trim(),
      justification: workDescription.trim(),
      machineryDeployed: selectedMachinery.length > 0 ? selectedMachinery : ['Hand Tools & Gang'],
      requestedDate,
      requestedStartTime,
      requestedEndTime,
      durationMinutes: duration,
      powerBlockRequired,
      trafficBlockRequired,
      disconnectionMemoRequired,
      shadowBlockEligible,
      speedRestrictionKmH: speedRestriction === '' ? null : Number(speedRestriction),
      priority,
      urgencyLevel:
        priority === 'SAFETY_CRITICAL'
          ? 'Critical Emergency'
          : priority === 'URGENT'
          ? 'Priority'
          : 'Routine',
      status: 'PENDING',
      submittedAt: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' })} IST`,
      safetyChecklistAcknowledged: true,
    };

    onSubmitRequest(newRequest);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-[#000075] text-white px-6 py-4 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
              <TrainTrack className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>New Maintenance Block Requisition Slip</span>
                <span className="text-xs bg-amber-500 text-blue-950 font-bold px-2 py-0.5 rounded">
                  Form BR-01
                </span>
              </h2>
              <p className="text-xs text-blue-200">
                Department: <strong>{deptConfig?.name}</strong> • Division: {currentUser.division}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {formError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 flex items-start space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Department Locking Notice */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-md flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-[#000075]" />
              <span className="text-xs text-slate-700">
                Department Security Binding:{' '}
                <strong className="text-[#000075]">{deptConfig?.name} ({deptConfig?.code})</strong>
              </span>
            </div>
            <span className="text-[11px] bg-white border border-blue-200 text-blue-800 font-semibold px-2 py-0.5 rounded">
              Locked to {currentUser.employeeId}
            </span>
          </div>

          {/* Section 1: Location & Track Geometry */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-200 pb-1 flex items-center">
              <span className="w-2 h-2 rounded-full bg-[#000075] mr-1.5" />
              1. Section & Track Specification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Railway Section <span className="text-red-500">*</span>
                </label>
                <select
                  value={sectionCode}
                  onChange={(e) => {
                    setSectionCode(e.target.value);
                  }}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-white"
                >
                  {RAILWAY_SECTIONS.map((sec) => (
                    <option key={sec.code} value={sec.code}>
                      {sec.name} ({sec.kmSpan})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Density: {currentSection.trafficDensity}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Line Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={lineType}
                  onChange={(e) => setLineType(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-white"
                >
                  {currentSection.lines.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Station From <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ghaziabad (GZB)"
                  value={stationFrom}
                  onChange={(e) => setStationFrom(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Station To <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sahibabad (SBB)"
                  value={stationTo}
                  onChange={(e) => setStationTo(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Start Kilometre Post <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 14/12 or KM 14/12"
                  value={startKm}
                  onChange={(e) => setStartKm(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  End Kilometre Post <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 16/40 or KM 16/40"
                  value={endKm}
                  onChange={(e) => setEndKm(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Work Scope & Machinery */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-200 pb-1 flex items-center">
              <span className="w-2 h-2 rounded-full bg-[#000075] mr-1.5" />
              2. Nature of Maintenance & Machinery
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Standard Work Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={workCategory}
                  onChange={(e) => setWorkCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-white"
                >
                  {deptConfig?.categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Priority / Urgency Classification
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as BlockPriority)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-white"
                >
                  <option value="ROUTINE_PLANNED">Routine Planned Maintenance</option>
                  <option value="SAFETY_CRITICAL">Safety Critical (Urgent Defect)</option>
                  <option value="URGENT">Urgent Speed Restriction Removal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Technical Scope & Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Detail the exact track/signal/OHE defect, machine sequence, gang deployment, and expected outcome..."
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                required
              />
            </div>

            {/* Machinery selection */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Select Machinery / Plant Deployed
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded max-h-32 overflow-y-auto">
                {deptConfig?.commonMachinery.map((mach) => (
                  <label key={mach} className="flex items-center space-x-2 text-[11px] text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMachinery.includes(mach)}
                      onChange={() => handleToggleMachinery(mach)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="truncate">{mach}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center space-x-2 mt-1.5">
                <input
                  type="text"
                  placeholder="Or add other equipment/gang..."
                  value={customMachine}
                  onChange={(e) => setCustomMachine(e.target.value)}
                  className="flex-1 border border-slate-300 rounded px-2 py-1 text-[11px]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomMachinery}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-semibold rounded flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Time Window & Operational Block Conditions */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-200 pb-1 flex items-center">
              <span className="w-2 h-2 rounded-full bg-[#000075] mr-1.5" />
              3. Requested Window & Traffic Requirements
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Proposed Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  min={todayStr}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Start Time (HH:MM) <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={requestedStartTime}
                  onChange={(e) => setRequestedStartTime(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  End Time (HH:MM) <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={requestedEndTime}
                  onChange={(e) => setRequestedEndTime(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-amber-50/70 border border-amber-200 rounded text-xs text-amber-900">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>
                  Total Requested Duration:{' '}
                  <strong>
                    {calculateDuration()} minutes ({Math.floor(calculateDuration() / 60)}h{' '}
                    {calculateDuration() % 60}m)
                  </strong>
                </span>
              </div>
              <span className="text-[11px] text-amber-800">Subject to Section Controller path approval</span>
            </div>

            {/* Checkbox Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-start space-x-2.5 p-2 bg-slate-50 border border-slate-200 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={trafficBlockRequired}
                  onChange={(e) => setTrafficBlockRequired(e.target.checked)}
                  className="rounded text-blue-600 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-slate-800">Traffic Block Required</span>
                  <p className="text-[10px] text-slate-500">Train stoppage or route diversion on this line</p>
                </div>
              </label>

              <label className="flex items-start space-x-2.5 p-2 bg-slate-50 border border-slate-200 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={powerBlockRequired}
                  onChange={(e) => setPowerBlockRequired(e.target.checked)}
                  className="rounded text-blue-600 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-slate-800">Power Block (25kV OHE Isolation)</span>
                  <p className="text-[10px] text-slate-500">De-energization of overhead contact wire by TPC</p>
                </div>
              </label>

              <label className="flex items-start space-x-2.5 p-2 bg-slate-50 border border-slate-200 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={disconnectionMemoRequired}
                  onChange={(e) => setDisconnectionMemoRequired(e.target.checked)}
                  className="rounded text-blue-600 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-slate-800">S&T Disconnection Memo</span>
                  <p className="text-[10px] text-slate-500">Signal or point machine disengagement memo</p>
                </div>
              </label>

              <label className="flex items-start space-x-2.5 p-2 bg-slate-50 border border-slate-200 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={shadowBlockEligible}
                  onChange={(e) => setShadowBlockEligible(e.target.checked)}
                  className="rounded text-blue-600 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-slate-800 text-blue-800">Shadow Block Eligible</span>
                  <p className="text-[10px] text-slate-500">AI can club this with concurrent corridor blocks</p>
                </div>
              </label>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Post-Work Caution Order / Speed Restriction (in KMPH)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  placeholder="e.g. 30, 45, 60 or leave blank for Normal Speed"
                  value={speedRestriction}
                  onChange={(e) => setSpeedRestriction(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-48 border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                />
                <span className="text-slate-500 text-[11px]">
                  {speedRestriction ? `Temporary caution of ${speedRestriction} KMPH will be issued` : 'No speed restriction (Normal line speed allowed)'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Safety Undertaking */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={safetyAcknowledged}
                onChange={(e) => setSafetyAcknowledged(e.target.checked)}
                className="rounded text-blue-600 mt-0.5"
                required
              />
              <div className="text-xs text-slate-700">
                <strong className="text-slate-900 block">General Safety Declaration & Railway Board Compliance</strong>
                I hereby declare that site survey has been conducted, qualified lookout personnel with detonators and red flags will be deployed, and work will cease immediately upon block burst warning.
              </div>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-submit-new-request"
                className="px-5 py-2 text-xs font-bold text-white bg-[#000075] hover:bg-blue-900 rounded transition-colors shadow-sm flex items-center space-x-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Submit Block Requisition to Section Control</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
