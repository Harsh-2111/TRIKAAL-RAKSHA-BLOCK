import { BlockRequest, Department, ShadowBlockOpportunity, User, UserRole } from '../types';

export const OFFICIAL_ROLES: Record<UserRole, User> = {
  ENG_OFFICER: {
    id: 'usr-eng-01',
    name: 'Sh. Harsh Savalia',
    designation: 'Sr. Section Engineer (P-Way)',
    role: 'ENG_OFFICER',
    department: 'ENGINEERING',
    division: 'Delhi (DLI)',
    zone: 'Indian Railways',
    employeeId: 'NR/ENG/PW-4482',
    phone: '+91 94120 48821',
    avatarBadge: 'ENG',
  },
  ST_OFFICER: {
    id: 'usr-st-02',
    name: 'Smt. Khush Patel',
    designation: 'Sr. Section Engineer (Signal & Telecom)',
    role: 'ST_OFFICER',
    department: 'ST',
    division: 'Delhi (DLI)',
    zone: 'Indian Railways',
    employeeId: 'NR/S&T/SIG-8921',
    phone: '+91 94120 89214',
    avatarBadge: 'S&T',
  },
  TRD_OFFICER: {
    id: 'usr-trd-03',
    name: 'Er. Mann Butani',
    designation: 'Sr. Section Engineer (TRD / OHE)',
    role: 'TRD_OFFICER',
    department: 'TRD',
    division: 'Delhi (DLI)',
    zone: 'Indian Railways',
    employeeId: 'NR/TRD/OHE-3310',
    phone: '+91 94120 33109',
    avatarBadge: 'TRD',
  },
  SECTION_CONTROLLER: {
    id: 'usr-admin-04',
    name: 'Sh. Niyati Joshi',
    designation: 'Chief Controller / Section Controller (DOM Office)',
    role: 'SECTION_CONTROLLER',
    department: 'ADMIN',
    division: 'Delhi (DLI)',
    zone: 'Indian Railways',
    employeeId: 'NR/OPTG/CTL-1002',
    phone: '+91 94120 10020',
    avatarBadge: 'CTL',
  },
};

export const DEPARTMENT_CONFIG: Record<
  Department,
  {
    name: string;
    code: string;
    subText: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    accentColor: string;
    categories: string[];
    commonMachinery: string[];
  }
> = {
  ENGINEERING: {
    name: 'Civil Engineering (P-Way)',
    code: 'ENG',
    subText: 'Permanent Way, Track Renewal & Structural Maintenance',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-900',
    borderColor: 'border-blue-300',
    accentColor: '#1E3A8A',
    categories: [
      'Through Rail Renewal (TRR)',
      'Through Sleeper Renewal (TSR)',
      'BCM Deep Ballast Screening',
      'CSM Plain Track Tamping',
      'UNIMAT Turnout Point Tamping',
      'Ultrasonic Flaw Detection (USFD) Rectification',
      'Glued Joint Replacement',
      'Bridge Girder Painting & Bed-block Rehab',
    ],
    commonMachinery: [
      'Ballast Cleaning Machine (BCM #84)',
      'Continuous Tamping Machine (CSM #22)',
      'Dynamic Track Stabilizer (DGS #11)',
      'Points & Crossing Tamper (UNIMAT)',
      'Rail Grinding Machine (RGM #03)',
      'Abrasive Rail Cutter & Welder Gang',
    ],
  },
  ST: {
    name: 'Signal & Telecommunication',
    code: 'S&T',
    subText: 'Electronic Interlocking, Point Machines, Axle Counters & Signals',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
    borderColor: 'border-emerald-300',
    accentColor: '#047857',
    categories: [
      'Point Machine Periodic Overhaul (POH)',
      'Electronic Interlocking (EI) Software Patching',
      'Multi-Section Digital Axle Counter (MSDAC) Calibration',
      'Signal Aspect LED Unit Replacement',
      'Track Circuit Bonding & Relay Maintenance',
      'Level Crossing (LC) Gate Interlocking Audit',
      'OFC Telecom Cable Splicing & Testing',
    ],
    commonMachinery: [
      'Point Motor Test Console (PM-80)',
      'Axle Counter Frequency Analyzer',
      'S&T Emergency Tower Ladder Wagon',
      'Relay Testing Jig & Calibrator',
      'Optical Time Domain Reflectometer (OTDR)',
      'Joint Disconnection Test Kit',
    ],
  },
  TRD: {
    name: 'Traction Distribution (TRD)',
    code: 'TRD',
    subText: '25 kV Overhead Equipment (OHE), Substations & Power Feeders',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    borderColor: 'border-amber-300',
    accentColor: '#D97706',
    categories: [
      '25kV OHE Contact Wire Replacement',
      'Cantilever & Insulator High-Pressure Washing',
      'Neutral Section Inspection & Phase Gap Tuning',
      'Traction Substation (TSS) Transformer Servicing',
      'Section Insulator Overhaul & Adjustment',
      'OHE Catenary Wire Dropper Re-tensioning',
      'Tower Wagon Footplate OHE Stagger Check',
    ],
    commonMachinery: [
      'Self-Propelled 8-Wheeler Tower Wagon (RU-81)',
      'OHE Ladder Trolley Gang (x3 Sets)',
      'High-Reach Pantograph Inspection Vehicle',
      '25kV Earthing Rods & Discharge Equipment',
      'Torque Wrench & Stagger Gauge Kit',
      'Emergency Feeder Restoration Unit',
    ],
  },
};

export const RAILWAY_SECTIONS = [
  {
    code: 'GZB-NDLS',
    name: 'Ghaziabad (GZB) - New Delhi (NDLS)',
    kmSpan: 'KM 12.4 to KM 28.6',
    zone: 'NR',
    division: 'Delhi (DLI)',
    lines: ['UP Main', 'DN Main', '3rd Line', '4th Line'],
    trafficDensity: 'Very High (180+ Trains/day)',
  },
  {
    code: 'NDLS-TKD',
    name: 'New Delhi (NDLS) - Tuglakabad (TKD)',
    kmSpan: 'KM 0.0 to KM 17.8',
    zone: 'NR',
    division: 'Delhi (DLI)',
    lines: ['UP Main', 'DN Main', 'UP Goods Reliever', 'DN Goods Reliever'],
    trafficDensity: 'High (140+ Trains/day)',
  },
  {
    code: 'ALJN-TDL',
    name: 'Aligarh Jn (ALJN) - Tundla Jn (TDL)',
    kmSpan: 'KM 1329.5 to KM 1388.2',
    zone: 'NR',
    division: 'Delhi (DLI)',
    lines: ['UP Main', 'DN Main', 'Loop Line 1', 'Loop Line 2'],
    trafficDensity: 'Critical Golden Quadrilateral (220+ Trains/day)',
  },
  {
    code: 'DSA-MB',
    name: 'Delhi Shahdara (DSA) - Moradabad (MB)',
    kmSpan: 'KM 5.8 to KM 160.2',
    zone: 'NR',
    division: 'Delhi (DLI)',
    lines: ['Single Line Section', 'Crossing Loop at HPU'],
    trafficDensity: 'Medium (75 Trains/day)',
  },
  {
    code: 'PNP-UMB',
    name: 'Panipat Jn (PNP) - Ambala Cantt (UMB)',
    kmSpan: 'KM 88.0 to KM 198.5',
    zone: 'NR',
    division: 'Delhi (DLI)',
    lines: ['UP Main', 'DN Main'],
    trafficDensity: 'High (120+ Trains/day)',
  },
  // Western Railway (WR)
  {
    code: 'CCG-BVI',
    name: 'Churchgate (CCG) - Borivali (BVI) Fast Corridor',
    kmSpan: 'KM 0.0 to KM 34.2',
    zone: 'WR',
    division: 'Mumbai Central (MMCT)',
    lines: ['UP Fast', 'DN Fast', 'UP Slow', 'DN Slow'],
    trafficDensity: 'Extremely High Suburban (280+ Trains/day)',
  },
  {
    code: 'BVI-VR',
    name: 'Borivali (BVI) - Virar (VR) Quadruple Line',
    kmSpan: 'KM 34.2 to KM 60.1',
    zone: 'WR',
    division: 'Mumbai Central (MMCT)',
    lines: ['UP Main Line', 'DN Main Line', 'UP Suburban', 'DN Suburban'],
    trafficDensity: 'Very High (240+ Trains/day)',
  },
  {
    code: 'VR-DRD',
    name: 'Virar (VR) - Dahanu Road (DRD) W-DFCC Trunk',
    kmSpan: 'KM 60.1 to KM 124.0',
    zone: 'WR',
    division: 'Mumbai Central (MMCT)',
    lines: ['UP Main', 'DN Main', 'Freight Chord'],
    trafficDensity: 'Heavy Freight (190+ Trains/day)',
  },
  // Central Railway (CR)
  {
    code: 'PA-LNL',
    name: 'Pune Jn (PA) - Lonavala (LNL) Suburban Section',
    kmSpan: 'KM 0.0 to KM 64.0',
    zone: 'CR',
    division: 'Pune (PA)',
    lines: ['UP Main', 'DN Main', 'Auto Signalling Pair'],
    trafficDensity: 'High (160+ Trains/day)',
  },
  {
    code: 'LNL-KJT',
    name: 'Lonavala (LNL) - Bhor Ghat - Karjat (KJT)',
    kmSpan: 'KM 64.0 to KM 92.5',
    zone: 'CR',
    division: 'Pune (PA)',
    lines: ['UP Ghat Line', 'DN Ghat Line', 'Banker Catch Siding'],
    trafficDensity: 'High Gradient Safety Corridor (140 Trains/day)',
  },
  {
    code: 'PA-DD',
    name: 'Pune Jn (PA) - Daund Jn (DD) Doubled Line',
    kmSpan: 'KM 0.0 to KM 75.8',
    zone: 'CR',
    division: 'Pune (PA)',
    lines: ['UP Main Line', 'DN Main Line'],
    trafficDensity: 'Medium-High (110 Trains/day)',
  },
  // Eastern Railway (ER)
  {
    code: 'SDAH-NH',
    name: 'Sealdah (SDAH) - Naihati Jn (NH) Quadruple Line',
    kmSpan: 'KM 0.0 to KM 38.2',
    zone: 'ER',
    division: 'Sealdah (SDAH)',
    lines: ['UP Main', 'DN Main', '3rd Suburban', '4th Goods Line'],
    trafficDensity: 'Very High Suburban & Freight (260+ Trains/day)',
  },
  {
    code: 'NH-RHA',
    name: 'Naihati (NH) - Ranaghat Jn (RHA) Main Line',
    kmSpan: 'KM 38.2 to KM 100.4',
    zone: 'ER',
    division: 'Sealdah (SDAH)',
    lines: ['UP Main', 'DN Main'],
    trafficDensity: 'High (150+ Trains/day)',
  },
  // Southern Railway (SR)
  {
    code: 'MAS-AVD-AJJ',
    name: 'Chennai Central (MAS) - Avadi - Arakkonam (AJJ)',
    kmSpan: 'KM 0.0 to KM 68.8',
    zone: 'SR',
    division: 'Chennai (MAS)',
    lines: ['UP Fast', 'DN Fast', 'UP Slow Suburban', 'DN Slow Suburban'],
    trafficDensity: 'High Density Arterial (210+ Trains/day)',
  },
  {
    code: 'MS-TBM-CGL',
    name: 'Chennai Egmore (MS) - Tambaram - Chengalpattu (CGL)',
    kmSpan: 'KM 0.0 to KM 59.8',
    zone: 'SR',
    division: 'Chennai (MAS)',
    lines: ['UP Main Line', 'DN Main Line', 'UP Suburban', 'DN Suburban'],
    trafficDensity: 'High Suburban (180+ Trains/day)',
  },
];

export const INITIAL_BLOCK_REQUESTS: BlockRequest[] = [
  {
    id: 'RB-ENG-2026-081',
    department: 'ENGINEERING',
    applicantName: 'Sh. Harsh Savalia',
    applicantDesignation: 'Sr. Section Engineer (P-Way/GZB)',
    division: 'Delhi (DLI)',
    section: 'Ghaziabad (GZB) - New Delhi (NDLS)',
    stationFrom: 'Ghaziabad (GZB)',
    stationTo: 'Sahibabad (SBB)',
    lineType: 'DN Main',
    startKm: 'KM 14/12',
    endKm: 'KM 16/40',
    workCategory: 'CSM Plain Track Tamping',
    workDescription: 'Track geometric packing and alignment correction using CSM Tamper #22 after monsoon ballast settlement.',
    machineryDeployed: ['Continuous Tamping Machine (CSM #22)', 'Dynamic Track Stabilizer (DGS #11)'],
    requestedDate: '2026-09-11',
    requestedStartTime: '01:30',
    requestedEndTime: '04:30',
    durationMinutes: 180,
    powerBlockRequired: false,
    trafficBlockRequired: true,
    disconnectionMemoRequired: false,
    shadowBlockEligible: true,
    speedRestrictionKmH: 45,
    priority: 'ROUTINE_PLANNED',
    status: 'PENDING',
    submittedAt: '2026-09-10 10:15 IST',
    safetyChecklistAcknowledged: true,
  },
  {
    id: 'RB-ENG-2026-082',
    department: 'ENGINEERING',
    applicantName: 'Sh. Harsh Savalia',
    applicantDesignation: 'Sr. Section Engineer (P-Way/GZB)',
    division: 'Delhi (DLI)',
    section: 'Aligarh Jn (ALJN) - Tundla Jn (TDL)',
    stationFrom: 'Hathras Jn (HRS)',
    stationTo: 'Tundla Jn (TDL)',
    lineType: 'UP Main',
    startKm: 'KM 1350/08',
    endKm: 'KM 1352/20',
    workCategory: 'Through Rail Renewal (TRR)',
    workDescription: 'Emergency replacement of 60kg 90UTS rails exhibiting ultrasonic internal fatigue flaws detected by USFD car.',
    machineryDeployed: ['Rail Grinding Machine (RGM #03)', 'Abrasive Rail Cutter & Welder Gang'],
    requestedDate: '2026-09-12',
    requestedStartTime: '02:00',
    requestedEndTime: '05:30',
    durationMinutes: 210,
    powerBlockRequired: true,
    trafficBlockRequired: true,
    disconnectionMemoRequired: false,
    shadowBlockEligible: true,
    speedRestrictionKmH: 30,
    priority: 'SAFETY_CRITICAL',
    status: 'APPROVED',
    submittedAt: '2026-09-09 14:20 IST',
    reviewedAt: '2026-09-09 17:45 IST',
    reviewedBy: 'Sh. Niyati Joshi (DOM/Control)',
    approvedStartTime: '02:00',
    approvedEndTime: '05:00',
    approvedDurationMinutes: 180,
    cautionOrderDetails: 'CO #112/09: Dead stop and proceed at 30 KMPH for 48 hrs on UP Main between KM 1350/08-1352/20.',
    controllerRemarks: 'Approved with 30 min duration trim. Pre-positioned before train 12423 Dibrugarh Rajdhani clears section.',
    safetyChecklistAcknowledged: true,
  },
  {
    id: 'RB-ST-2026-042',
    department: 'ST',
    applicantName: 'Smt. Khush Patel',
    applicantDesignation: 'Sr. Section Engineer (Signal & Telecom/DLI)',
    division: 'Delhi (DLI)',
    section: 'Ghaziabad (GZB) - New Delhi (NDLS)',
    stationFrom: 'Ghaziabad (GZB)',
    stationTo: 'Sahibabad (SBB)',
    lineType: 'DN Main',
    startKm: 'KM 14/15',
    endKm: 'KM 15/00',
    workCategory: 'Point Machine Periodic Overhaul (POH)',
    workDescription: 'Comprehensive maintenance and internal contact gear adjustment of Point Machine #104A/B and track circuit insulation check.',
    machineryDeployed: ['Point Motor Test Console (PM-80)', 'Joint Disconnection Test Kit'],
    requestedDate: '2026-09-11',
    requestedStartTime: '01:45',
    requestedEndTime: '04:15',
    durationMinutes: 150,
    powerBlockRequired: false,
    trafficBlockRequired: true,
    disconnectionMemoRequired: true,
    shadowBlockEligible: true,
    speedRestrictionKmH: null,
    priority: 'ROUTINE_PLANNED',
    status: 'PENDING',
    submittedAt: '2026-09-10 11:30 IST',
    safetyChecklistAcknowledged: true,
  },
  {
    id: 'RB-ST-2026-043',
    department: 'ST',
    applicantName: 'Smt. Khush Patel',
    applicantDesignation: 'Sr. Section Engineer (Signal & Telecom/DLI)',
    division: 'Delhi (DLI)',
    section: 'New Delhi (NDLS) - Tuglakabad (TKD)',
    stationFrom: 'Hazrat Nizamuddin (NZM)',
    stationTo: 'Okhla (OKA)',
    lineType: 'UP Goods Reliever',
    startKm: 'KM 8/10',
    endKm: 'KM 11/20',
    workCategory: 'Multi-Section Digital Axle Counter (MSDAC) Calibration',
    workDescription: 'Sensor repositioning and wheel detector amplitude calibration due to track vibration drift.',
    machineryDeployed: ['Axle Counter Frequency Analyzer'],
    requestedDate: '2026-09-10',
    requestedStartTime: '14:00',
    requestedEndTime: '16:00',
    durationMinutes: 120,
    powerBlockRequired: false,
    trafficBlockRequired: false,
    disconnectionMemoRequired: true,
    shadowBlockEligible: false,
    speedRestrictionKmH: null,
    priority: 'ROUTINE_PLANNED',
    status: 'REJECTED',
    submittedAt: '2026-09-09 16:10 IST',
    reviewedAt: '2026-09-10 08:30 IST',
    reviewedBy: 'Sh. Niyati Joshi (DOM/Control)',
    controllerRemarks: 'Regret: Heavy container freight departure rake sequence scheduled via UP Goods line during day hours. Please resubmit for night slot post 01:00 hrs.',
    safetyChecklistAcknowledged: true,
  },
  {
    id: 'RB-TRD-2026-019',
    department: 'TRD',
    applicantName: 'Er. Mann Butani',
    applicantDesignation: 'Sr. Section Engineer (TRD/DLI)',
    division: 'Delhi (DLI)',
    section: 'Ghaziabad (GZB) - New Delhi (NDLS)',
    stationFrom: 'Ghaziabad (GZB)',
    stationTo: 'Sahibabad (SBB)',
    lineType: 'DN Main',
    startKm: 'KM 13/80',
    endKm: 'KM 17/10',
    workCategory: 'Cantilever & Insulator High-Pressure Washing',
    workDescription: 'De-pollution washing of 25kV composite porcelain insulators and tower wagon inspection of contact wire height/stagger.',
    machineryDeployed: ['Self-Propelled 8-Wheeler Tower Wagon (RU-81)', '25kV Earthing Rods & Discharge Equipment'],
    requestedDate: '2026-09-11',
    requestedStartTime: '01:30',
    requestedEndTime: '04:30',
    durationMinutes: 180,
    powerBlockRequired: true,
    trafficBlockRequired: true,
    disconnectionMemoRequired: false,
    shadowBlockEligible: true,
    speedRestrictionKmH: null,
    priority: 'ROUTINE_PLANNED',
    status: 'PENDING',
    submittedAt: '2026-09-10 12:05 IST',
    safetyChecklistAcknowledged: true,
  },
  {
    id: 'RB-TRD-2026-020',
    department: 'TRD',
    applicantName: 'Er. Mann Butani',
    applicantDesignation: 'Sr. Section Engineer (TRD/DLI)',
    division: 'Delhi (DLI)',
    section: 'Panipat Jn (PNP) - Ambala Cantt (UMB)',
    stationFrom: 'Karnal (KUN)',
    stationTo: 'Kurukshetra Jn (KKDE)',
    lineType: 'DN Main',
    startKm: 'KM 122/00',
    endKm: 'KM 126/50',
    workCategory: 'Neutral Section Inspection & Phase Gap Tuning',
    workDescription: 'Overhaul of PTFE short neutral section and arc trap horns following flashover alert reported by Loco Pilot of 12005 Kalka Shatabdi.',
    machineryDeployed: ['Self-Propelled 8-Wheeler Tower Wagon (RU-81)', 'Torque Wrench & Stagger Gauge Kit'],
    requestedDate: '2026-09-11',
    requestedStartTime: '00:30',
    requestedEndTime: '03:30',
    durationMinutes: 180,
    powerBlockRequired: true,
    trafficBlockRequired: true,
    disconnectionMemoRequired: false,
    shadowBlockEligible: false,
    speedRestrictionKmH: 60,
    priority: 'SAFETY_CRITICAL',
    status: 'APPROVED',
    submittedAt: '2026-09-09 20:40 IST',
    reviewedAt: '2026-09-09 22:15 IST',
    reviewedBy: 'Sh. Niyati Joshi (DOM/Control)',
    approvedStartTime: '00:30',
    approvedEndTime: '03:30',
    approvedDurationMinutes: 180,
    cautionOrderDetails: 'CO #114/09: Coasting through neutral section at max 60 KMPH for pantograph lowering testing.',
    controllerRemarks: 'Approved as Safety Urgent. TPC advised to isolate feeder 214 and issue power block permit No. PB-981.',
    safetyChecklistAcknowledged: true,
  },
  {
    id: 'RB-ENG-2026-084',
    department: 'ENGINEERING',
    applicantName: 'Sh. Harsh Savalia',
    applicantDesignation: 'Sr. Section Engineer (P-Way/GZB)',
    division: 'Delhi (DLI)',
    section: 'Panipat Jn (PNP) - Ambala Cantt (UMB)',
    stationFrom: 'Karnal (KUN)',
    stationTo: 'Taraori (TRR)',
    lineType: 'UP Main',
    startKm: 'KM 120/10',
    endKm: 'KM 123/40',
    workCategory: 'Turnout & Diamond Crossing Overhaul',
    workDescription: 'Complete renewal of 1:12 thick web curved switch assembly and laser guided turnout packing at Karnal UP yard approach.',
    machineryDeployed: ['Unimat 08-4S Turnout Tamper (UN-14)', 'Ballast Regulator (BR-09)'],
    requestedDate: '2026-09-12',
    requestedStartTime: '02:00',
    requestedEndTime: '05:00',
    durationMinutes: 180,
    powerBlockRequired: false,
    trafficBlockRequired: true,
    disconnectionMemoRequired: true,
    shadowBlockEligible: true,
    speedRestrictionKmH: 30,
    priority: 'SAFETY_CRITICAL',
    status: 'PENDING',
    submittedAt: '2026-09-10 13:40 IST',
    safetyChecklistAcknowledged: true,
  },
  {
    id: 'RB-ST-2026-045',
    department: 'ST',
    applicantName: 'Smt. Khush Patel',
    applicantDesignation: 'Sr. Section Engineer (Signal & Telecom/DLI)',
    division: 'Delhi (DLI)',
    section: 'Panipat Jn (PNP) - Ambala Cantt (UMB)',
    stationFrom: 'Karnal (KUN)',
    stationTo: 'Taraori (TRR)',
    lineType: 'UP Main',
    startKm: 'KM 120/15',
    endKm: 'KM 121/00',
    workCategory: 'Point Machine Periodic Overhaul (POH)',
    workDescription: 'Synchronization and lock bar detector adjustment of Point #202A on renewed turnout with track circuit bonding renewal.',
    machineryDeployed: ['Point Motor Test Console (PM-80)', 'Joint Disconnection Test Kit'],
    requestedDate: '2026-09-12',
    requestedStartTime: '02:15',
    requestedEndTime: '04:45',
    durationMinutes: 150,
    powerBlockRequired: false,
    trafficBlockRequired: true,
    disconnectionMemoRequired: true,
    shadowBlockEligible: true,
    speedRestrictionKmH: null,
    priority: 'ROUTINE_PLANNED',
    status: 'PENDING',
    submittedAt: '2026-09-10 14:05 IST',
    safetyChecklistAcknowledged: true,
  },
  // -------------------------------------------------------------
  // Western Railway (WR) - Mumbai Central Division (MMCT)
  // -------------------------------------------------------------
  {
    id: 'RB-ENG-WR-101',
    department: 'ENGINEERING',
    applicantName: 'Er. Tisha Chandnani',
    applicantDesignation: 'Sr. Section Engineer (P-Way/BVI)',
    zone: 'Western Railway (WR)',
    zoneCode: 'WR',
    division: 'Mumbai Central Division (MMCT)',
    section: 'Borivali (BVI) - Virar (VR) Quadruple Line',
    stationFrom: 'Borivali (BVI)',
    stationTo: 'Bhayandar (BYR)',
    lineType: 'DN Fast',
    startKm: 'KM 38/10',
    endKm: 'KM 42/00',
    workCategory: 'Through Rail Renewal (TRR)',
    workDescription: 'Ultrasonic flaw elimination and continuous welded rail replacement across Bassein Creek bridge approaches.',
    machineryDeployed: ['Continuous Tamping Machine (CSM #22)', 'Dynamic Track Stabilizer (DGS #11)'],
    requestedDate: '2026-09-12',
    requestedStartTime: '01:30',
    requestedEndTime: '04:30',
    durationMinutes: 180,
    powerBlockRequired: false,
    trafficBlockRequired: true,
    disconnectionMemoRequired: false,
    shadowBlockEligible: true,
    speedRestrictionKmH: 45,
    priority: 'ROUTINE_PLANNED',
    status: 'APPROVED',
    submittedAt: '2026-09-10 11:30 IST',
    reviewedAt: '2026-09-10 13:00 IST',
    reviewedBy: 'Sh. Niyati Joshi (DOM/Control)',
    approvedStartTime: '01:30',
    approvedEndTime: '04:30',
    approvedDurationMinutes: 180,
    safetyChecklistAcknowledged: true,
  },
  {
    id: 'RB-TRD-WR-102',
    department: 'TRD',
    applicantName: 'Er. Aditya Chavan',
    applicantDesignation: 'Sr. Section Engineer (TRD/BSR)',
    zone: 'Western Railway (WR)',
    zoneCode: 'WR',
    division: 'Mumbai Central Division (MMCT)',
    section: 'Virar (VR) - Dahanu Road (DRD) W-DFCC Trunk',
    stationFrom: 'Vasai Road (BSR)',
    stationTo: 'Virar (VR)',
    lineType: 'UP Through',
    startKm: 'KM 52/15',
    endKm: 'KM 56/40',
    workCategory: 'OHE Maintenance',
    workDescription: '25kV AC contact wire tension calibration and cantilever insulator cleansing on high-speed suburban corridor.',
    machineryDeployed: ['Tower Wagon (8-Wheeler RU)', 'OHE Ladder Gang & Earthing Rods'],
    requestedDate: '2026-09-13',
    requestedStartTime: '01:15',
    requestedEndTime: '04:15',
    durationMinutes: 180,
    powerBlockRequired: true,
    trafficBlockRequired: true,
    disconnectionMemoRequired: true,
    shadowBlockEligible: true,
    speedRestrictionKmH: 50,
    priority: 'ROUTINE_PLANNED',
    status: 'PENDING',
    submittedAt: '2026-09-10 14:10 IST',
    safetyChecklistAcknowledged: true,
  },
  // -------------------------------------------------------------
  // Central Railway (CR) - Pune Division (PA)
  // -------------------------------------------------------------
  {
    id: 'RB-ENG-CR-201',
    department: 'ENGINEERING',
    applicantName: 'Sh. Harsh Savalia',
    applicantDesignation: 'Sr. Section Engineer (P-Way/LNL)',
    zone: 'Central Railway (CR)',
    zoneCode: 'CR',
    division: 'Pune Division (PA)',
    section: 'Lonavala (LNL) - Bhor Ghat - Karjat (KJT)',
    stationFrom: 'Lonavala (LNL)',
    stationTo: 'Karjat (KJT)',
    lineType: 'UP Ghat Line',
    startKm: 'KM 72/10',
    endKm: 'KM 76/50',
    workCategory: 'Safety Critical Mountain Catch Siding Inspection',
    workDescription: 'Comprehensive check and rockfall protection barrier rehabilitation on steep 1:37 Bhor Ghat incline gradient.',
    machineryDeployed: ['Rail Crane (140T Heavy Lift)', 'Continuous Tamping Machine (CSM #22)'],
    requestedDate: '2026-09-12',
    requestedStartTime: '02:00',
    requestedEndTime: '05:00',
    durationMinutes: 180,
    powerBlockRequired: true,
    trafficBlockRequired: true,
    disconnectionMemoRequired: true,
    shadowBlockEligible: true,
    speedRestrictionKmH: 25,
    priority: 'SAFETY_CRITICAL',
    status: 'PENDING',
    submittedAt: '2026-09-10 12:45 IST',
    safetyChecklistAcknowledged: true,
  },
  {
    id: 'RB-ST-CR-202',
    department: 'ST',
    applicantName: 'Er. Khush Patel',
    applicantDesignation: 'Sr. Section Engineer (Signal/PA)',
    zone: 'Central Railway (CR)',
    zoneCode: 'CR',
    division: 'Pune Division (PA)',
    section: 'Pune Jn (PA) - Lonavala (LNL) Suburban Section',
    stationFrom: 'Chinchwad (CCH)',
    stationTo: 'Talegaon (TGN)',
    lineType: 'DN Main',
    startKm: 'KM 18/00',
    endKm: 'KM 22/30',
    workCategory: 'Axle Counter & Point Interlocking Overhaul',
    workDescription: 'Dual digital axle counter head testing and turnout point motor synchronization under high suburban load.',
    machineryDeployed: ['Point Motor Test Console', 'Joint Disconnection Test Kit'],
    requestedDate: '2026-09-11',
    requestedStartTime: '01:45',
    requestedEndTime: '04:15',
    durationMinutes: 150,
    powerBlockRequired: false,
    trafficBlockRequired: true,
    disconnectionMemoRequired: true,
    shadowBlockEligible: true,
    speedRestrictionKmH: 30,
    priority: 'ROUTINE_PLANNED',
    status: 'APPROVED',
    submittedAt: '2026-09-09 16:30 IST',
    reviewedAt: '2026-09-09 19:15 IST',
    reviewedBy: 'Sh. Niyati Joshi (DOM/Control)',
    approvedStartTime: '01:45',
    approvedEndTime: '04:15',
    approvedDurationMinutes: 150,
    safetyChecklistAcknowledged: true,
  },
  // -------------------------------------------------------------
  // Eastern Railway (ER) - Sealdah Division (SDAH)
  // -------------------------------------------------------------
  {
    id: 'RB-ENG-ER-301',
    department: 'ENGINEERING',
    applicantName: 'Sh. Mann Butani',
    applicantDesignation: 'Sr. Section Engineer (P-Way/SDAH)',
    zone: 'Eastern Railway (ER)',
    zoneCode: 'ER',
    division: 'Sealdah Division (SDAH)',
    section: 'Sealdah (SDAH) - Naihati Jn (NH) Quadruple Line',
    stationFrom: 'Sealdah (SDAH)',
    stationTo: 'Dum Dum Jn (DDJ)',
    lineType: '3rd Suburban',
    startKm: 'KM 4/10',
    endKm: 'KM 7/30',
    workCategory: 'CSM Plain Track Tamping',
    workDescription: 'Laser-guided track tamping and ballast profile dressing across busy Sealdah north suburban throat corridor.',
    machineryDeployed: ['Continuous Tamping Machine (CSM #22)', 'Dynamic Track Stabilizer (DGS #11)'],
    requestedDate: '2026-09-12',
    requestedStartTime: '01:00',
    requestedEndTime: '04:00',
    durationMinutes: 180,
    powerBlockRequired: false,
    trafficBlockRequired: true,
    disconnectionMemoRequired: false,
    shadowBlockEligible: true,
    speedRestrictionKmH: 40,
    priority: 'ROUTINE_PLANNED',
    status: 'PENDING',
    submittedAt: '2026-09-10 13:10 IST',
    safetyChecklistAcknowledged: true,
  },
  {
    id: 'RB-TRD-ER-302',
    department: 'TRD',
    applicantName: 'Er. Niyati Joshi',
    applicantDesignation: 'Sr. Section Engineer (TRD/NH)',
    zone: 'Eastern Railway (ER)',
    zoneCode: 'ER',
    division: 'Sealdah Division (SDAH)',
    section: 'Naihati (NH) - Ranaghat Jn (RHA) Main Line',
    stationFrom: 'Naihati (NH)',
    stationTo: 'Ranaghat (RHA)',
    lineType: 'UP Main',
    startKm: 'KM 42/10',
    endKm: 'KM 48/60',
    workCategory: 'OHE Maintenance',
    workDescription: 'Replacement of worn copper contact droppers and section insulator overhaul before peak puja suburban rush.',
    machineryDeployed: ['Tower Wagon (8-Wheeler RU)', 'OHE Ladder Gang & Earthing Rods'],
    requestedDate: '2026-09-13',
    requestedStartTime: '01:30',
    requestedEndTime: '04:30',
    durationMinutes: 180,
    powerBlockRequired: true,
    trafficBlockRequired: true,
    disconnectionMemoRequired: true,
    shadowBlockEligible: true,
    speedRestrictionKmH: 45,
    priority: 'ROUTINE_PLANNED',
    status: 'APPROVED',
    submittedAt: '2026-09-10 09:20 IST',
    reviewedAt: '2026-09-10 11:15 IST',
    reviewedBy: 'Sh. Niyati Joshi (DOM/Control)',
    approvedStartTime: '01:30',
    approvedEndTime: '04:30',
    approvedDurationMinutes: 180,
    safetyChecklistAcknowledged: true,
  },
  // -------------------------------------------------------------
  // Southern Railway (SR) - Chennai Division (MAS)
  // -------------------------------------------------------------
  {
    id: 'RB-ENG-SR-401',
    department: 'ENGINEERING',
    applicantName: 'Er. Tisha Chandnani',
    applicantDesignation: 'Sr. Section Engineer (P-Way/MAS)',
    zone: 'Southern Railway (SR)',
    zoneCode: 'SR',
    division: 'Chennai Division (MAS)',
    section: 'Chennai Central (MAS) - Avadi - Arakkonam (AJJ)',
    stationFrom: 'Chennai Central (MAS)',
    stationTo: 'Basin Bridge (BBQ)',
    lineType: 'UP Fast',
    startKm: 'KM 1/20',
    endKm: 'KM 3/80',
    workCategory: 'Turnout & Diamond Crossing Overhaul',
    workDescription: 'Turnout tongue rail renewal and CMS crossing diamond replacement at Basin Bridge bottleneck junction.',
    machineryDeployed: ['Unimat (Turnout Tamper)', 'Rail Crane (140T Heavy Lift)'],
    requestedDate: '2026-09-12',
    requestedStartTime: '01:30',
    requestedEndTime: '05:00',
    durationMinutes: 210,
    powerBlockRequired: false,
    trafficBlockRequired: true,
    disconnectionMemoRequired: true,
    shadowBlockEligible: true,
    speedRestrictionKmH: 20,
    priority: 'SAFETY_CRITICAL',
    status: 'APPROVED',
    submittedAt: '2026-09-09 15:40 IST',
    reviewedAt: '2026-09-09 18:20 IST',
    reviewedBy: 'Sh. Niyati Joshi (DOM/Control)',
    approvedStartTime: '01:30',
    approvedEndTime: '05:00',
    approvedDurationMinutes: 210,
    safetyChecklistAcknowledged: true,
  },
  {
    id: 'RB-ST-SR-402',
    department: 'ST',
    applicantName: 'Er. Aditya Chavan',
    applicantDesignation: 'Sr. Section Engineer (Signal/MS)',
    zone: 'Southern Railway (SR)',
    zoneCode: 'SR',
    division: 'Chennai Division (MAS)',
    section: 'Chennai Egmore (MS) - Tambaram - Chengalpattu (CGL)',
    stationFrom: 'Tambaram (TBM)',
    stationTo: 'Chengalpattu (CGL)',
    lineType: 'DN Suburban',
    startKm: 'KM 32/10',
    endKm: 'KM 35/40',
    workCategory: 'Signal Interlocking',
    workDescription: 'Electronic Interlocking (EI) software logic verification and standby warm-redundancy switchover testing.',
    machineryDeployed: ['Point Motor Test Console', 'Joint Disconnection Test Kit'],
    requestedDate: '2026-09-13',
    requestedStartTime: '02:00',
    requestedEndTime: '04:30',
    durationMinutes: 150,
    powerBlockRequired: false,
    trafficBlockRequired: true,
    disconnectionMemoRequired: true,
    shadowBlockEligible: true,
    speedRestrictionKmH: 30,
    priority: 'ROUTINE_PLANNED',
    status: 'PENDING',
    submittedAt: '2026-09-10 14:50 IST',
    safetyChecklistAcknowledged: true,
  },
];

const STORAGE_KEY = 'raksha_block_requests_v3_pan_india';
const CURRENT_USER_KEY = 'raksha_block_current_user_v1';

export function normalizePersonName(value?: string): string | undefined {
  if (!value) return value;
  return value
    .replace(/Rajeshwar Sharma/g, 'Harsh Savalia')
    .replace(/Ananya Sengupta/g, 'Khush Patel')
    .replace(/Vikramaditya Rao/g, 'Mann Butani')
    .replace(/Mahendra P\. Verma/g, 'Niyati Joshi')
    .replace(/Sandeep Solanki/g, 'Tisha Chandnani')
    .replace(/Nilesh Bhavsar/g, 'Aditya Chavan')
    .replace(/Aniket Deshmukh/g, 'Harsh Savalia')
    .replace(/Suhas Kulkarni/g, 'Khush Patel')
    .replace(/Subhashis Banerjee/g, 'Mann Butani')
    .replace(/Debabrata Roy/g, 'Niyati Joshi')
    .replace(/K\. Murugan/g, 'Tisha Chandnani')
    .replace(/R\. Senthil Kumar/g, 'Aditya Chavan');
}

export function getStoredRequests(): BlockRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BLOCK_REQUESTS));
      return INITIAL_BLOCK_REQUESTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed.map((request: BlockRequest) => ({
      ...request,
      applicantName: normalizePersonName(request.applicantName) || request.applicantName,
      reviewedBy: normalizePersonName(request.reviewedBy),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch (err) {
    console.error('Failed to read from localStorage', err);
    return [];
  }
}

export function saveStoredRequests(requests: BlockRequest[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
}

export function clearAllStoredRequests(): BlockRequest[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch (err) {
    console.error('Failed to clear localStorage', err);
  }
  return [];
}

export function resetStoredRequests(): BlockRequest[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BLOCK_REQUESTS));
    return INITIAL_BLOCK_REQUESTS;
  } catch (err) {
    console.error('Failed to reset localStorage', err);
    return INITIAL_BLOCK_REQUESTS;
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as User;
    return { ...user, name: normalizePersonName(user.name) || user.name };
  } catch {
    return null;
  }
}

export function saveStoredUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (err) {
    console.error('Failed to save user session', err);
  }
}

// AI / Automatic Shadow Block Detection Helper
// Detects when multiple departments request overlapping sections and windows
export function detectShadowBlockOpportunities(requests: BlockRequest[]): ShadowBlockOpportunity[] {
  const pendingOrApproved = requests.filter(r => r.status === 'PENDING' || r.status === 'APPROVED');
  const opportunities: ShadowBlockOpportunity[] = [];

  for (let i = 0; i < pendingOrApproved.length; i++) {
    for (let j = i + 1; j < pendingOrApproved.length; j++) {
      const a = pendingOrApproved[i];
      const b = pendingOrApproved[j];

      // Different departments, same section, same line, same date
      if (
        a.department !== b.department &&
        a.section === b.section &&
        a.lineType === b.lineType &&
        a.requestedDate === b.requestedDate
      ) {
        opportunities.push({
          primaryBlockId: a.id,
          candidateBlockId: b.id,
          primaryDepartment: a.department,
          candidateDepartment: b.department,
          section: a.section,
          lineType: a.lineType,
          overlapDate: a.requestedDate,
          reason: `Coordinated Track & OHE/Signal Corridor: Concurrent block on ${a.lineType} (${a.stationFrom} - ${a.stationTo}) eliminates dual train line blockades!`,
          estimatedDetentionSavedMinutes: 140,
        });
      }
    }
  }

  return opportunities;
}
