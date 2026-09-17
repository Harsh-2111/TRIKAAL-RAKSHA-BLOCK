// Geographic coordinate definitions for Indian Railways 5 Major Zonal Networks:
// Northern Railway (NR), Western Railway (WR), Central Railway (CR), Eastern Railway (ER), Southern Railway (SR)
// Satellite GIS Map Overlay for RAKSHA-BLOCK

import { RailwayZoneCode, ZonalRailwayInfo } from '../types';

export interface StationNode {
  code: string;
  name: string;
  lat: number;
  lng: number;
  division: string;
  zone: RailwayZoneCode;
  isJunction: boolean;
}

export interface CorridorPolyline {
  id: string;
  code: string;
  name: string;
  kmSpan: string;
  zone: RailwayZoneCode;
  division: string;
  coordinates: [number, number][];
  defaultStatus: 'CLEAR' | 'ACTIVE' | 'SCHEDULED' | 'PENDING';
  lines: string[];
}

// 5 Major Zonal Railways Configuration
export const ZONAL_RAILWAYS: Record<RailwayZoneCode, ZonalRailwayInfo> = {
  ALL: {
    code: 'ALL',
    shortName: 'Pan-India',
    fullName: 'All India (Pan-India Unified View)',
    hindiName: 'अखिल भारतीय एकीकृत नेटवर्क',
    divisionCode: 'PAN-IR',
    divisionName: 'All 5 Major Zonal Networks (NR, WR, CR, ER, SR)',
    headquarters: 'Rail Bhavan, New Delhi',
    coordinates: [21.7679, 78.8718],
    defaultZoom: 5,
    trafficDensity: 'Pan-India Combined Network (1,150+ Trains/day)',
    densityMultiplier: 1.3,
    dailyTrains: 1180,
    color: '#000075',
  },
  NR: {
    code: 'NR',
    shortName: 'NR (Delhi Division)',
    fullName: 'NR - Delhi Division (DLI)',
    hindiName: 'उत्तर रेलवे • दिल्ली मंडल',
    divisionCode: 'DLI',
    divisionName: 'Delhi Division (DLI)',
    headquarters: 'Baroda House, New Delhi',
    coordinates: [28.6139, 77.2090], // NR Delhi Division
    defaultZoom: 10,
    trafficDensity: 'Critical Golden Quadrilateral & Rajdhani Trunk (180+ Trains/day)',
    densityMultiplier: 1.25,
    dailyTrains: 220,
    color: '#2563EB',
  },
  WR: {
    code: 'WR',
    shortName: 'Western Railway (WR)',
    fullName: 'Western Railway (WR) - Mumbai Central Division (MMCT)',
    hindiName: 'पश्चिम रेलवे • मुंबई सेंट्रल मंडल',
    divisionCode: 'MMCT',
    divisionName: 'Mumbai Central Division (MMCT)',
    headquarters: 'Churchgate, Mumbai',
    coordinates: [18.9696, 72.8193], // WR Mumbai Central Division
    defaultZoom: 11,
    trafficDensity: 'Extremely Dense Suburban & W-DFCC Freight Arterial (260+ Trains/day)',
    densityMultiplier: 1.5,
    dailyTrains: 310,
    color: '#D97706',
  },
  CR: {
    code: 'CR',
    shortName: 'Central Railway (CR)',
    fullName: 'Central Railway (CR) - Pune Division (PA)',
    hindiName: 'मध्य रेलवे • पुणे मंडल',
    divisionCode: 'PA',
    divisionName: 'Pune Division (PA)',
    headquarters: 'Pune Junction / CSMT',
    coordinates: [18.5204, 73.8567], // CR Pune Division
    defaultZoom: 11,
    trafficDensity: 'High Density Bhor Ghat & Heavy Chord Corridor (170+ Trains/day)',
    densityMultiplier: 1.2,
    dailyTrains: 190,
    color: '#DC2626',
  },
  ER: {
    code: 'ER',
    shortName: 'Eastern Railway (ER)',
    fullName: 'Eastern Railway (ER) - Sealdah Division (SDAH)',
    hindiName: 'पूर्व रेलवे • सियालदह मंडल',
    divisionCode: 'SDAH',
    divisionName: 'Sealdah Division (SDAH)',
    headquarters: 'Fairlie Place, Kolkata',
    coordinates: [22.5726, 88.3639], // ER Sealdah Division
    defaultZoom: 11,
    trafficDensity: 'High Density EMU Suburban & Heavy Coal Trunk (210+ Trains/day)',
    densityMultiplier: 1.35,
    dailyTrains: 260,
    color: '#059669',
  },
  SR: {
    code: 'SR',
    shortName: 'Southern Railway (SR)',
    fullName: 'Southern Railway (SR) - Chennai Division (MAS)',
    hindiName: 'दक्षिण रेलवे • चेन्नई मंडल',
    divisionCode: 'MAS',
    divisionName: 'Chennai Division (MAS)',
    headquarters: 'NGO Annex, Park Town, Chennai',
    coordinates: [13.0827, 80.2707], // SR Chennai Division
    defaultZoom: 11,
    trafficDensity: 'Heavy Southern Trunk & Port Freight Connectivity (160+ Trains/day)',
    densityMultiplier: 1.15,
    dailyTrains: 180,
    color: '#7C3AED',
  },
};

// All Station Nodes categorized by Zonal Network
export const STATIONS: Record<string, StationNode> = {
  // -------------------------------------------------------------
  // NORTHERN RAILWAY (NR) - Delhi Division (DLI)
  // -------------------------------------------------------------
  NDLS: { code: 'NDLS', name: 'New Delhi', lat: 28.6429, lng: 77.2195, division: 'DLI', zone: 'NR', isJunction: true },
  DLI: { code: 'DLI', name: 'Delhi Junction (Old Delhi)', lat: 28.6606, lng: 77.2272, division: 'DLI', zone: 'NR', isJunction: true },
  NZM: { code: 'NZM', name: 'Hazrat Nizamuddin', lat: 28.5888, lng: 77.2534, division: 'DLI', zone: 'NR', isJunction: true },
  TKD: { code: 'TKD', name: 'Tuglakabad Marshalling Yard', lat: 28.5085, lng: 77.2917, division: 'DLI', zone: 'NR', isJunction: true },
  ANVT: { code: 'ANVT', name: 'Anand Vihar Terminal', lat: 28.6506, lng: 77.3153, division: 'DLI', zone: 'NR', isJunction: true },
  SBB: { code: 'SBB', name: 'Sahibabad Junction', lat: 28.6710, lng: 77.3480, division: 'DLI', zone: 'NR', isJunction: true },
  GZB: { code: 'GZB', name: 'Ghaziabad Junction', lat: 28.6692, lng: 77.4538, division: 'DLI', zone: 'NR', isJunction: true },
  DSA: { code: 'DSA', name: 'Delhi Shahdara Junction', lat: 28.6728, lng: 77.2885, division: 'DLI', zone: 'NR', isJunction: true },
  HPU: { code: 'HPU', name: 'Hapur Junction', lat: 28.7306, lng: 77.7759, division: 'MB', zone: 'NR', isJunction: true },
  MB: { code: 'MB', name: 'Moradabad Junction', lat: 28.8389, lng: 78.7768, division: 'MB', zone: 'NR', isJunction: true },
  PNP: { code: 'PNP', name: 'Panipat Junction', lat: 29.3909, lng: 76.9635, division: 'DLI', zone: 'NR', isJunction: true },
  KUN: { code: 'KUN', name: 'Karnal', lat: 29.6857, lng: 76.9905, division: 'DLI', zone: 'NR', isJunction: false },
  KKDE: { code: 'KKDE', name: 'Kurukshetra Junction', lat: 29.9695, lng: 76.8783, division: 'DLI', zone: 'NR', isJunction: true },
  UMB: { code: 'UMB', name: 'Ambala Cantt Junction', lat: 30.3610, lng: 76.8185, division: 'UMB', zone: 'NR', isJunction: true },
  ALJN: { code: 'ALJN', name: 'Aligarh Junction', lat: 27.8974, lng: 78.0880, division: 'DLI', zone: 'NR', isJunction: true },
  HRS: { code: 'HRS', name: 'Hathras Junction', lat: 27.5958, lng: 78.0560, division: 'DLI', zone: 'NR', isJunction: true },
  TDL: { code: 'TDL', name: 'Tundla Junction', lat: 27.2084, lng: 78.2415, division: 'DLI', zone: 'NR', isJunction: true },
  DEC: { code: 'DEC', name: 'Delhi Cantt', lat: 28.5912, lng: 77.1278, division: 'DLI', zone: 'NR', isJunction: false },
  GGN: { code: 'GGN', name: 'Gurgaon', lat: 28.4690, lng: 77.0180, division: 'DLI', zone: 'NR', isJunction: false },
  RE: { code: 'RE', name: 'Rewari Junction', lat: 28.1920, lng: 76.6239, division: 'DLI', zone: 'NR', isJunction: true },

  // -------------------------------------------------------------
  // WESTERN RAILWAY (WR) - Mumbai Central Division (MMCT)
  // -------------------------------------------------------------
  CCG: { code: 'CCG', name: 'Churchgate', lat: 18.9322, lng: 72.8264, division: 'MMCT', zone: 'WR', isJunction: false },
  MMCT: { code: 'MMCT', name: 'Mumbai Central', lat: 18.9696, lng: 72.8193, division: 'MMCT', zone: 'WR', isJunction: true },
  DDR: { code: 'DDR', name: 'Dadar (WR)', lat: 19.0178, lng: 72.8428, division: 'MMCT', zone: 'WR', isJunction: true },
  BDTS: { code: 'BDTS', name: 'Bandra Terminus', lat: 19.0544, lng: 72.8406, division: 'MMCT', zone: 'WR', isJunction: true },
  ADH: { code: 'ADH', name: 'Andheri', lat: 19.1197, lng: 72.8464, division: 'MMCT', zone: 'WR', isJunction: true },
  BVI: { code: 'BVI', name: 'Borivali', lat: 19.2290, lng: 72.8570, division: 'MMCT', zone: 'WR', isJunction: true },
  BYR: { code: 'BYR', name: 'Bhayandar', lat: 19.3014, lng: 72.8530, division: 'MMCT', zone: 'WR', isJunction: false },
  BSR: { code: 'BSR', name: 'Vasai Road Junction', lat: 19.3820, lng: 72.8320, division: 'MMCT', zone: 'WR', isJunction: true },
  VR: { code: 'VR', name: 'Virar Terminal', lat: 19.4540, lng: 72.8110, division: 'MMCT', zone: 'WR', isJunction: true },
  PLG: { code: 'PLG', name: 'Palghar', lat: 19.6970, lng: 72.7660, division: 'MMCT', zone: 'WR', isJunction: false },
  DRD: { code: 'DRD', name: 'Dahanu Road', lat: 19.9720, lng: 72.7310, division: 'MMCT', zone: 'WR', isJunction: true },
  VAPI: { code: 'VAPI', name: 'Vapi Industrial Yard', lat: 20.3710, lng: 72.9040, division: 'MMCT', zone: 'WR', isJunction: true },
  ST: { code: 'ST', name: 'Surat Junction', lat: 21.2050, lng: 72.8410, division: 'MMCT', zone: 'WR', isJunction: true },

  // -------------------------------------------------------------
  // CENTRAL RAILWAY (CR) - Pune Division (PA)
  // -------------------------------------------------------------
  PA: { code: 'PA', name: 'Pune Junction', lat: 18.5284, lng: 73.8743, division: 'PA', zone: 'CR', isJunction: true },
  SVJR: { code: 'SVJR', name: 'Shivajinagar', lat: 18.5320, lng: 73.8520, division: 'PA', zone: 'CR', isJunction: false },
  KK: { code: 'KK', name: 'Khadki', lat: 18.5630, lng: 73.8340, division: 'PA', zone: 'CR', isJunction: false },
  DAPD: { code: 'DAPD', name: 'Dapodi', lat: 18.5780, lng: 73.8290, division: 'PA', zone: 'CR', isJunction: false },
  PMP: { code: 'PMP', name: 'Pimpri', lat: 18.6230, lng: 73.8000, division: 'PA', zone: 'CR', isJunction: false },
  CCH: { code: 'CCH', name: 'Chinchwad', lat: 18.6360, lng: 73.7880, division: 'PA', zone: 'CR', isJunction: false },
  TGN: { code: 'TGN', name: 'Talegaon', lat: 18.7320, lng: 73.6760, division: 'PA', zone: 'CR', isJunction: true },
  LNL: { code: 'LNL', name: 'Lonavala Ghat Junction', lat: 18.7557, lng: 73.4091, division: 'PA', zone: 'CR', isJunction: true },
  KJT: { code: 'KJT', name: 'Karjat Junction', lat: 18.9100, lng: 73.3240, division: 'PA', zone: 'CR', isJunction: true },
  URI: { code: 'URI', name: 'Uruli Yard', lat: 18.4780, lng: 74.1250, division: 'PA', zone: 'CR', isJunction: false },
  DD: { code: 'DD', name: 'Daund Junction', lat: 18.4630, lng: 74.5820, division: 'PA', zone: 'CR', isJunction: true },
  STR: { code: 'STR', name: 'Satara', lat: 17.6830, lng: 74.0300, division: 'PA', zone: 'CR', isJunction: false },
  MRJ: { code: 'MRJ', name: 'Miraj Junction', lat: 16.8220, lng: 74.6460, division: 'PA', zone: 'CR', isJunction: true },

  // -------------------------------------------------------------
  // EASTERN RAILWAY (ER) - Sealdah Division (SDAH)
  // -------------------------------------------------------------
  SDAH: { code: 'SDAH', name: 'Sealdah Main Terminal', lat: 22.5675, lng: 88.3711, division: 'SDAH', zone: 'ER', isJunction: true },
  KOAA: { code: 'KOAA', name: 'Kolkata Chitpur Terminal', lat: 22.6020, lng: 88.3770, division: 'SDAH', zone: 'ER', isJunction: true },
  BNXR: { code: 'BNXR', name: 'Bidhan Nagar Road', lat: 22.5870, lng: 88.3880, division: 'SDAH', zone: 'ER', isJunction: false },
  DDJ: { code: 'DDJ', name: 'Dum Dum Junction', lat: 22.6220, lng: 88.3930, division: 'SDAH', zone: 'ER', isJunction: true },
  BP: { code: 'BP', name: 'Barrackpore', lat: 22.7630, lng: 88.3640, division: 'SDAH', zone: 'ER', isJunction: false },
  NH: { code: 'NH', name: 'Naihati Junction', lat: 22.8910, lng: 88.4230, division: 'SDAH', zone: 'ER', isJunction: true },
  RHA: { code: 'RHA', name: 'Ranaghat Junction', lat: 23.1800, lng: 88.5800, division: 'SDAH', zone: 'ER', isJunction: true },
  KNJ: { code: 'KNJ', name: 'Krishnanagar City Junction', lat: 23.4000, lng: 88.5000, division: 'SDAH', zone: 'ER', isJunction: true },
  BT: { code: 'BT', name: 'Barasat Junction', lat: 22.7210, lng: 88.4810, division: 'SDAH', zone: 'ER', isJunction: true },
  HNB: { code: 'HNB', name: 'Hasnabad Terminal', lat: 22.5700, lng: 88.9100, division: 'SDAH', zone: 'ER', isJunction: false },
  BGA: { code: 'BGA', name: 'Budge Budge Oil Depot', lat: 22.4820, lng: 88.1810, division: 'SDAH', zone: 'ER', isJunction: true },

  // -------------------------------------------------------------
  // SOUTHERN RAILWAY (SR) - Chennai Division (MAS)
  // -------------------------------------------------------------
  MAS: { code: 'MAS', name: 'Puratchi Thalaivar Dr. MGR Chennai Central', lat: 13.0827, lng: 80.2755, division: 'MAS', zone: 'SR', isJunction: true },
  MS: { code: 'MS', name: 'Chennai Egmore', lat: 13.0780, lng: 80.2610, division: 'MAS', zone: 'SR', isJunction: true },
  BBQ: { code: 'BBQ', name: 'Basin Bridge Junction', lat: 13.0970, lng: 80.2720, division: 'MAS', zone: 'SR', isJunction: true },
  PER: { code: 'PER', name: 'Perambur Carriage Works', lat: 13.1090, lng: 80.2370, division: 'MAS', zone: 'SR', isJunction: true },
  VLK: { code: 'VLK', name: 'Villivakkam Yard', lat: 13.1110, lng: 80.2070, division: 'MAS', zone: 'SR', isJunction: false },
  AVD: { code: 'AVD', name: 'Avadi Heavy Yard', lat: 13.1170, lng: 80.1010, division: 'MAS', zone: 'SR', isJunction: true },
  TRL: { code: 'TRL', name: 'Tiruvallur Junction', lat: 13.1430, lng: 79.9100, division: 'MAS', zone: 'SR', isJunction: true },
  AJJ: { code: 'AJJ', name: 'Arakkonam Junction', lat: 13.0780, lng: 79.6670, division: 'MAS', zone: 'SR', isJunction: true },
  TBM: { code: 'TBM', name: 'Tambaram Suburban Terminal', lat: 12.9250, lng: 80.1170, division: 'MAS', zone: 'SR', isJunction: true },
  CGL: { code: 'CGL', name: 'Chengalpattu Junction', lat: 12.6920, lng: 79.9760, division: 'MAS', zone: 'SR', isJunction: true },
};

// Polylines following actual railway alignments over Esri satellite terrain for each zone
export const CORRIDOR_POLYLINES: CorridorPolyline[] = [
  // -------------------------------------------------------------
  // NR (Delhi Division)
  // -------------------------------------------------------------
  {
    id: 'corr-nr-gzb-ndls',
    code: 'GZB-NDLS',
    name: 'Ghaziabad (GZB) - New Delhi (NDLS) Quadruple Line',
    kmSpan: 'KM 12.4 to KM 28.6',
    zone: 'NR',
    division: 'DLI',
    coordinates: [
      [28.6692, 77.4538], // GZB
      [28.6705, 77.4010], // Hindon River Bridge
      [28.6710, 77.3480], // SBB
      [28.6506, 77.3153], // ANVT
      [28.6415, 77.2800], // Yamuna Railway Bridge
      [28.6360, 77.2450], // Tilak Bridge
      [28.6385, 77.2310], // Shivaji Bridge
      [28.6429, 77.2195], // NDLS
    ],
    defaultStatus: 'ACTIVE',
    lines: ['UP Main', 'DN Main', '3rd Line', '4th Line'],
  },
  {
    id: 'corr-nr-ndls-tkd',
    code: 'NDLS-TKD',
    name: 'New Delhi (NDLS) - Tuglakabad (TKD) Mainline',
    kmSpan: 'KM 0.0 to KM 17.8',
    zone: 'NR',
    division: 'DLI',
    coordinates: [
      [28.6429, 77.2195], // NDLS
      [28.6300, 77.2340], // Pragati Maidan
      [28.5888, 77.2534], // NZM
      [28.5440, 77.2800], // Okhla
      [28.5085, 77.2917], // TKD
    ],
    defaultStatus: 'SCHEDULED',
    lines: ['UP Main', 'DN Main', 'UP Goods Reliever', 'DN Goods Reliever'],
  },
  {
    id: 'corr-nr-pnp-umb',
    code: 'PNP-UMB',
    name: 'Delhi - Panipat (PNP) - Ambala Cantt (UMB) Corridor',
    kmSpan: 'KM 88.0 to KM 198.5',
    zone: 'NR',
    division: 'DLI',
    coordinates: [
      [28.6606, 77.2272], // DLI
      [28.6850, 77.1950], // Sabzi Mandi
      [28.7900, 77.1350], // Narela
      [28.9930, 77.0150], // Sonipat
      [29.3909, 76.9635], // PNP
      [29.6857, 76.9905], // KUN
      [29.9695, 76.8783], // KKDE
      [30.1500, 76.8400], // Shahabad
      [30.3610, 76.8185], // UMB
    ],
    defaultStatus: 'PENDING',
    lines: ['UP Main', 'DN Main'],
  },
  {
    id: 'corr-nr-aljn-tdl',
    code: 'ALJN-TDL',
    name: 'Aligarh (ALJN) - Hathras - Tundla (TDL) Golden Quadrilateral',
    kmSpan: 'KM 1329.5 to KM 1388.2',
    zone: 'NR',
    division: 'DLI',
    coordinates: [
      [27.8974, 78.0880], // ALJN
      [27.7500, 78.0700], // Mandrak
      [27.5958, 78.0560], // HRS
      [27.4200, 78.1400], // Barhan
      [27.2084, 78.2415], // TDL
    ],
    defaultStatus: 'SCHEDULED',
    lines: ['UP Main', 'DN Main', 'Loop Line 1', 'Loop Line 2'],
  },

  // -------------------------------------------------------------
  // WR (Mumbai Central Division)
  // -------------------------------------------------------------
  {
    id: 'corr-wr-ccg-bvi',
    code: 'CCG-BVI',
    name: 'Churchgate (CCG) - Mumbai Central (MMCT) - Borivali (BVI) Fast Corridor',
    kmSpan: 'KM 0.0 to KM 34.2',
    zone: 'WR',
    division: 'MMCT',
    coordinates: [
      [18.9322, 72.8264], // CCG
      [18.9696, 72.8193], // MMCT
      [19.0178, 72.8428], // DDR
      [19.0544, 72.8406], // BDTS
      [19.1197, 72.8464], // ADH
      [19.2290, 72.8570], // BVI
    ],
    defaultStatus: 'ACTIVE',
    lines: ['UP Fast', 'DN Fast', 'UP Slow', 'DN Slow', '5th Harbor Line'],
  },
  {
    id: 'corr-wr-bvi-vr',
    code: 'BVI-VR',
    name: 'Borivali (BVI) - Bhayandar - Vasai Road - Virar (VR) Quadruple Line',
    kmSpan: 'KM 34.2 to KM 60.1',
    zone: 'WR',
    division: 'MMCT',
    coordinates: [
      [19.2290, 72.8570], // BVI
      [19.2610, 72.8580], // Dahisar
      [19.2820, 72.8550], // Mira Road
      [19.3014, 72.8530], // BYR (Bhayandar Bridge)
      [19.3450, 72.8450], // Naigaon
      [19.3820, 72.8320], // BSR (Vasai Road)
      [19.4180, 72.8220], // Nallasopara
      [19.4540, 72.8110], // VR (Virar)
    ],
    defaultStatus: 'SCHEDULED',
    lines: ['UP Through', 'DN Through', 'UP Suburban', 'DN Suburban'],
  },
  {
    id: 'corr-wr-vr-drd',
    code: 'VR-DRD',
    name: 'Virar (VR) - Palghar - Dahanu Road (DRD) W-DFCC Trunk',
    kmSpan: 'KM 60.1 to KM 124.0',
    zone: 'WR',
    division: 'MMCT',
    coordinates: [
      [19.4540, 72.8110], // VR
      [19.5520, 72.7980], // Saphale
      [19.6200, 72.7850], // Kelve Road
      [19.6970, 72.7660], // PLG (Palghar)
      [19.7890, 72.7480], // Boisar
      [19.8800, 72.7380], // Vangaon
      [19.9720, 72.7310], // DRD (Dahanu Road)
      [20.3710, 72.9040], // VAPI
      [21.2050, 72.8410], // ST (Surat)
    ],
    defaultStatus: 'PENDING',
    lines: ['UP Main Line', 'DN Main Line', 'DFCC Feeder Chord'],
  },

  // -------------------------------------------------------------
  // CR (Pune Division)
  // -------------------------------------------------------------
  {
    id: 'corr-cr-pa-lnl',
    code: 'PA-LNL',
    name: 'Pune Junction (PA) - Pimpri - Talegaon - Lonavala (LNL) Suburban Section',
    kmSpan: 'KM 0.0 to KM 64.0',
    zone: 'CR',
    division: 'PA',
    coordinates: [
      [18.5284, 73.8743], // PA
      [18.5320, 73.8520], // SVJR
      [18.5630, 73.8340], // KK
      [18.5780, 73.8290], // DAPD
      [18.6230, 73.8000], // PMP
      [18.6360, 73.7880], // CCH
      [18.7320, 73.6760], // TGN
      [18.7557, 73.4091], // LNL
    ],
    defaultStatus: 'ACTIVE',
    lines: ['UP Main', 'DN Main', 'Auto Signalling Suburban Pair'],
  },
  {
    id: 'corr-cr-lnl-kjt',
    code: 'LNL-KJT',
    name: 'Lonavala (LNL) - Bhor Ghat Section - Karjat (KJT) Catch Siding',
    kmSpan: 'KM 64.0 to KM 92.5',
    zone: 'CR',
    division: 'PA',
    coordinates: [
      [18.7557, 73.4091], // LNL
      [18.7850, 73.3850], // Khandala
      [18.8250, 73.3600], // Monkey Hill Catch Siding
      [18.8650, 73.3420], // Thakurvadi Brake Testing
      [18.8880, 73.3310], // Palasdari
      [18.9100, 73.3240], // KJT
    ],
    defaultStatus: 'SCHEDULED',
    lines: ['UP Ghat Line', 'DN Ghat Line', 'Mid Ghat Banker Track'],
  },
  {
    id: 'corr-cr-pa-dd',
    code: 'PA-DD',
    name: 'Pune Junction (PA) - Uruli - Daund Junction (DD) Doubled Line',
    kmSpan: 'KM 0.0 to KM 75.8',
    zone: 'CR',
    division: 'PA',
    coordinates: [
      [18.5284, 73.8743], // PA
      [18.5120, 73.9550], // Hadapsar
      [18.4980, 74.0350], // Loni
      [18.4780, 74.1250], // URI (Uruli)
      [18.4700, 74.2550], // Yevat
      [18.4650, 74.4100], // Kedgaon
      [18.4630, 74.5820], // DD (Daund Jn)
    ],
    defaultStatus: 'PENDING',
    lines: ['UP Main Line', 'DN Main Line'],
  },

  // -------------------------------------------------------------
  // ER (Sealdah Division)
  // -------------------------------------------------------------
  {
    id: 'corr-er-sdah-nh',
    code: 'SDAH-NH',
    name: 'Sealdah (SDAH) - Dum Dum (DDJ) - Barrackpore - Naihati (NH) Quadruple Line',
    kmSpan: 'KM 0.0 to KM 38.2',
    zone: 'ER',
    division: 'SDAH',
    coordinates: [
      [22.5675, 88.3711], // SDAH
      [22.5870, 88.3880], // BNXR
      [22.6220, 88.3930], // DDJ
      [22.6780, 88.3820], // Belgharia
      [22.7150, 88.3740], // Sodepur
      [22.7630, 88.3640], // BP (Barrackpore)
      [22.8250, 88.3850], // Shyamnagar
      [22.8910, 88.4230], // NH (Naihati Jn)
    ],
    defaultStatus: 'ACTIVE',
    lines: ['UP Main', 'DN Main', '3rd Suburban Line', '4th Goods Line'],
  },
  {
    id: 'corr-er-nh-rha',
    code: 'NH-RHA',
    name: 'Naihati (NH) - Ranaghat (RHA) - Krishnanagar City (KNJ) Main Arterial',
    kmSpan: 'KM 38.2 to KM 100.4',
    zone: 'ER',
    division: 'SDAH',
    coordinates: [
      [22.8910, 88.4230], // NH
      [22.9550, 88.4550], // Kanchrapara Workshop
      [22.9900, 88.4800], // Kalyani
      [23.0800, 88.5200], // Chakdaha
      [23.1800, 88.5800], // RHA (Ranaghat Jn)
      [23.2850, 88.5450], // Shantipur
      [23.4000, 88.5000], // KNJ (Krishnanagar)
    ],
    defaultStatus: 'SCHEDULED',
    lines: ['UP Main', 'DN Main'],
  },
  {
    id: 'corr-er-ddj-bt',
    code: 'DDJ-BT',
    name: 'Dum Dum (DDJ) - Barasat (BT) - Hasnabad International Border Link',
    kmSpan: 'KM 7.0 to KM 75.0',
    zone: 'ER',
    division: 'SDAH',
    coordinates: [
      [22.6220, 88.3930], // DDJ
      [22.6550, 88.4350], // Birati
      [22.6950, 88.4600], // Madhyamgram
      [22.7210, 88.4810], // BT (Barasat Jn)
      [22.6450, 88.6850], // Taki Road
      [22.5700, 88.9100], // HNB (Hasnabad)
    ],
    defaultStatus: 'CLEAR',
    lines: ['UP Main', 'DN Main'],
  },

  // -------------------------------------------------------------
  // SR (Chennai Division)
  // -------------------------------------------------------------
  {
    id: 'corr-sr-mas-avd-ajj',
    code: 'MAS-AVD-AJJ',
    name: 'Chennai Central (MAS) - Basin Bridge - Avadi (AVD) - Arakkonam (AJJ) Quadruple Line',
    kmSpan: 'KM 0.0 to KM 68.8',
    zone: 'SR',
    division: 'MAS',
    coordinates: [
      [13.0827, 80.2755], // MAS
      [13.0970, 80.2720], // BBQ (Basin Bridge)
      [13.1090, 80.2370], // PER (Perambur)
      [13.1110, 80.2070], // VLK (Villivakkam)
      [13.1170, 80.1010], // AVD (Avadi)
      [13.1280, 80.0150], // Pattabiram Military Siding
      [13.1430, 79.9100], // TRL (Tiruvallur)
      [13.0780, 79.6670], // AJJ (Arakkonam Jn)
    ],
    defaultStatus: 'ACTIVE',
    lines: ['UP Fast', 'DN Fast', 'UP Slow Suburban', 'DN Slow Suburban'],
  },
  {
    id: 'corr-sr-ms-tbm-cgl',
    code: 'MS-TBM-CGL',
    name: 'Chennai Egmore (MS) - Tambaram (TBM) - Chengalpattu (CGL) Southern Trunk',
    kmSpan: 'KM 0.0 to KM 59.8',
    zone: 'SR',
    division: 'MAS',
    coordinates: [
      [13.0780, 80.2610], // MS
      [13.0450, 80.2350], // Mambalam
      [13.0080, 80.2050], // Guindy
      [12.9800, 80.1700], // St Thomas Mount
      [12.9250, 80.1170], // TBM (Tambaram)
      [12.8350, 80.0450], // Guduvancheri
      [12.6920, 79.9760], // CGL (Chengalpattu Jn)
    ],
    defaultStatus: 'SCHEDULED',
    lines: ['UP Main Line', 'DN Main Line', 'UP Suburban', 'DN Suburban'],
  },
];

// Helper to resolve or interpolate GPS coordinate for a BlockRequest across any zone
export function getCoordinatesForBlockRequest(req: {
  id: string;
  section: string;
  stationFrom?: string;
  stationTo?: string;
  department: string;
  zone?: string;
  zoneCode?: RailwayZoneCode;
  division?: string;
}): { lat: number; lng: number; sectionName: string } {
  // 1. Direct station code or name matching against STATIONS dictionary
  if (req.stationFrom) {
    const fromCode = req.stationFrom.toUpperCase().trim();
    // Try direct key
    if (STATIONS[fromCode]) {
      return { lat: STATIONS[fromCode].lat, lng: STATIONS[fromCode].lng, sectionName: req.section };
    }
    // Match station code inside brackets e.g. "Churchgate (CCG)"
    const match = req.stationFrom.match(/\(([^)]+)\)/);
    if (match && match[1] && STATIONS[match[1].toUpperCase()]) {
      const st = STATIONS[match[1].toUpperCase()];
      return { lat: st.lat, lng: st.lng, sectionName: req.section };
    }
  }

  // 2. Direct stationTo matching
  if (req.stationTo) {
    const toCode = req.stationTo.toUpperCase().trim();
    if (STATIONS[toCode]) {
      return { lat: STATIONS[toCode].lat, lng: STATIONS[toCode].lng, sectionName: req.section };
    }
    const match = req.stationTo.match(/\(([^)]+)\)/);
    if (match && match[1] && STATIONS[match[1].toUpperCase()]) {
      const st = STATIONS[match[1].toUpperCase()];
      return { lat: st.lat, lng: st.lng, sectionName: req.section };
    }
  }

  // 3. Known corridor codes check
  for (const corr of CORRIDOR_POLYLINES) {
    if (req.section && (req.section.includes(corr.code) || corr.name.includes(req.section))) {
      const midIdx = Math.floor(corr.coordinates.length / 2);
      return {
        lat: corr.coordinates[midIdx][0],
        lng: corr.coordinates[midIdx][1],
        sectionName: corr.name,
      };
    }
  }

  // 4. Zone fallback
  const zCode = req.zoneCode || (req.zone?.includes('WR') ? 'WR' : req.zone?.includes('CR') ? 'CR' : req.zone?.includes('ER') ? 'ER' : req.zone?.includes('SR') ? 'SR' : 'NR');
  const zoneInfo = ZONAL_RAILWAYS[zCode] || ZONAL_RAILWAYS.NR;

  return {
    lat: zoneInfo.coordinates[0],
    lng: zoneInfo.coordinates[1],
    sectionName: `${zoneInfo.shortName} Corridor Section`,
  };
}
