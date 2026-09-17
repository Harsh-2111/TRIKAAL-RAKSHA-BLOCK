import React from 'react';
import { Globe, MapPin, ChevronDown } from 'lucide-react';
import { RailwayZoneCode } from '../types';
import { ZONAL_RAILWAYS } from '../data/corridorCoordinates';

interface ZoneSelectorProps {
  activeZone: RailwayZoneCode;
  onSelectZone: (zone: RailwayZoneCode) => void;
  className?: string;
  compact?: boolean;
}

export const ZoneSelector: React.FC<ZoneSelectorProps> = ({
  activeZone,
  onSelectZone,
  className = '',
  compact = false,
}) => {
  const currentZoneInfo = activeZone !== 'ALL' ? ZONAL_RAILWAYS[activeZone] : null;

  return (
    <div className={`relative inline-flex min-w-0 max-w-full items-center ${className}`}>
      <label htmlFor="railway-zone-select" className="sr-only">
        Select Zonal Railway Network
      </label>
      <div className="relative flex min-w-0 max-w-full flex-1 items-center bg-[#00005a] hover:bg-[#00004a] border border-amber-400/50 hover:border-amber-400 rounded-md shadow-xs transition-colors group">
        <div className="pl-2.5 pr-1.5 flex items-center pointer-events-none text-amber-300">
          {activeZone === 'ALL' ? (
            <Globe className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          ) : (
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
          )}
        </div>

        <select
          id="railway-zone-select"
          value={activeZone}
          onChange={(e) => onSelectZone(e.target.value as RailwayZoneCode)}
          className={`appearance-none min-w-0 flex-1 bg-transparent text-white font-semibold text-xs cursor-pointer py-1.5 pl-1 pr-7 focus:outline-none focus:ring-1 focus:ring-amber-400 rounded-md ${
            compact ? 'max-w-[140px] truncate' : ''
          }`}
          title="Switch Active Zonal Railway Network"
        >
          <option value="ALL" className="bg-[#000075] text-white py-1 font-bold">
            🇮🇳 All India (Pan-India Unified View)
          </option>
          <option value="NR" className="bg-[#000075] text-white py-1">
            NR - Delhi Division (DLI)
          </option>
          <option value="WR" className="bg-[#000075] text-white py-1">
            Western Railway (WR) - Mumbai Central (MMCT)
          </option>
          <option value="CR" className="bg-[#000075] text-white py-1">
            Central Railway (CR) - Pune Division (PA)
          </option>
          <option value="ER" className="bg-[#000075] text-white py-1">
            Eastern Railway (ER) - Sealdah Division (SDAH)
          </option>
          <option value="SR" className="bg-[#000075] text-white py-1">
            Southern Railway (SR) - Chennai Division (MAS)
          </option>
        </select>

        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-amber-300 group-hover:text-amber-200">
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </div>

      {currentZoneInfo && !compact && (
        <span className="hidden xl:inline-flex items-center ml-2 px-2 py-0.5 rounded text-[10px] font-mono bg-blue-900/80 text-amber-300 border border-blue-700/80">
          HQ: {currentZoneInfo.headquarters}
        </span>
      )}
    </div>
  );
};
