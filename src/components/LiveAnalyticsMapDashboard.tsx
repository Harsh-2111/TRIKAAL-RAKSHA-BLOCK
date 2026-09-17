import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Maximize2,
  Minimize2,
  Layers,
  Sparkles,
  Train,
  Clock,
  Wrench,
  Zap,
  Radio,
  AlertTriangle,
  CheckCircle2,
  Activity,
  ShieldCheck,
  TrendingUp,
  Compass,
  Eye,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { BlockRequest, Department, User, RailwayZoneCode } from '../types';
import { DEPARTMENT_CONFIG } from '../data/mockData';
import {
  CORRIDOR_POLYLINES,
  STATIONS,
  ZONAL_RAILWAYS,
  getCoordinatesForBlockRequest,
  StationNode,
  CorridorPolyline
} from '../data/corridorCoordinates';
import { getAffectedTrains } from '../data/trainData';

interface LiveAnalyticsMapDashboardProps {
  currentUser: User;
  allRequests: BlockRequest[];
  onViewRequestDetail: (req: BlockRequest) => void;
  onOpenActionModal?: (req: BlockRequest) => void;
  onApplyAiSchedule?: (updatedRequests: BlockRequest[]) => void;
  activeZone?: RailwayZoneCode;
  onSelectZone?: (zone: RailwayZoneCode) => void;
}

const ZONE_PRESETS: Record<RailwayZoneCode, { name: string; lat: number; lng: number; zoom: number }[]> = {
  ALL: [
    { name: 'Pan-India Overview', lat: 21.7679, lng: 78.8718, zoom: 5 },
    { name: 'NR (Delhi DLI)', lat: 28.6139, lng: 77.2090, zoom: 10 },
    { name: 'WR (Mumbai MMCT)', lat: 18.9696, lng: 72.8193, zoom: 11 },
    { name: 'CR (Pune PA)', lat: 18.5204, lng: 73.8567, zoom: 11 },
    { name: 'ER (Sealdah SDAH)', lat: 22.5726, lng: 88.3639, zoom: 11 },
    { name: 'SR (Chennai MAS)', lat: 13.0827, lng: 80.2707, zoom: 11 },
  ],
  NR: [
    { name: 'Delhi Central', lat: 28.6429, lng: 77.2195, zoom: 12 },
    { name: 'GZB - NDLS', lat: 28.6650, lng: 77.3400, zoom: 12 },
    { name: 'NDLS - TKD', lat: 28.5600, lng: 77.2600, zoom: 12 },
    { name: 'ALJN - TDL', lat: 27.5500, lng: 78.1200, zoom: 11 },
    { name: 'PNP - UMB', lat: 29.8000, lng: 76.9000, zoom: 11 },
    { name: 'Fit Delhi (NR)', lat: 28.6139, lng: 77.2090, zoom: 10 },
  ],
  WR: [
    { name: 'Churchgate - MMCT', lat: 18.9500, lng: 72.8220, zoom: 13 },
    { name: 'MMCT - Bandra', lat: 19.0300, lng: 72.8420, zoom: 13 },
    { name: 'Andheri - Borivali', lat: 19.1800, lng: 72.8520, zoom: 13 },
    { name: 'Vasai - Virar', lat: 19.4180, lng: 72.8210, zoom: 12 },
    { name: 'Dahanu - Vapi', lat: 20.1700, lng: 72.8100, zoom: 11 },
    { name: 'Fit Mumbai (WR)', lat: 18.9696, lng: 72.8193, zoom: 11 },
  ],
  CR: [
    { name: 'Pune Junction', lat: 18.5284, lng: 73.8743, zoom: 14 },
    { name: 'Dapodi - Pimpri', lat: 18.6000, lng: 73.8150, zoom: 13 },
    { name: 'Talegaon - Lonavala', lat: 18.7450, lng: 73.5420, zoom: 12 },
    { name: 'Uruli - Daund', lat: 18.4700, lng: 74.3500, zoom: 11 },
    { name: 'Satara - Miraj', lat: 17.2500, lng: 74.3300, zoom: 10 },
    { name: 'Fit Pune (CR)', lat: 18.5204, lng: 73.8567, zoom: 11 },
  ],
  ER: [
    { name: 'Sealdah Main', lat: 22.5675, lng: 88.3711, zoom: 14 },
    { name: 'Dum Dum - Barrackpore', lat: 22.6900, lng: 88.3780, zoom: 12 },
    { name: 'Naihati - Ranaghat', lat: 23.0300, lng: 88.5000, zoom: 12 },
    { name: 'Barasat - Hasnabad', lat: 22.6450, lng: 88.6950, zoom: 11 },
    { name: 'Budge Budge Depot', lat: 22.4820, lng: 88.1810, zoom: 13 },
    { name: 'Fit Sealdah (ER)', lat: 22.5726, lng: 88.3639, zoom: 11 },
  ],
  SR: [
    { name: 'Chennai Central (MAS)', lat: 13.0827, lng: 80.2707, zoom: 14 },
    { name: 'Egmore - Tambaram', lat: 12.9800, lng: 80.1800, zoom: 12 },
    { name: 'Avadi - Arakkonam', lat: 13.1000, lng: 79.9000, zoom: 11 },
    { name: 'Chengalpattu Junction', lat: 12.6920, lng: 79.9770, zoom: 13 },
    { name: 'Ennore Port Yard', lat: 13.2000, lng: 80.3200, zoom: 12 },
    { name: 'Fit Chennai (SR)', lat: 13.0827, lng: 80.2707, zoom: 11 },
  ],
};

export const LiveAnalyticsMapDashboard: React.FC<LiveAnalyticsMapDashboardProps> = ({
  currentUser,
  allRequests,
  onViewRequestDetail,
  onOpenActionModal,
  activeZone = 'ALL',
  onSelectZone,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const polylinesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const stationsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const zoneLabelsLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Map display state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);
  const [simulationActiveOnly, setSimulationActiveOnly] = useState<boolean>(false);
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(true);

  // Classify a block request into 3 categories: Active WIP (Red), Scheduled Approved (Green), Pending (Yellow)
  const getRequestCategory = (req: BlockRequest): 'ACTIVE' | 'SCHEDULED' | 'PENDING' => {
    if (req.status === 'APPROVED' || req.status === 'MODIFIED_APPROVED') {
      // First 2 approved requests or requests with active ongoing execution treated as Active WIP
      if (req.id === 'RB-ENG-2026-081' || req.id === 'RB-TRD-2026-085' || req.priority === 'SAFETY_CRITICAL' || req.urgencyLevel === 'Critical Emergency') {
        return 'ACTIVE';
      }
      return 'SCHEDULED';
    }
    return 'PENDING';
  };

  const normalizeSection = (section: string): string =>
    (section || '').toLowerCase().replace(/section/g, '').replace(/[^a-z0-9]/g, '');

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = (time || '').split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  const isTimeOverlapping = (a: BlockRequest, b: BlockRequest): boolean => {
    const startA = timeToMinutes(a.requestedStartTime);
    let endA = timeToMinutes(a.requestedEndTime);
    const startB = timeToMinutes(b.requestedStartTime);
    let endB = timeToMinutes(b.requestedEndTime);
    if (endA <= startA) endA += 24 * 60;
    if (endB <= startB) endB += 24 * 60;
    return Math.max(startA, startB) < Math.min(endA, endB);
  };

  // Filter requests based on department, zone, and category filter
  const filteredRequests = useMemo(() => {
    const conflictIds = new Set<string>();
    const pendingRequests = allRequests.filter((request) => request.status === 'PENDING');
    pendingRequests.forEach((request, index) => {
      pendingRequests.slice(index + 1).forEach((otherRequest) => {
        const sectionA = normalizeSection(request.section);
        const sectionB = normalizeSection(otherRequest.section);
        const sameSection =
          sectionA === sectionB || sectionA.includes(sectionB) || sectionB.includes(sectionA) ||
          (request.stationFrom && otherRequest.stationFrom &&
            request.stationFrom.toLowerCase().trim() === otherRequest.stationFrom.toLowerCase().trim() &&
            request.stationTo.toLowerCase().trim() === otherRequest.stationTo.toLowerCase().trim());
        if (request.requestedDate === otherRequest.requestedDate && sameSection && isTimeOverlapping(request, otherRequest)) {
          conflictIds.add(request.id);
          conflictIds.add(otherRequest.id);
        }
      });
    });

    return allRequests.filter((req) => {
      if (activeZone && activeZone !== 'ALL') {
        const reqZone =
          req.zoneCode ||
          (req.zone?.includes('WR')
            ? 'WR'
            : req.zone?.includes('CR')
            ? 'CR'
            : req.zone?.includes('ER')
            ? 'ER'
            : req.zone?.includes('SR')
            ? 'SR'
            : 'NR');
        if (reqZone !== activeZone) return false;
      }
      if (selectedDeptFilter !== 'ALL' && req.department !== selectedDeptFilter) {
        return false;
      }
      const category = getRequestCategory(req);
      if (selectedStatusFilter === 'ACTIVE' && category !== 'ACTIVE') return false;
      if (selectedStatusFilter === 'SCHEDULED' && category !== 'SCHEDULED') return false;
      if (selectedStatusFilter === 'PENDING' && category !== 'PENDING') return false;
      if (selectedStatusFilter === 'CONFLICT' && !conflictIds.has(req.id)) return false;
      if (selectedStatusFilter === 'BUNDLED' && !(req.isShadowBundle || req.shadowBlockEligible)) return false;
      if (simulationActiveOnly && category !== 'ACTIVE') return false;
      return true;
    });
  }, [allRequests, activeZone, selectedDeptFilter, selectedStatusFilter, simulationActiveOnly]);

  const conflictRequestIds = useMemo(() => {
    const ids = new Set<string>();
    const pendingRequests = allRequests.filter((request) => request.status === 'PENDING');

    pendingRequests.forEach((request, index) => {
      pendingRequests.slice(index + 1).forEach((otherRequest) => {
        const sectionA = normalizeSection(request.section);
        const sectionB = normalizeSection(otherRequest.section);
        const sameSection =
          sectionA === sectionB || sectionA.includes(sectionB) || sectionB.includes(sectionA) ||
          (request.stationFrom && otherRequest.stationFrom &&
            request.stationFrom.toLowerCase().trim() === otherRequest.stationFrom.toLowerCase().trim() &&
            request.stationTo.toLowerCase().trim() === otherRequest.stationTo.toLowerCase().trim());

        if (request.requestedDate === otherRequest.requestedDate && sameSection && isTimeOverlapping(request, otherRequest)) {
          ids.add(request.id);
          ids.add(otherRequest.id);
        }
      });
    });

    return ids;
  }, [allRequests]);

  // Analytics Computations
  const analyticsData = useMemo(() => {
    let engHours = 0;
    let stHours = 0;
    let trdHours = 0;
    let activeCount = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let cautionOrdersKm = 0;
    let bundledWindowsCount = 0;

    filteredRequests.forEach((req) => {
      const hours = (req.durationMinutes || 180) / 60;
      const cat = getRequestCategory(req);

      if (cat === 'ACTIVE') activeCount++;
      else if (cat === 'SCHEDULED') approvedCount++;
      else if (cat === 'PENDING') pendingCount++;

      if (req.department === 'ENGINEERING') engHours += hours;
      else if (req.department === 'ST') stHours += hours;
      else if (req.department === 'TRD') trdHours += hours;

      if (req.speedRestrictionKmH && req.speedRestrictionKmH < 60) {
        cautionOrdersKm += 4.5;
      }

      if (req.isShadowBundle || req.shadowBlockEligible) {
        bundledWindowsCount++;
      }
    });

    const totalMaintenanceHours = engHours + stHours + trdHours;
    // Division Capacity model: 16 active lines across corridors * 24 hrs = 384 available track hours
    const totalDivisionTrackCapacityHours = activeZone === 'ALL' ? 1920 : 384;
    const utilizationRate = Math.min(100, Math.round((totalMaintenanceHours / totalDivisionTrackCapacityHours) * 100 * 10) / 10);
    const safetyLimit = activeZone === 'ALL' ? 32 : 8; // Max simultaneous corridor blocks

    return {
      engHours: Math.round(engHours * 10) / 10,
      stHours: Math.round(stHours * 10) / 10,
      trdHours: Math.round(trdHours * 10) / 10,
      totalHours: Math.round(totalMaintenanceHours * 10) / 10,
      activeCount,
      approvedCount,
      pendingCount,
      safetyLimit,
      utilizationRate,
      cautionOrdersKm: Math.round(cautionOrdersKm * 10) / 10,
      bundledWindowsCount,
    };
  }, [filteredRequests, activeZone]);

  // Initialize Leaflet Map with a light political base layer.
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialZoneCfg = ZONAL_RAILWAYS[activeZone || 'ALL'] || ZONAL_RAILWAYS.ALL;
      const map = L.map(mapContainerRef.current, {
        center: initialZoneCfg.coordinates,
        zoom: initialZoneCfg.defaultZoom,
        zoomControl: false, // Custom top-right zoom buttons
        attributionControl: true,
      });

      const politicalBaseLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
          minZoom: 4,
        }
      );
      politicalBaseLayer.addTo(map);

      // Create LayerGroups for clean updates
      polylinesLayerGroupRef.current = L.layerGroup().addTo(map);
      stationsLayerGroupRef.current = L.layerGroup().addTo(map);
      markersLayerGroupRef.current = L.layerGroup().addTo(map);
      zoneLabelsLayerGroupRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    // Invalidate size in case of container sizing changes
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 250);

    return () => {
      // Clean up on unmount
    };
  }, []);

  // Animate map camera when activeZone changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const targetZone = activeZone || 'ALL';
    const zoneConfig = ZONAL_RAILWAYS[targetZone] || ZONAL_RAILWAYS.ALL;
    map.flyTo(zoneConfig.coordinates, zoneConfig.defaultZoom, {
      duration: 1.5,
      easeLinearity: 0.25,
    });
  }, [activeZone]);

  // Update filtered corridors, stations, and conflict-only zone labels.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !polylinesLayerGroupRef.current || !stationsLayerGroupRef.current || !zoneLabelsLayerGroupRef.current) return;

    polylinesLayerGroupRef.current.clearLayers();
    stationsLayerGroupRef.current.clearLayers();
    zoneLabelsLayerGroupRef.current.clearLayers();

    // 1. Filter Corridors by active zone
    const corridorsToRender =
      !activeZone || activeZone === 'ALL'
        ? CORRIDOR_POLYLINES
        : CORRIDOR_POLYLINES.filter((c) => c.zone === activeZone);

    corridorsToRender.forEach((corr) => {
      const corrRequests = filteredRequests.filter(
        (r) => r.section.includes(corr.code) || corr.name.includes(r.section)
      );
      if ((selectedStatusFilter !== 'ALL' || selectedDeptFilter !== 'ALL' || simulationActiveOnly) && corrRequests.length === 0) return;

      const hasActive = corrRequests.some((r) => getRequestCategory(r) === 'ACTIVE');
      const hasApproved = corrRequests.some((r) => getRequestCategory(r) === 'SCHEDULED');
      const hasPending = corrRequests.some((r) => getRequestCategory(r) === 'PENDING');
      const hasConflict = corrRequests.some((r) => conflictRequestIds.has(r.id));
      const hasBundle = corrRequests.some((r) => r.isShadowBundle || r.shadowBlockEligible);

      let lineColor = '#16A34A';
      let lineOpacity = 0.85;
      let lineWeight = 4;
      let lineDash: string | undefined = undefined;

      if (hasActive) {
        lineColor = '#EF4444';
        lineWeight = 6;
      } else if (hasConflict) {
        lineColor = '#F59E0B';
        lineDash = '6, 6';
        lineWeight = 5;
      } else if (hasBundle) {
        lineColor = '#2563EB';
        lineWeight = 5;
      } else if (hasApproved || hasPending) {
        lineColor = '#16A34A';
        lineWeight = 5;
      }

      // Outer glow line keeps corridor status visible over the basemap.
      const glowLine = L.polyline(corr.coordinates, {
        color: lineColor,
        weight: lineWeight + 4,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      });
      polylinesLayerGroupRef.current?.addLayer(glowLine);

      // Main corridor track line
      const mainTrackLine = L.polyline(corr.coordinates, {
        color: lineColor,
        weight: lineWeight,
        opacity: lineOpacity,
        dashArray: lineDash,
        lineCap: 'round',
        lineJoin: 'round',
      });

      const affectedTrains = corrRequests.flatMap((request) =>
        getAffectedTrains(request.section || corr.code, request.durationMinutes)
      );
      const uniqueTrains = Array.from(
        new Map<string, (typeof affectedTrains)[number]>(affectedTrains.map((train) => [train.id, train])).values()
      );
      const trainList = uniqueTrains.length > 0
        ? uniqueTrains.map((train) => `<li>${train.id} ${train.name} (${train.arrTime}-${train.depTime})</li>`).join('')
        : '<li>No timetable services indexed for this section</li>';
      const statusLabel = hasActive ? 'WIP / Blocked' : hasConflict ? 'Conflict' : hasBundle ? 'Bundled' : 'Clear';

      mainTrackLine.bindTooltip(
        `<div class="text-xs font-semibold px-1 py-0.5"><div>${corr.name} (${corr.kmSpan}) [${corr.zone}]</div><div class="mt-1">Status: ${statusLabel}</div><div class="mt-1 font-semibold">Affected services</div><ul class="list-disc pl-4 font-normal">${trainList}</ul></div>`,
        { sticky: true, className: 'bg-slate-900 text-white border-0 rounded px-2 py-1 shadow-lg' }
      );

      polylinesLayerGroupRef.current?.addLayer(mainTrackLine);

      if (hasConflict) {
        const zone = ZONAL_RAILWAYS[corr.zone];
        const conflictLabel = L.marker(zone.coordinates, {
          icon: L.divIcon({
            className: 'conflict-zone-label',
            html: `<div class="bg-amber-100/95 border border-amber-500 text-amber-950 text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">${zone.shortName}<br/><span class="font-semibold">Attention: Time &amp; Section Overlap</span></div>`,
            iconAnchor: [0, 0],
          }),
          interactive: false,
        });
        zoneLabelsLayerGroupRef.current?.addLayer(conflictLabel);
      }
    });

    // 2. Filter Stations by active zone
    const stationsToRender =
      !activeZone || activeZone === 'ALL'
        ? Object.values(STATIONS)
        : Object.values(STATIONS).filter((s) => s.zone === activeZone);

    stationsToRender.forEach((stn: StationNode) => {
      const stationIcon = L.divIcon({
        className: 'custom-station-node',
        html: `
          <div class="relative group cursor-pointer flex items-center justify-center">
            <div class="w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
            <div class="absolute -bottom-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-slate-950/90 text-cyan-200 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-cyan-500/50 shadow-md pointer-events-none">
              ${stn.code}
            </div>
          </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([stn.lat, stn.lng], { icon: stationIcon });
      marker.bindPopup(`
        <div class="p-3 max-w-[240px] font-sans">
          <div class="flex items-center space-x-1.5 text-xs font-bold text-[#000075] border-b border-slate-200 pb-1.5 mb-1.5">
            <span class="px-1.5 py-0.5 bg-blue-100 text-blue-950 rounded text-[10px]">${stn.code}</span>
            <span>${stn.name}</span>
          </div>
          <div class="text-[11px] text-slate-600 space-y-1">
            <div><strong>Division:</strong> ${stn.division} (${stn.zone})</div>
            <div><strong>Node Type:</strong> ${stn.isJunction ? 'Major Railway Junction' : 'Block Section Station'}</div>
            <div class="text-[10px] text-emerald-700 font-semibold mt-1">Status: Normal Train Traffic Clear</div>
          </div>
        </div>
      `);

      stationsLayerGroupRef.current?.addLayer(marker);
    });
  }, [allRequests, filteredRequests, selectedDeptFilter, selectedStatusFilter, simulationActiveOnly, conflictRequestIds]);

  // Update Block Requisition Pins on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerGroupRef.current) return;

    markersLayerGroupRef.current.clearLayers();

    filteredRequests.forEach((req) => {
      const coords = getCoordinatesForBlockRequest(req);
      const category = getRequestCategory(req);
      const isHighlighted = highlightedRequestId === req.id;

      // Color scheme based on Legend:
      // 🔴 Active WIP (#EF4444)
      // 🟢 Scheduled / Approved (#10B981)
      // 🟡 Pending AI Optimization (#F59E0B)
      let pinColor = '#F59E0B';
      let ringPing = '';
      let badgeLabel = 'PENDING';
      let deptBorder = 'border-amber-400';

      if (category === 'ACTIVE') {
        pinColor = '#EF4444';
        ringPing = '<span class="absolute -inset-1 rounded-full bg-red-500 opacity-75 animate-ping"></span>';
        badgeLabel = 'ACTIVE WIP';
        deptBorder = 'border-red-500';
      } else if (category === 'SCHEDULED') {
        pinColor = '#10B981';
        badgeLabel = 'APPROVED';
        deptBorder = 'border-emerald-500';
      } else {
        pinColor = '#F59E0B';
        badgeLabel = 'PENDING AI';
        deptBorder = 'border-amber-400';
      }

      // Icon symbol by department
      let deptSymbol = 'W'; // Engineering P-Way
      if (req.department === 'ST') deptSymbol = 'S';
      else if (req.department === 'TRD') deptSymbol = 'T';

      const customMarkerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transform hover:scale-115 transition-transform ${isHighlighted ? 'scale-125 z-20' : ''}">
          ${ringPing}
          <div class="relative w-8 h-8 rounded-full flex items-center justify-center shadow-xl border-2 ${deptBorder} text-white font-black text-xs" style="background-color: ${pinColor}">
            ${deptSymbol}
          </div>
          <div class="absolute -top-3 right-0 w-3 h-3 rounded-full bg-white border border-slate-800 flex items-center justify-center text-[7px] font-mono font-bold text-slate-900 shadow">
            ${req.department === 'ENGINEERING' ? 'P' : req.department === 'ST' ? 'S' : 'O'}
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'custom-block-marker',
        html: customMarkerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: markerIcon });

      // IRCTC-Styled Popup matching all specifications
      const popupHtml = `
        <div class="p-3.5 font-sans min-w-[270px] max-w-[320px] text-slate-800">
          {/* Header Bar */}
          <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
            <div class="flex items-center space-x-1.5">
              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-900 text-white shadow-2xs">${req.id}</span>
              <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-white" style="background-color: ${pinColor}">
                ${badgeLabel}
              </span>
            </div>
            ${
              req.isShadowBundle || req.shadowBlockEligible
                ? `<span class="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded">AI BUNDLED</span>`
                : ''
            }
          </div>

          {/* Section & KM Markings */}
          <div class="mb-2">
            <div class="text-xs font-bold text-[#000075] flex items-center space-x-1">
              <span>${req.section}</span>
            </div>
            <div class="text-[11px] font-mono text-slate-600 flex items-center space-x-1.5 mt-0.5">
              <span class="text-slate-400">Track:</span>
              <span class="font-semibold text-slate-800">${req.lineType}</span>
              <span>•</span>
              <span class="font-semibold text-amber-700">${req.startKm} to ${req.endKm}</span>
            </div>
          </div>

          {/* Department In-Charge */}
          <div class="bg-slate-50 rounded p-2 border border-slate-200 text-[11px] space-y-1.5 mb-2.5">
            <div class="flex items-center justify-between">
              <span class="text-slate-500 font-medium">Department In-Charge:</span>
              <span class="font-bold text-slate-900">${req.department === 'ENGINEERING' ? 'Engineering (P-Way)' : req.department === 'ST' ? 'S&T (Signalling)' : 'TRD (OHE Traction)'}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500 font-medium">Time Window:</span>
              <span class="font-mono font-bold text-slate-900">${req.requestedStartTime} -> ${req.requestedEndTime} (${req.durationMinutes} mins)</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500 font-medium">Caution / Speed:</span>
              <span class="font-bold text-amber-800">${req.speedRestrictionKmH ? `${req.speedRestrictionKmH} km/h` : 'No Restriction'}</span>
            </div>
          </div>

          {/* Deployed Machinery */}
          <div class="text-[11px] mb-2.5">
            <div class="text-slate-500 font-medium mb-1">Deployed Machinery & Gangs:</div>
            <div class="flex flex-wrap gap-1">
              ${req.machineryDeployed && req.machineryDeployed.length > 0
                ? req.machineryDeployed.map((m) => `<span class="px-1.5 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded text-[10px] font-medium">${m}</span>`).join('')
                : '<span class="text-slate-400 italic text-[10px]">Standard Department Maintenance Squad</span>'
              }
            </div>
          </div>

          {/* Work Description Brief */}
          <div class="text-[11px] text-slate-600 bg-amber-50/60 p-2 rounded border border-amber-200/60 mb-2.5 line-clamp-2">
            <strong>Scope:</strong> ${req.workDescription}
          </div>

          {/* Interactive Button */}
          <button
            id="btn-popup-view-req-${req.id}"
            class="w-full py-1.5 px-3 bg-[#000075] hover:bg-blue-900 text-white rounded text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <span>View Full Requisition Dossier</span>
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      // Attach button click event handler when popup opens
      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`btn-popup-view-req-${req.id}`);
          if (btn) {
            btn.onclick = () => {
              onViewRequestDetail(req);
            };
          }
        }, 50);
      });

      markersLayerGroupRef.current?.addLayer(marker);
    });
  }, [filteredRequests, highlightedRequestId, onViewRequestDetail]);

  // Corridor preset camera flyTo
  const handleCorridorJump = (lat: number, lng: number, zoom: number = 12) => {
    mapInstanceRef.current?.flyTo([lat, lng], zoom, {
      duration: 1.5,
      easeLinearity: 0.25,
    });
  };

  // Toggle fullscreen/expanded mode
  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 300);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner & Control Strip */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-blue-950 text-amber-400 rounded-lg shadow-sm">
                <Compass className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-[#000075] tracking-tight">
                Live Analytics & Political Line Map
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                POLITICAL MAP LIVE
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
              Real-time political-map monitoring of Indian Railways corridor possessions, active track blocks,
              safety limits, and engineering machinery allocations across {activeZone === 'ALL' ? 'all 5 Zonal Networks (NR, WR, CR, ER, SR)' : `${ZONAL_RAILWAYS[activeZone]?.fullName} (${ZONAL_RAILWAYS[activeZone]?.divisionCode} Division)`}.
            </p>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="bg-red-50 border border-red-200 text-red-900 px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-2xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <span>{analyticsData.activeCount} Active WIP Blocks</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-2xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span>{analyticsData.approvedCount} Scheduled Windows</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-2xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>{analyticsData.pendingCount} Pending Clearance</span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar & Corridor Quick-Jump Strip */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Department & Status Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Department:</span>
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-800 cursor-pointer"
              >
                <option value="ALL">All Departments (Eng, S&T, TRD)</option>
                <option value="ENGINEERING">Civil Engineering (P-Way)</option>
                <option value="ST">Signal & Telecom (S&T)</option>
                <option value="TRD">Traction / OHE (TRD)</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
              <span>Status:</span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-800 cursor-pointer"
              >
                <option value="ALL">All Track Categories</option>
                <option value="ACTIVE">🔴 Active WIP Only</option>
                <option value="SCHEDULED">🟢 Scheduled / Approved</option>
                <option value="PENDING">🟡 Pending Clearance</option>
              </select>
            </div>

            {/* Simulation mode toggle */}
            <button
              onClick={() => setSimulationActiveOnly(!simulationActiveOnly)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                simulationActiveOnly
                  ? 'bg-red-700 text-white border-red-800 font-bold'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              title="Toggle filter to show only active track block possessions"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Active Track Possession Mode</span>
            </button>
          </div>

          {/* Corridor / Zone Preset Camera Jumps */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-slate-400 font-medium text-[11px] whitespace-nowrap">Focus:</span>
            {(ZONE_PRESETS[activeZone || 'ALL'] || ZONE_PRESETS.ALL).map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleCorridorJump(preset.lat, preset.lng, preset.zoom)}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-100 hover:text-blue-900 text-slate-700 font-semibold border border-slate-200 transition-colors cursor-pointer whitespace-nowrap text-[11px]"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* POLITICAL GEOGRAPHIC MAP CONTAINER */}
      <div
        id="satellite-map-outer-card"
        className={`relative z-10 w-full rounded-xl overflow-hidden border-2 border-slate-800 shadow-2xl transition-all duration-300 bg-slate-950 max-h-[calc(100vh-120px)] ${
          isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-[360px] sm:h-[480px] lg:h-[560px]'
        }`}
        style={{ isolation: 'isolate' }}
      >
        {/* Leaflet DOM Anchor */}
        <div ref={mapContainerRef} className="w-full h-full relative z-0" style={{ background: '#020617' }} />

        {/* Floating Map Legend Panel (Specification 3) */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-lg p-2.5 sm:p-3 text-white shadow-2xl max-w-[210px] sm:max-w-[260px]">
          <div
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-1.5 mb-1.5"
            title="Click to toggle legend"
          >
            <div className="flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] sm:text-xs font-bold tracking-tight uppercase text-slate-200">
                Live Legend
              </span>
            </div>
            <span className="text-[10px] text-slate-400 sm:hidden">
              {isLegendOpen ? '▲ Hide' : '▼ Show'}
            </span>
          </div>

          {isLegendOpen && (
            <div className="space-y-2 text-[10px] sm:text-[11px]">
              {/* Category 1: Active Work In Progress */}
              <div
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
                className="flex items-center space-x-2 cursor-pointer hover:bg-slate-900/60 p-1 rounded transition-colors"
              >
                <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
                  <span className="absolute w-3.5 h-3.5 rounded-full bg-red-500 animate-ping opacity-75" />
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white" />
                </div>
                <div className="leading-tight">
                  <span className="font-bold text-red-300">Active Work In Progress</span>
                  <p className="text-[9px] sm:text-[10px] text-slate-400">Track occupied & blocked</p>
                </div>
              </div>

              {/* Category 2: Conflict Alert */}
              <div
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'CONFLICT' ? 'ALL' : 'CONFLICT')}
                className="flex items-center space-x-2 cursor-pointer hover:bg-slate-900/60 p-1 rounded transition-colors"
              >
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" />
                </div>
                <div className="leading-tight">
                  <span className="font-bold text-amber-300">Conflict Alert</span>
                  <p className="text-[9px] sm:text-[10px] text-slate-400">Time &amp; section overlap</p>
                </div>
              </div>

              {/* Category 3: Bundled Window */}
              <div
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'BUNDLED' ? 'ALL' : 'BUNDLED')}
                className="flex items-center space-x-2 cursor-pointer hover:bg-slate-900/60 p-1 rounded transition-colors"
              >
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white" />
                </div>
                <div className="leading-tight">
                  <span className="font-bold text-blue-300">Bundled Window</span>
                  <p className="text-[9px] sm:text-[10px] text-slate-400">Coordinated block possession</p>
                </div>
              </div>

              {/* Category 4: Clear Line */}
              <div className="flex items-center space-x-2 p-1">
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 border border-white" />
                </div>
                <div className="leading-tight">
                  <span className="font-bold text-green-300">Clear Line</span>
                  <p className="text-[9px] sm:text-[10px] text-slate-400">Normal train traffic running</p>
                </div>
              </div>

              <div className="mt-1 pt-1.5 border-t border-slate-800 text-[9px] sm:text-[10px] text-slate-400 flex items-center justify-between font-mono">
                <span>Carto Political</span>
                <span className="text-emerald-400">GPS Sync</span>
              </div>
            </div>
          )}
        </div>

        {/* Floating Map Controls (Top Right: Zoom In, Zoom Out, Fullscreen Toggle) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col space-y-2">
          {/* Fullscreen / Expand Toggle (Specification 2) */}
          <button
            onClick={handleToggleFullscreen}
            className="p-2.5 rounded-lg bg-slate-950/85 backdrop-blur-md text-white hover:bg-slate-900 hover:text-amber-400 border border-slate-700 shadow-xl transition-all cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand / Fullscreen Map'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Zoom In */}
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-950/85 backdrop-blur-md text-white hover:bg-slate-900 hover:text-amber-400 border border-slate-700 shadow-xl font-bold text-lg transition-all cursor-pointer"
            title="Zoom In"
          >
            +
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-950/85 backdrop-blur-md text-white hover:bg-slate-900 hover:text-amber-400 border border-slate-700 shadow-xl font-bold text-lg transition-all cursor-pointer"
            title="Zoom Out"
          >
            -
          </button>

          {/* Reset Camera to Center */}
          <button
            onClick={() => {
              const zoneCfg = ZONAL_RAILWAYS[activeZone || 'ALL'] || ZONAL_RAILWAYS.ALL;
              handleCorridorJump(zoneCfg.coordinates[0], zoneCfg.coordinates[1], zoneCfg.defaultZoom);
            }}
            className="p-2.5 rounded-lg bg-slate-950/85 backdrop-blur-md text-white hover:bg-slate-900 hover:text-amber-400 border border-slate-700 shadow-xl transition-all cursor-pointer"
            title="Reset to Active Zone Center"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
          </button>
        </div>

        {/* Bottom Sensor Attribution Badge */}
        <div className="absolute bottom-2 left-4 z-20 bg-slate-950/70 backdrop-blur-xs text-[10px] text-slate-400 px-2 py-1 rounded border border-slate-800 pointer-events-none hidden sm:block font-mono">
          Carto Light Political Layer • WGS84 Projection • Indian Railways Track GIS
        </div>
      </div>

      {/* ANALYTICS PANEL (Specification 5: Next to/Below the Map) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1: Division Block Utilization Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Division Capacity Utilization
              </span>
              <span className="p-1.5 bg-blue-50 text-blue-900 rounded-md">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-black text-[#000075]">{analyticsData.utilizationRate}%</span>
              <span className="text-xs font-semibold text-slate-500">Track Maintenance Load</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Active & approved possessions utilize {analyticsData.totalHours} hours out of 384 available daily corridor track hours.
            </p>
          </div>

          {/* Progress bar visual */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span className="text-slate-600">Corridor Track Capacity</span>
              <span className="text-emerald-700 font-bold">{100 - analyticsData.utilizationRate}% Clear Traffic</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
              <div
                className="h-full bg-linear-to-r from-blue-700 to-indigo-800 transition-all duration-500"
                style={{ width: `${analyticsData.utilizationRate}%` }}
              />
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${100 - analyticsData.utilizationRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Live Active Blocks Counter vs Safety Capacity Limit */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Live Active Blocks vs Safety Limit
              </span>
              <span className="p-1.5 bg-red-50 text-red-700 rounded-md">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-black text-red-700">{analyticsData.activeCount}</span>
              <span className="text-sm font-bold text-slate-400">/ {analyticsData.safetyLimit} Safe Max</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Currently occupied corridor sections simultaneously undergoing mechanical or civil works.
            </p>
          </div>

          {/* Safety margin indicator */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-600 font-medium">Divisional Safety Margin:</span>
              <span className="text-emerald-700 font-bold flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Within Safety Margin
              </span>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {Array.from({ length: analyticsData.safetyLimit }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-xs transition-colors ${
                    idx < analyticsData.activeCount
                      ? 'bg-red-600 shadow-xs'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Metric 3: Departmental Time Allocation Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Departmental Time Allocation
              </span>
              <span className="p-1.5 bg-amber-50 text-amber-700 rounded-md">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-black text-[#000075]">{analyticsData.totalHours}</span>
              <span className="text-xs font-semibold text-slate-500">Total Sanctioned Hours</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Coordinated hours divided across Engineering (P-Way), S&T, and TRD.
            </p>
          </div>

          {/* Departmental breakdown bars */}
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-blue-900 font-semibold flex items-center">
                <span className="w-2 h-2 rounded-full bg-blue-800 mr-1.5" />
                Engineering (P-Way):
              </span>
              <span className="font-mono font-bold text-slate-800">{analyticsData.engHours} hrs</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-emerald-900 font-semibold flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-700 mr-1.5" />
                Signal & Telecom (S&T):
              </span>
              <span className="font-mono font-bold text-slate-800">{analyticsData.stHours} hrs</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-900 font-semibold flex items-center">
                <span className="w-2 h-2 rounded-full bg-amber-600 mr-1.5" />
                Traction (TRD 25kV):
              </span>
              <span className="font-mono font-bold text-slate-800">{analyticsData.trdHours} hrs</span>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE SECTION DOSSIER & QUICK LOCATE TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-[#000075] flex items-center space-x-2">
              <Train className="w-4 h-4 text-blue-900" />
              <span>Active Corridor Requisitions On Political Grid ({filteredRequests.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any section below to immediately locate and zoom the map directly to the work site.
            </p>
          </div>

          <div className="text-xs text-slate-600 font-medium">
            Showing <strong className="text-slate-900">{filteredRequests.length}</strong> plotted points
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Requisition ID</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4">Section & KM Boundaries</th>
                <th className="py-2.5 px-4">Sanction Window</th>
                <th className="py-2.5 px-4">Deployed Machinery</th>
                <th className="py-2.5 px-4 text-center">Political Map Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No block requisitions match the current department or status filters.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const coords = getCoordinatesForBlockRequest(req);
                  const cat = getRequestCategory(req);

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                      onClick={() => handleCorridorJump(coords.lat, coords.lng, 13)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-950 whitespace-nowrap">
                        {req.id}
                        {req.isShadowBundle && (
                          <span className="ml-1.5 px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded text-[9px] font-bold">
                            BUNDLED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.department === 'ENGINEERING'
                              ? 'bg-blue-100 text-blue-900'
                              : req.department === 'ST'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {req.department === 'ENGINEERING'
                            ? 'P-Way'
                            : req.department === 'ST'
                            ? 'S&T'
                            : 'TRD'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{req.section}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {req.lineType} • {req.startKm} to {req.endKm}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-semibold text-slate-900">
                          {req.requestedStartTime} → {req.requestedEndTime}
                        </div>
                        <div className="text-[10px] text-slate-400">{req.durationMinutes} mins window</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="truncate max-w-[200px] text-slate-700 font-medium">
                          {req.machineryDeployed?.[0] || 'Standard Maintenance Team'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {cat === 'ACTIVE' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1 animate-ping" />
                            Active WIP
                          </span>
                        ) : cat === 'SCHEDULED' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1" />
                            Pending AI
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleCorridorJump(coords.lat, coords.lng, 13)}
                            className="p-1.5 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Fly to location on political map"
                          >
                            <MapPin className="w-4 h-4 text-blue-700" />
                          </button>
                          <button
                            onClick={() => onViewRequestDetail(req)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#000075] bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
