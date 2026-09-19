import React, { useEffect, useState } from 'react';
import {
  Wrench,
  Radio,
  Zap,
  SlidersHorizontal,
  ArrowRight,
  Shield,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Phone,
  Building2,
  Info,
  ShieldAlert,
  Flame,
  Check,
  X,
  Layers,
  Train
} from 'lucide-react';
import { OFFICIAL_ROLES } from '../data/mockData';
import { User, UserRole, SupabaseSyncState } from '../types';
import { fetchProfilesFromSupabase, JUDGE_DEMO_CREDENTIALS } from '../lib/supabase';
import { DepartmentLoginModal } from './DepartmentLoginModal';

interface LoginPortalProps {
  onLoginSuccess: (user: User) => void;
  onSelectRole?: (role: UserRole, dynamicUser?: User) => void;
  onOpenDbStatusModal?: () => void;
  supabaseState?: SupabaseSyncState;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({
  onLoginSuccess,
  onSelectRole,
  onOpenDbStatusModal,
  supabaseState,
}) => {
  const [profiles, setProfiles] = useState<Record<UserRole, User>>({
    ENG_OFFICER: OFFICIAL_ROLES.ENG_OFFICER,
    ST_OFFICER: OFFICIAL_ROLES.ST_OFFICER,
    TRD_OFFICER: OFFICIAL_ROLES.TRD_OFFICER,
    SECTION_CONTROLLER: OFFICIAL_ROLES.SECTION_CONTROLLER,
  });
  const [isLoadingProfiles, setIsLoadingProfiles] = useState<boolean>(true);
  const [isFromSupabase, setIsFromSupabase] = useState<boolean>(false);

  // Department Login Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedModalRole, setSelectedModalRole] = useState<UserRole>('ENG_OFFICER');

  const handleOpenLoginModal = (role: UserRole) => {
    setSelectedModalRole(role);
    setIsModalOpen(true);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadDynamicProfiles() {
      try {
        const res = await fetchProfilesFromSupabase();
        if (isMounted && res.profiles && res.profiles.length > 0) {
          const profileMap = { ...profiles };
          res.profiles.forEach((p) => {
            if (p.role in profileMap) {
              profileMap[p.role as UserRole] = p;
            }
          });
          setProfiles(profileMap);
          setIsFromSupabase(res.fromSupabase);
        }
      } catch (err) {
        console.warn('Could not query Supabase profiles:', err);
      } finally {
        if (isMounted) setIsLoadingProfiles(false);
      }
    }

    loadDynamicProfiles();

    return () => {
      isMounted = false;
    };
  }, []);

  const rolesList: {
    role: UserRole;
    user: User;
    hindiTitle: string;
    title: string;
    subtitle: string;
    designationFull: string;
    serviceId: string;
    icon: React.ReactNode;
    colorClasses: {
      cardBorder: string;
      headerBg: string;
      badgeBg: string;
      badgeText: string;
      accentBg: string;
      buttonBg: string;
      iconBg: string;
      iconColor: string;
      hoverGlow: string;
    };
    scopeTag: string;
    permissions: string[];
    sampleTasks: string[];
    credentialsHint: { id: string; pass: string };
  }[] = [
    {
      role: 'ENG_OFFICER',
      user: profiles.ENG_OFFICER,
      hindiTitle: 'इंजीनियरिंग विभाग (पी-वे)',
      title: 'Engineering Department (P-Way)',
      subtitle: 'Permanent Way, Track Renewal & Heavy Earthworks',
      designationFull: 'Sr. DEN (Delhi Division)',
      serviceId: 'EMP-ENG-8821',
      icon: <Wrench className="w-6 h-6 text-blue-800" />,
      colorClasses: {
        cardBorder: 'border-blue-300 hover:border-blue-500',
        headerBg: 'bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 text-white',
        badgeBg: 'bg-blue-50 border-blue-300',
        badgeText: 'text-blue-900 font-bold',
        accentBg: 'bg-blue-50/70',
        buttonBg: 'bg-gradient-to-r from-[#000075] to-blue-900 hover:from-blue-900 hover:to-[#00005a]',
        iconBg: 'bg-blue-100 border-blue-200',
        iconColor: 'text-blue-800',
        hoverGlow: 'hover:shadow-blue-900/10',
      },
      scopeTag: 'DEPARTMENT ISOLATED',
      permissions: [
        'File track maintenance block requisitions (BCM, CSM, USFD)',
        'Isolated visibility: Engineering P-Way requisitions only',
        'Strictly ZERO Approval Authority (Railway Board Rule)',
      ],
      sampleTasks: ['BCM Deep Screening', 'CSM Track Tamping', 'USFD Rail Flaw Testing', 'Turnout Renewal'],
      credentialsHint: { id: 'eng', pass: 'eng@1234' },
    },
    {
      role: 'ST_OFFICER',
      user: profiles.ST_OFFICER,
      hindiTitle: 'सिग्नल एवं दूरसंचार विभाग',
      title: 'S&T (Signalling & Telecom)',
      subtitle: 'Electronic Interlocking, Point Machines & Track Circuits',
      designationFull: 'Sr. DSTE / Signalling (Delhi Division)',
      serviceId: 'EMP-ST-4419',
      icon: <Radio className="w-6 h-6 text-emerald-800" />,
      colorClasses: {
        cardBorder: 'border-emerald-300 hover:border-emerald-500',
        headerBg: 'bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-950 text-white',
        badgeBg: 'bg-emerald-50 border-emerald-300',
        badgeText: 'text-emerald-900 font-bold',
        accentBg: 'bg-emerald-50/70',
        buttonBg: 'bg-gradient-to-r from-emerald-800 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950',
        iconBg: 'bg-emerald-100 border-emerald-200',
        iconColor: 'text-emerald-800',
        hoverGlow: 'hover:shadow-emerald-900/10',
      },
      scopeTag: 'DEPARTMENT ISOLATED',
      permissions: [
        'Submit interlocking, point overhaul & axle counter requisitions',
        'Isolated visibility: S&T Department records only',
        'Strictly ZERO Approval Authority (Railway Board Rule)',
      ],
      sampleTasks: ['Point Machine Overhaul', 'Axle Counter Tuning', 'Signal Aspect Calibration', 'EI Route Locking'],
      credentialsHint: { id: 'st', pass: 'st@1234' },
    },
    {
      role: 'TRD_OFFICER',
      user: profiles.TRD_OFFICER,
      hindiTitle: 'विद्युत कर्षण वितरण विभाग',
      title: 'TRD (Traction & 25kV OHE)',
      subtitle: '25kV Overhead Equipment, Sub-stations & Power Isolations',
      designationFull: 'DEE / TRD Traction (Delhi Division)',
      serviceId: 'EMP-TRD-9032',
      icon: <Zap className="w-6 h-6 text-amber-800" />,
      colorClasses: {
        cardBorder: 'border-amber-300 hover:border-amber-500',
        headerBg: 'bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-white',
        badgeBg: 'bg-amber-50 border-amber-300',
        badgeText: 'text-amber-900 font-bold',
        accentBg: 'bg-amber-50/70',
        buttonBg: 'bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950',
        iconBg: 'bg-amber-100 border-amber-200',
        iconColor: 'text-amber-800',
        hoverGlow: 'hover:shadow-amber-900/10',
      },
      scopeTag: 'DEPARTMENT ISOLATED',
      permissions: [
        'Apply for 25kV AC OHE Power Block & PTW Clearances',
        'Isolated visibility: TRD Department records only',
        'Strictly ZERO Approval Authority (Railway Board Rule)',
      ],
      sampleTasks: ['25kV Power Block', 'Cantilever Washing', 'Neutral Section Check', 'Tower Wagon Run'],
      credentialsHint: { id: 'trd', pass: 'trd@1234' },
    },
    {
      role: 'SECTION_CONTROLLER',
      user: profiles.SECTION_CONTROLLER,
      hindiTitle: 'मुख्य नियंत्रण कक्ष (प्रशासक)',
      title: 'Main Control - Section Controller',
      subtitle: 'Traffic Operating (DOM Office) & Train Movement Authority',
      designationFull: 'Chief Controller / Operating (DOM Office, DLI)',
      serviceId: 'EMP-CTRL-001',
      icon: <SlidersHorizontal className="w-6 h-6 text-purple-900" />,
      colorClasses: {
        cardBorder: 'border-purple-300 hover:border-purple-500 ring-1 ring-purple-200',
        headerBg: 'bg-gradient-to-r from-purple-950 via-purple-900 to-[#00005a] text-white',
        badgeBg: 'bg-purple-100 border-purple-300',
        badgeText: 'text-purple-950 font-black',
        accentBg: 'bg-purple-50/70',
        buttonBg: 'bg-gradient-to-r from-purple-900 to-[#000075] hover:from-purple-950 hover:to-blue-950',
        iconBg: 'bg-purple-100 border-purple-200',
        iconColor: 'text-purple-950',
        hoverGlow: 'hover:shadow-purple-900/15',
      },
      scopeTag: 'ADMIN EXCLUSIVE AUTHORITY',
      permissions: [
        'Cross-department total visibility (Engineering, S&T, TRD)',
        'Exclusive authority: Approve, Time-Trim, or Reject requests',
        'AI CP-SAT Corridor Bundling & Caution Order Issuance',
      ],
      sampleTasks: ['Corridor Bundling Sanction', 'Caution Order Issuance', 'Punctuality Impact Matrix', 'Emergency Block Control'],
      credentialsHint: { id: 'admin', pass: 'admin@1234' },
    },
  ];

  return (
    <div className="w-full bg-[#f4f6f9] text-slate-800 pb-12 select-none">
      {/* 1. Official IRCTC Hero Banner with Railway Blueprint & Track Motif */}
      <section
        id="irctc-hero-section"
        className="relative bg-gradient-to-b from-[#00005a] via-[#000075] to-[#001f54] text-white overflow-hidden border-b-4 border-amber-500 shadow-lg"
      >
        {/* Subtle Railway Vector Background Motif */}
        <div className="absolute inset-0 opacity-10 bg-railway-blueprint pointer-events-none" />
        <div className="absolute inset-0 bg-rail-tracks-pattern pointer-events-none" />

        <div className="relative max-w-[1800px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-8 sm:pb-10">
          <div className="text-center max-w-4xl mx-auto space-y-3 sm:space-y-4">
            {/* Prominent Bilingual Heading */}
            <div>
              <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-sm break-words">
                <span className="text-amber-400">रक्षा-ब्लॉक पोर्टल</span>
                <span className="mx-2 sm:mx-3 text-slate-300 font-light">|</span>
                <span>RAKSHA-BLOCK PORTAL</span>
              </h1>
              <p className="mt-2 text-xs sm:text-sm lg:text-base text-blue-100 max-w-3xl mx-auto leading-relaxed font-medium px-2">
                भारतीय रेल स्वचालित ब्लॉक नियोजन एवं गलियारा अनुरक्षण प्रणाली
                <span className="block text-slate-300 text-xs sm:text-sm font-normal mt-0.5">
                  AI-Powered Automatic Block Planning & Corridor Maintenance Management System
                </span>
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Department Login Portal Cards (Grid of 4 with IRCTC / FOIS Aesthetics) */}
      <section id="department-login-cards-grid" className="max-w-[1800px] w-full mx-auto px-3 sm:px-6 lg:px-8 mt-6 sm:mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-5">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#000075] uppercase tracking-wide flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-amber-500 shrink-0" />
              <span>विभागीय लॉगिन पोर्टल | Authorized Department Consoles</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Select your department portal below. Role permissions and approval authorities are strictly enforced for authorized officers.
            </p>
          </div>
        </div>

        {/* 4 Distinct Department Cards: 4 columns on large laptops, 2 on medium, 1 on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 items-stretch">
          {rolesList.map((item, idx) => (
            <div
              key={item.role}
              id={`login-card-${item.role.toLowerCase()}`}
              onClick={() => handleOpenLoginModal(item.role)}
              className={`h-full bg-white rounded-xl border ${item.colorClasses.cardBorder} shadow-sm ${item.colorClasses.hoverGlow} hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden relative group cursor-pointer`}
            >
              {/* Card Official Department Header Ribbon */}
              <div className={`min-h-[78px] px-5 py-3.5 ${item.colorClasses.headerBg} flex items-center justify-between border-b`}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-200">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-amber-300 tracking-wider">
                      {item.hindiTitle}
                    </div>
                    <h3 className="text-base font-extrabold text-white tracking-tight leading-snug">
                      {item.title}
                    </h3>
                  </div>
                </div>

              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col gap-6">
                {/* Officer Credential Dossier Simulation */}
                <div className={`p-3.5 rounded-lg ${item.colorClasses.accentBg} border border-slate-200 text-xs`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm">{item.user.name}</div>
                      <div className="text-slate-600 text-xs mt-0.5">{item.designationFull}</div>
                    </div>
                    <div className="text-right text-[10px] text-slate-500">
                      {item.serviceId}
                    </div>
                  </div>
                </div>

                {/* Scope & Permissions List */}
                <div className="min-h-[126px]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                    <span>Access Scope & Authority</span>
                    <span className="text-[10px] font-mono text-slate-400">Security Standard 4.1</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {item.permissions.map((perm, pIdx) => (
                      <li key={pIdx} className="flex items-start space-x-2">
                        {pIdx === 2 && item.role !== 'SECTION_CONTROLLER' ? (
                          <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        )}
                        <span>{perm}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Card Official Action Button Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <button
                  id={`btn-login-${item.role.toLowerCase()}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenLoginModal(item.role);
                  }}
                  className={`w-full py-3 px-4 rounded-lg text-sm font-bold text-white ${item.colorClasses.buttonBg} shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer`}
                >
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>लॉग इन करें / LOG IN TO PORTAL</span>
                  <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Official Indian Railways Helpline & Emergency Support Directory */}
      <section id="railway-helpline-directory" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-slate-100 rounded-xl border border-slate-300 p-5 text-xs text-slate-700">
          <div className="flex items-center space-x-2 text-[#000075] font-bold text-sm mb-3">
            <Phone className="w-4 h-4 text-amber-600" />
            <span>आपातकालीन सहायता एवं नियंत्रण कक्ष निर्देशिका | Railway Helpline & Control Directory</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <div className="font-bold text-slate-900 text-xs">Delhi Division Control Room</div>
              <div className="font-mono text-sm text-[#000075] font-bold mt-1">011-23340000</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Direct Railway Line: 51200</div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <div className="font-bold text-slate-900 text-xs">Emergency Railway Helpline</div>
              <div className="font-mono text-sm text-red-700 font-bold mt-1">139 (Toll Free)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">24x7 Passenger & Security Support</div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <div className="font-bold text-slate-900 text-xs">FOIS / RAKSHA Support</div>
              <div className="font-mono text-xs text-blue-900 font-bold mt-1">fois-support@railnet.gov.in</div>
              <div className="text-[11px] text-slate-500 mt-0.5">CRIS Headquarters, Chanakyapuri</div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <div className="font-bold text-slate-900 text-xs">Safety Audit Directorate</div>
              <div className="font-mono text-xs text-emerald-800 font-bold mt-1">Indian Railways</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Baroda House, New Delhi 110001</div>
            </div>
          </div>
        </div>
      </section>

      {/* IRCTC-Styled Department Login Modal */}
      <DepartmentLoginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedRole={selectedModalRole}
        onSelectRoleChange={setSelectedModalRole}
        onLoginSuccess={(authenticatedUser) => {
          setIsModalOpen(false);
          onLoginSuccess(authenticatedUser);
          if (onSelectRole) {
            onSelectRole(authenticatedUser.role, authenticatedUser);
          }
        }}
      />

    </div>
  );
};
