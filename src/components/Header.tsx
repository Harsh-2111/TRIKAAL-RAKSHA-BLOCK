import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  LogOut,
  Train,
  Clock,
  Building2,
  UserCircle2,
  Layers,
  Compass,
  Bell,
  Globe,
} from 'lucide-react';
import { User, SupabaseSyncState, RailwayZoneCode } from '../types';
import { ZONAL_RAILWAYS } from '../data/corridorCoordinates';
import { ZoneSelector } from './ZoneSelector';
import { LogoutConfirmModal } from './LogoutConfirmModal';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  onOpenQuickSwitch?: () => void;
  onResetData?: () => void;
  activeNavTab?: 'DEMAND' | 'MAP_ANALYTICS' | 'GANTT';
  onSelectNavTab?: (tab: 'DEMAND' | 'MAP_ANALYTICS' | 'GANTT') => void;
  supabaseState?: SupabaseSyncState;
  onOpenDbStatusModal?: () => void;
  unreadNotificationCount?: number;
  onOpenNotificationCenter?: () => void;
  activeZone?: RailwayZoneCode;
  onSelectZone?: (zone: RailwayZoneCode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onResetData,
  activeNavTab = 'DEMAND',
  onSelectNavTab,
  supabaseState,
  onOpenDbStatusModal,
  unreadNotificationCount = 0,
  onOpenNotificationCenter,
  activeZone = 'ALL',
  onSelectZone,
}) => {
  const [istTime, setIstTime] = useState<string>('');
  const [istDate, setIstDate] = useState<string>('');
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format to IST
      const timeStr = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const dateStr = now.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      setIstTime(`${timeStr} IST`);
      setIstDate(dateStr);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getRoleBadge = (user: User) => {
    switch (user.role) {
      case 'ENG_OFFICER':
        return {
          title: 'Engineering (P-Way)',
          bg: 'bg-blue-800 text-blue-100 border-blue-600',
          dot: 'bg-blue-400',
        };
      case 'ST_OFFICER':
        return {
          title: 'S&T (Signalling)',
          bg: 'bg-emerald-800 text-emerald-100 border-emerald-600',
          dot: 'bg-emerald-400',
        };
      case 'TRD_OFFICER':
        return {
          title: 'TRD (Traction / OHE)',
          bg: 'bg-amber-800 text-amber-100 border-amber-600',
          dot: 'bg-amber-400',
        };
      case 'SECTION_CONTROLLER':
        return {
          title: 'Section Controller (Admin)',
          bg: 'bg-purple-900 text-purple-100 border-purple-500 ring-1 ring-amber-400/50',
          dot: 'bg-amber-400 animate-pulse',
        };
      default:
        return {
          title: 'Railway Official',
          bg: 'bg-slate-800 text-slate-100 border-slate-700',
          dot: 'bg-slate-400',
        };
    }
  };

  const badgeInfo = currentUser ? getRoleBadge(currentUser) : null;

  return (
    <header id="raksha-header" className="sticky top-0 z-50 w-full shadow-md bg-[#000075] text-white">
      {/* Topmost Official Bar with Tri-color Accent & Gold Typography */}
      <div className="bg-[#00005a] border-b border-[#000085] px-3 sm:px-4 py-1.5 text-[11px] text-slate-200">
        <div className="max-w-[1800px] w-full mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="font-semibold text-amber-300 whitespace-nowrap">भारत सरकार • रेल मंत्रालय</span>
            <span className="text-slate-400 hidden sm:inline">|</span>
            <span className="font-medium tracking-wide text-white hidden md:inline truncate">
              GOVERNMENT OF INDIA • MINISTRY OF RAILWAYS • PAN-INDIA FOIS PORTAL
            </span>
          </div>
          <div className="flex items-center space-x-3 text-slate-200 shrink-0">
            <div className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono text-amber-300 font-bold">{istTime}</span>
              <span className="text-slate-300 text-[10px] hidden sm:inline">({istDate})</span>
            </div>
            <span className="text-slate-500 hidden lg:inline">|</span>
            <div className="hidden lg:flex items-center space-x-1 text-slate-200">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium">
                {activeZone === 'ALL'
                  ? 'Pan-India Unified FOIS • All 5 Active Zonal Networks'
                  : `${ZONAL_RAILWAYS[activeZone]?.name} • ${ZONAL_RAILWAYS[activeZone]?.division}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Top Navigation Header with IRCTC / CRIS / FOIS Emblem Crest */}
      <div className="max-w-[1800px] w-full mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
        {/* Logo & Emblem Brand Area */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0 max-w-full">
          {/* Authentic Indian Railways Emblem Inspired Crest with Ashoka Wheel & Train Motif */}
          <div className="relative flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-white to-amber-50 flex items-center justify-center shadow-md border-2 border-amber-400 ring-2 ring-blue-900/40">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-blue-900 flex flex-col items-center justify-center bg-slate-50 text-center p-0.5">
              <Train className="w-4 h-4 sm:w-5 sm:h-5 text-[#000075]" />
              <span className="text-[6px] sm:text-[7px] font-black text-amber-600 leading-none tracking-tighter">IR</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-amber-500 text-blue-950 flex items-center justify-center text-[6px] sm:text-[7px] font-extrabold shadow ring-1 ring-white">
              ⚙️
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <div className="leading-tight">
                <div className="text-[9px] sm:text-[10px] font-bold text-amber-300 tracking-wider flex items-center space-x-1">
                  <span>भारतीय रेल</span>
                  <span>•</span>
                  <span>INDIAN RAILWAYS</span>
                </div>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-base sm:text-xl font-black tracking-tight text-white flex items-center">
                    RAKSHA-BLOCK
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-blue-200 hidden lg:block font-normal mt-0.5">
              भारतीय रेल स्वचालित ब्लॉक नियोजन एवं गलियारा अनुरक्षण प्रणाली | AI Corridor Block Planning System
            </p>
          </div>
        </div>

        {/* Right Action & Role Bar with Zone Selector */}
        <div className="mobile-header-actions flex w-full sm:w-auto flex-wrap items-center justify-end gap-1.5 sm:gap-2.5 shrink-0">
          {/* Integrated Pan-India Zone Selector */}
          {onSelectZone && (
            <div className="flex min-w-0 max-w-full flex-1 sm:flex-none items-center">
              <ZoneSelector
                activeZone={activeZone}
                onSelectZone={onSelectZone}
                compact={false}
              />
            </div>
          )}

          {currentUser ? (
            <>
              {/* Officer Role & Designation Badge */}
              <div className="hidden lg:flex items-center bg-blue-950/70 border border-blue-800 rounded-lg px-3 py-1.5 text-left">
                <div className="w-7 h-7 rounded-full bg-white/10 text-amber-400 flex items-center justify-center mr-2.5 font-bold text-xs">
                  {currentUser.avatarBadge}
                </div>
                <div className="leading-tight">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-semibold text-white truncate max-w-[140px] xl:max-w-[180px]">
                      {currentUser.name}
                    </span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${badgeInfo?.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${badgeInfo?.dot}`} />
                      {badgeInfo?.title}
                    </span>
                  </div>
                  <div className="text-[10px] text-blue-300 flex items-center space-x-2">
                    <span>{currentUser.designation}</span>
                    <span>•</span>
                    <span className="font-mono text-amber-200">{currentUser.employeeId}</span>
                  </div>
                </div>
              </div>

              {/* Mobile / Tablet Role Badge */}
              <div className="lg:hidden flex items-center">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-[10px] sm:text-[11px] font-semibold border ${badgeInfo?.bg}`}
                  title={`${currentUser.name} (${badgeInfo?.title})`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full mr-1 ${badgeInfo?.dot}`} />
                  {currentUser.avatarBadge}
                </span>
              </div>

              {/* Interactive Real-Time Notification Bell */}
              <button
                id="btn-notification-bell"
                onClick={onOpenNotificationCenter}
                className="relative p-1.5 sm:p-2 rounded-lg bg-blue-900/80 hover:bg-blue-800 border border-blue-700/80 text-amber-300 hover:text-white transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-400 group"
                title="Railway Real-Time Notification Center & Audio Alerts"
                aria-label="Open notifications"
              >
                <Bell className="w-4 h-4 transition-transform group-hover:scale-110 text-amber-400" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full text-[10px] font-black bg-amber-500 text-[#000075] ring-2 ring-[#000075] shadow-sm animate-pulse">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </button>

              {/* Mandatory Logout / Switch Role Button */}
              <button
                id="btn-logout-switch-role"
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 active:bg-amber-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer"
                title="Logout from current department or switch role"
              >
                <LogOut className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline whitespace-nowrap">Logout / Switch Role</span>
                <span className="sm:hidden">Logout</span>
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2 text-xs text-blue-200">
              <div className="flex items-center space-x-1 bg-blue-900/60 border border-blue-700/60 rounded px-2.5 py-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium text-slate-200 hidden sm:inline">Official Portal Access Only</span>
                <span className="font-medium text-slate-200 sm:hidden">Official Access</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Navigation Bar: Persistent across all post-login screens (Demand Management & Live Analytics & Line Map) */}
      {currentUser && onSelectNavTab && (
        <nav id="top-nav-tabs" aria-label="Main Navigation" className="bg-[#00005a] border-t border-blue-900/90 px-3 sm:px-6">
          <div className="max-w-[1800px] w-full mx-auto flex items-center justify-between gap-2 overflow-x-auto whitespace-nowrap">
            <div className="flex items-center space-x-1 sm:space-x-2 py-0.5">
              <button
                id="nav-tab-demand-management"
                onClick={() => onSelectNavTab('DEMAND')}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer shrink-0 ${
                  activeNavTab === 'DEMAND'
                    ? 'border-amber-400 text-amber-300 bg-blue-950/80 shadow-xs'
                    : 'border-transparent text-blue-200 hover:text-white hover:bg-blue-900/50'
                }`}
              >
                <Layers className="w-4 h-4 text-blue-300" />
                <span>Demand Management</span>
              </button>

              <button
                id="nav-tab-live-analytics-map"
                onClick={() => onSelectNavTab('MAP_ANALYTICS')}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer shrink-0 ${
                  activeNavTab === 'MAP_ANALYTICS'
                    ? 'border-amber-400 text-amber-300 bg-blue-950/80 shadow-xs'
                    : 'border-transparent text-blue-200 hover:text-white hover:bg-blue-900/50'
                }`}
              >
                <Compass className="w-4 h-4 text-cyan-300" />
                <span>Live Analytics & Line Map</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </button>

              <button
                id="nav-tab-gantt-chart"
                onClick={() => onSelectNavTab('GANTT')}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer shrink-0 ${
                  activeNavTab === 'GANTT'
                    ? 'border-amber-400 text-amber-300 bg-blue-950/80 shadow-xs'
                    : 'border-transparent text-blue-200 hover:text-white hover:bg-blue-900/50'
                }`}
              >
                <Layers className="w-4 h-4 text-amber-300" />
                <span>Gantt Chart</span>
              </button>
            </div>

            {/* Quick Context Division indicator */}
            <div className="flex items-center space-x-2.5 text-[11px] py-1">
              <div className="hidden md:flex items-center space-x-2 text-blue-300">
                <span className="font-mono text-amber-300 font-semibold">
                  {activeZone === 'ALL'
                    ? 'PAN-INDIA GEOPORTAL (5 ZONES)'
                    : `${activeZone} - ${ZONAL_RAILWAYS[activeZone]?.divisionCode} GEOPORTAL`}
                </span>
                <span>•</span>
                <span className="text-slate-300">WGS84 Esri Satellite Layer</span>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Indian Railways Saffron Accent Stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

      {/* IRCTC Official Ticker Banner: Slow-scrolling marquee bar with IRCTC orange background (#ea580c / #f37023) */}
      <div
        id="irctc-marquee-ticker"
        className="bg-[#ea580c] text-white text-xs font-semibold py-1.5 px-3 sm:px-4 overflow-hidden border-b border-amber-700 flex items-center shadow-inner relative z-10 select-none"
      >
        <div className="flex-shrink-0 flex items-center space-x-1.5 bg-[#000075] text-amber-300 px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-black mr-2.5 sm:mr-3 shadow-xs border border-amber-400/40 z-20">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping mr-0.5" />
          <span>सूचना / BULLETIN</span>
        </div>
        <div className="overflow-hidden whitespace-nowrap w-full relative flex items-center">
          <div className="animate-irctc-marquee flex items-center space-x-8 text-white tracking-wide text-[11px] sm:text-xs">
            <span className="font-semibold">
              🚆 RAKSHA-BLOCK ACTIVE: Automated Line Clearance &amp; Maintenance Optimizer • Operating across NR, WR, CR, ER, and SR Zonal Networks • Real-time Supabase Data Synchronization &amp; Safety Clearances Online.
            </span>
            <span className="text-amber-200 font-bold">★ ★ ★</span>
            <span className="font-semibold">
              🚆 RAKSHA-BLOCK ACTIVE: Automated Line Clearance &amp; Maintenance Optimizer • Operating across NR, WR, CR, ER, and SR Zonal Networks • Real-time Supabase Data Synchronization &amp; Safety Clearances Online.
            </span>
            <span className="text-amber-200 font-bold">★ ★ ★</span>
          </div>
        </div>
      </div>

      {/* Feature 3: Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirmLogout={() => {
          setShowLogoutModal(false);
          onLogout();
        }}
        currentUser={currentUser}
      />
    </header>
  );
};
