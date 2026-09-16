import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LoginPortal } from './components/LoginPortal';
import { DepartmentDashboard } from './components/DepartmentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
const LiveAnalyticsMapDashboard = lazy(() => import('./components/LiveAnalyticsMapDashboard').then((module) => ({ default: module.LiveAnalyticsMapDashboard })));
const GanttChart = lazy(() => import('./components/GanttChart').then((module) => ({ default: module.GanttChart })));
import { NewRequestModal } from './components/NewRequestModal';
import { RequestDetailModal } from './components/RequestDetailModal';
import { AdminActionModal } from './components/AdminActionModal';
import { SupabaseStatusModal } from './components/SupabaseStatusModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { SafetyCheckoutModal } from './components/SafetyCheckoutModal';
import {
  getStoredRequests,
  saveStoredRequests,
  clearAllStoredRequests,
  resetStoredRequests,
  getStoredUser,
  saveStoredUser,
  OFFICIAL_ROLES,
} from './data/mockData';
import {
  BlockRequest,
  User,
  UserRole,
  SupabaseSyncState,
  AppNotification,
  NotificationType,
  RailwayZoneCode,
} from './types';
import {
  fetchBlockRequestsFromSupabase,
  insertBlockRequestToSupabase,
  updateBlockRequestInSupabase,
  deleteBlockRequestInSupabase,
  deleteAllBlockRequestsInSupabase,
  batchUpdateBlockRequestsInSupabase,
  insertAiScheduleLogToSupabase,
  setupRealtimeSync,
} from './lib/supabase';
import { playRailwayChime, isAudioMuted, setAudioMuted } from './utils/audioAlert';
import { broadcastScheduleChange } from './services/realtimeSync';
import { CheckCircle2, Info, X } from 'lucide-react';

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'NEW_DEMAND',
    title: 'Emergency P-Way Requisition Filed',
    message: 'REQ-ENG-2026-001 submitted by Engineering for Deep Track Screening on NDLS-GZB Section (KM 12.40 - 15.80).',
    timestamp: '10:30 IST',
    read: false,
    requestId: 'REQ-ENG-2026-001',
    department: 'ENGINEERING',
    targetRole: 'SECTION_CONTROLLER',
    priority: 'HIGH',
  },
  {
    id: 'notif-2',
    type: 'STATUS_APPROVED',
    title: 'Block Sanctioned by Main Control',
    message: 'REQ-ST-2026-002 has been APPROVED by Section Controller for 01:30 - 05:00 IST window.',
    timestamp: '09:45 IST',
    read: false,
    requestId: 'REQ-ST-2026-002',
    department: 'ST',
    targetRole: 'ST_OFFICER',
    priority: 'NORMAL',
  },
  {
    id: 'notif-3',
    type: 'AI_OPTIMIZATION',
    title: 'Corridor Bundling Window Available',
    message: 'CP-SAT Optimizer bundled TRD 25kV OHE isolation inside Engineering P-Way window on GZB-ALJN Up line.',
    timestamp: '09:15 IST',
    read: true,
    targetRole: 'ALL',
    priority: 'NORMAL',
  },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const [allRequests, setAllRequests] = useState<BlockRequest[]>(() => getStoredRequests());
  const [activeNavTab, setActiveNavTab] = useState<'DEMAND' | 'MAP_ANALYTICS' | 'GANTT'>('DEMAND');
  const [activeZone, setActiveZone] = useState<RailwayZoneCode>(() => {
    const user = getStoredUser();
    return user?.zoneCode || 'ALL';
  });

  // Supabase Sync & Connection State
  const [syncState, setSyncState] = useState<SupabaseSyncState>({
    isConnected: false,
    isRealtimeActive: false,
    status: 'CONNECTING',
  });
  const [isDbModalOpen, setIsDbModalOpen] = useState<boolean>(false);

  // Notification Center & Audio Alert State
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = localStorage.getItem('raksha_block_notifications');
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return DEFAULT_NOTIFICATIONS;
  });
  const [isAudioMutedState, setIsAudioMutedState] = useState<boolean>(() => isAudioMuted());
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false);

  // Modal states
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [activeDetailRequest, setActiveDetailRequest] = useState<BlockRequest | null>(null);
  const [activeAdminActionRequest, setActiveAdminActionRequest] = useState<BlockRequest | null>(null);
  const [activeSafetyCheckoutRequest, setActiveSafetyCheckoutRequest] = useState<BlockRequest | null>(null);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const saveNotifications = (newList: AppNotification[]) => {
    setNotifications(newList);
    try {
      localStorage.setItem('raksha_block_notifications', JSON.stringify(newList));
    } catch (err) {
      console.warn('Failed to persist notifications:', err);
    }
  };

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const timeStr =
      new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      }) + ' IST';

    const newEntry: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: timeStr,
      read: false,
    };

    const notificationKey = notif.requestId
      ? `${notif.type}|${notif.requestId}`
      : `${notif.type}|${notif.title}|${notif.message}`;

    setNotifications((prev) => {
      const alreadyExists = prev.some(
        (item) => (item.requestId
          ? `${item.type}|${item.requestId}`
          : `${item.type}|${item.title}|${item.message}`) === notificationKey
      );
      if (alreadyExists) return prev;
      const updated = [newEntry, ...prev];
      try {
        localStorage.setItem('raksha_block_notifications', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to persist notifications:', err);
      }
      return updated;
    });

    // Crisp Indian Railways control room chime
    playRailwayChime(false);
  };

  const getDepartmentRole = (department: BlockRequest['department']): UserRole => {
    if (department === 'ENGINEERING') return 'ENG_OFFICER';
    if (department === 'ST') return 'ST_OFFICER';
    return 'TRD_OFFICER';
  };

  const isNotificationVisibleToUser = (item: AppNotification, user: User | null): boolean => {
    if (!user) return false;
    if (item.targetRole === 'ALL' || !item.targetRole) return true;
    if (item.targetRole === user.role) return true;
    return user.role === 'SECTION_CONTROLLER' && Boolean(item.department);
  };

  const handleToggleMute = () => {
    const nextMuted = !isAudioMutedState;
    setIsAudioMutedState(nextMuted);
    setAudioMuted(nextMuted);
    showToast(nextMuted ? 'Audio chime muted' : 'Audio chime enabled', 'info');
  };

  const handleMarkAsRead = (id: string) => {
    saveNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllAsRead = () => {
    saveNotifications(notifications.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read', 'info');
  };

  const handleClearAllNotifications = () => {
    saveNotifications([]);
    showToast('All notifications cleared', 'info');
  };

  // Direct Landing Routing: Auto-scroll, highlight, and open modal
  const handleSelectNotification = (notification: AppNotification) => {
    handleMarkAsRead(notification.id);
    setIsNotificationCenterOpen(false);
    setActiveNavTab('DEMAND');

    if (notification.requestId) {
      const targetReq = allRequests.find((r) => r.id === notification.requestId);
      if (targetReq) {
        setActiveDetailRequest(targetReq);

        setTimeout(() => {
          const rowEl = document.getElementById(`req-row-${targetReq.id}`);
          if (rowEl) {
            rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            rowEl.classList.add('bg-amber-100', 'ring-2', 'ring-amber-500');
            setTimeout(() => {
              rowEl.classList.remove('bg-amber-100', 'ring-2', 'ring-amber-500');
            }, 3000);
          }
        }, 200);
      }
    }
  };

  // Unread badge count tailored to active role & department
  const unreadNotificationCount = notifications.filter((item, index, list) => {
    if (item.read || !isNotificationVisibleToUser(item, currentUser)) return false;
    const key = item.requestId
      ? `${item.type}|${item.requestId}`
      : `${item.type}|${item.title}|${item.message}`;
    return list.findIndex((candidate) => (candidate.requestId
      ? `${candidate.type}|${candidate.requestId}`
      : `${candidate.type}|${candidate.title}|${candidate.message}`) === key) === index;
  }).length;

  // Initialize Supabase Data and Realtime Synchronization
  useEffect(() => {
    let isMounted = true;

    async function initializeSupabaseData() {
      try {
        setSyncState((prev) => ({ ...prev, status: 'CONNECTING' }));
        const res = await fetchBlockRequestsFromSupabase();

        if (!isMounted) return;

        if (res.fromSupabase) {
          setAllRequests(res.requests);
          saveStoredRequests(res.requests);
        }

        const now = new Date().toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        setSyncState({
          status: res.fromSupabase ? 'CONNECTED' : 'OFFLINE_FALLBACK',
          lastSyncedAt: res.fromSupabase ? `${now} IST` : null,
          activeChannel: false,
          errorMessage: res.fromSupabase ? null : res.error || 'Supabase data unavailable; local fallback is active.',
          pendingSyncCount: 0,
        });
      } catch (err: any) {
        console.warn('Supabase initial fetch failed, using local fallback cache:', err);
        if (isMounted) {
          setSyncState({
            isConnected: false,
            isRealtimeActive: false,
            status: 'OFFLINE_FALLBACK',
            errorMessage: err?.message || 'Network unreachable',
          });
        }
      }
    }

    initializeSupabaseData();

    // Setup Realtime Sync listener
    const cleanupRealtime = setupRealtimeSync({
      onBlockRequestChange: (changeType, record) => {
        if (changeType === 'INSERT') {
          setAllRequests((prev) => {
            if (prev.some((r) => r.id === record.id)) return prev;
            const updated = [record, ...prev];
            saveStoredRequests(updated);
            return updated;
          });

          // Role-specific notification and chime alert
          addNotification({
            type: 'NEW_DEMAND',
            title: `New Demand: ${record.id}`,
            message: `${record.department} officer filed block requisition for ${record.section} (${record.requestedStartTime} - ${record.requestedEndTime}).`,
            requestId: record.id,
            department: record.department,
            targetRole: 'SECTION_CONTROLLER',
            priority: record.priority === 'SAFETY_CRITICAL' ? 'HIGH' : 'NORMAL',
          });

          showToast(`Real-time Sync: New ${record.department} request ${record.id} received.`, 'info');
        } else if (changeType === 'UPDATE') {
          if (record.status === 'COMPLETED' || record.status === 'REJECTED') {
            setAllRequests((prev) => {
              const updated = prev.filter((request) => request.id !== record.id);
              saveStoredRequests(updated);
              return updated;
            });
            return;
          }
          setAllRequests((prev) => {
            const updated = prev.map((r) => (r.id === record.id ? record : r));
            saveStoredRequests(updated);
            return updated;
          });

          const isApproved = record.status === 'APPROVED';
          const isModified = record.status === 'MODIFIED_APPROVED';

          const notifType: NotificationType = isApproved
            ? 'STATUS_APPROVED'
            : isModified
            ? 'STATUS_MODIFIED'
            : 'SYSTEM';

          const title = isApproved
            ? `Block Sanctioned by Main Control`
            : isModified
            ? `Block Modified & Sanctioned`
            : `Requisition ${record.id} Updated`;

          const timeWindow = `${record.approvedStartTime || record.requestedStartTime} - ${
            record.approvedEndTime || record.requestedEndTime
          }`;

          const message = isApproved
            ? `🔔 ${record.id} has been APPROVED by Section Control for ${timeWindow}.`
            : isModified
            ? `🔔 ${record.id} modified to window ${timeWindow}. Remarks: ${record.controllerRemarks || 'Corridor sync'}`
            : `Requisition ${record.id} status changed to ${record.status}.`;

          addNotification({
            type: notifType,
            title,
            message,
            requestId: record.id,
            department: record.department,
            targetRole: getDepartmentRole(record.department),
            priority: record.priority === 'SAFETY_CRITICAL' ? 'HIGH' : 'NORMAL',
          });

          showToast(`Real-time Sync: Requisition ${record.id} updated [${record.status}].`, 'info');
        } else if (changeType === 'DELETE') {
          setAllRequests((prev) => {
            const updated = prev.filter((r) => r.id !== record.id);
            saveStoredRequests(updated);
            return updated;
          });
        }
      },
      onAiScheduleChange: (scheduleRecord) => {
        addNotification({
          type: 'AI_OPTIMIZATION',
          title: `AI Master Schedule Published`,
          message: `Corridor Master Schedule "${scheduleRecord.schedule_name}" published! Saved ${scheduleRecord.total_hours_saved}h across ${scheduleRecord.conflicts_resolved} bundled windows.`,
          targetRole: 'ALL',
          priority: 'HIGH',
        });
        showToast(`Real-time Sync: AI Schedule "${scheduleRecord.schedule_name}" published!`, 'info');
      },
      onStatusChange: (statusState) => {
        if (!isMounted) return;
        setSyncState(statusState);
      },
    });

    // Keep browser sessions converged even when Supabase Realtime publication
    // settings are unavailable. Realtime remains the fast path; polling is the
    // automatic recovery path.
    const syncInterval = window.setInterval(async () => {
      const res = await fetchBlockRequestsFromSupabase();
      if (!isMounted || !res.fromSupabase) return;

      setAllRequests(res.requests);
      saveStoredRequests(res.requests);

      setSyncState((previous) => ({
        ...previous,
        status: previous.activeChannel ? previous.status : 'SYNCED',
        lastSyncedAt: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
        errorMessage: null,
        pendingSyncCount: 0,
      }));
    }, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(syncInterval);
      cleanupRealtime();
    };
  }, []);

  // Force manual resynchronization from Supabase cloud
  const handleForceResync = async () => {
    try {
      const res = await fetchBlockRequestsFromSupabase();
      if (res.fromSupabase) {
        setAllRequests(res.requests);
        saveStoredRequests(res.requests);
      }
      const now = new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      if (!res.fromSupabase) {
        throw new Error(res.error || 'Supabase data unavailable; local fallback is active.');
      }
      setSyncState({
        status: 'SYNCED',
        lastSyncedAt: `${now} IST`,
        activeChannel: true,
        errorMessage: null,
        pendingSyncCount: 0,
      });
      showToast('Database synchronized with Supabase cloud successfully.', 'success');
    } catch (err: any) {
      showToast(`Sync failed: ${err?.message || 'Network error'}. Local cache retained.`, 'info');
      throw err;
    }
  };

  // Login handler
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    saveStoredUser(user);
    showToast(`Authenticated as ${user.name} (${user.designation})`, 'success');
  };

  const handleSelectRole = (role: UserRole, dynamicUser?: User) => {
    const user = dynamicUser || OFFICIAL_ROLES[role];
    handleLoginSuccess(user);
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    saveStoredUser(null);
    setActiveNavTab('DEMAND');
    setIsNewRequestOpen(false);
    setActiveDetailRequest(null);
    setActiveAdminActionRequest(null);
    showToast('Logged out successfully. Returned to RAKSHA-BLOCK Login Portal.', 'info');
  };

  // Add new block request (Submitted by Department Officer)
  const handleCreateRequest = async (newReq: BlockRequest) => {
    // STRICT SECURITY VERIFICATION: Ensure the request department matches the logged-in user department
    if (!currentUser || currentUser.department !== newReq.department) {
      alert('Security Violation: You can only submit requisitions for your own authorized department.');
      return;
    }

    // Optimistically update local state & cache
    const updated = [newReq, ...allRequests];
    setAllRequests(updated);
    saveStoredRequests(updated);

    // Immediate dispatch notification
    addNotification({
      type: 'NEW_DEMAND',
      title: `New Demand Filed: ${newReq.id}`,
      message: `${newReq.department} submitted requisition for ${newReq.section} (${newReq.requestedStartTime} - ${newReq.requestedEndTime}). Awaiting Section Controller clearance.`,
      requestId: newReq.id,
      department: newReq.department,
      targetRole: 'SECTION_CONTROLLER',
      priority: newReq.priority === 'SAFETY_CRITICAL' ? 'HIGH' : 'NORMAL',
    });

    try {
      const dbRes = await insertBlockRequestToSupabase(newReq);
      if (dbRes.success) {
        showToast(`Block Requisition ${newReq.id} submitted & synced to Supabase.`, 'success');
      } else {
        showToast(`Block Requisition ${newReq.id} submitted (Offline local cache active).`, 'info');
      }
    } catch (err) {
      console.warn('Supabase insertion fallback:', err);
      showToast(`Requisition ${newReq.id} saved in local RLS cache.`, 'info');
    }
  };

  // Admin action (Sanction, Modify, or Reject by Section Controller)
  const handleAdminAction = async (updatedReq: BlockRequest) => {
    // STRICT SECURITY VERIFICATION: ONLY Section Controller can execute this
    if (!currentUser || currentUser.role !== 'SECTION_CONTROLLER') {
      alert('Security Violation: Only the Main Control Administrator possesses sanction authority.');
      return;
    }

    // Optimistically update local state & cache. Rejected blocks leave the active register.
    const updated = updatedReq.status === 'REJECTED'
      ? allRequests.filter((r) => r.id !== updatedReq.id)
      : allRequests.map((r) => (r.id === updatedReq.id ? updatedReq : r));
    setAllRequests(updated);
    saveStoredRequests(updated);

    const actionText =
      updatedReq.status === 'APPROVED'
        ? 'Sanctioned'
        : updatedReq.status === 'MODIFIED_APPROVED'
        ? 'Modified & Sanctioned'
        : 'Rejected';

    const notifType: NotificationType =
      updatedReq.status === 'APPROVED'
        ? 'STATUS_APPROVED'
        : updatedReq.status === 'MODIFIED_APPROVED'
        ? 'STATUS_MODIFIED'
        : 'STATUS_REJECTED';

    const timeWindow = `${updatedReq.approvedStartTime || updatedReq.requestedStartTime} - ${
      updatedReq.approvedEndTime || updatedReq.requestedEndTime
    }`;

    addNotification({
      type: notifType,
      title: `Block ${actionText}: ${updatedReq.id}`,
      message: `Requisition ${updatedReq.id} has been ${actionText} by Main Control for window ${timeWindow}.`,
      requestId: updatedReq.id,
      department: updatedReq.department,
      targetRole: getDepartmentRole(updatedReq.department),
      priority: updatedReq.priority === 'SAFETY_CRITICAL' ? 'HIGH' : 'NORMAL',
    });

    try {
      const dbRes = updatedReq.status === 'REJECTED'
        ? await deleteBlockRequestInSupabase(updatedReq.id)
        : await updateBlockRequestInSupabase(updatedReq);
      if (dbRes.success) {
        if (updatedReq.status === 'APPROVED' || updatedReq.status === 'MODIFIED_APPROVED') {
          void broadcastScheduleChange(updatedReq.section, updatedReq.status === 'APPROVED' ? 'APPROVED' : 'RESCHEDULED', updatedReq as unknown as Record<string, unknown>);
        }
        showToast(`Requisition ${updatedReq.id} ${actionText} & synced to Supabase.`, 'success');
      } else {
        showToast(`Requisition ${updatedReq.id} ${actionText} (Offline cache active).`, 'info');
      }
    } catch (err) {
      console.warn('Supabase update fallback:', err);
      showToast(`Requisition ${updatedReq.id} has been ${actionText} in local state.`, 'info');
    }
  };

  // Feature 2: Site Engineer Safety Checkout & Line Clearance Submission
  const handleSafetyClearanceSubmit = async (clearedReq: BlockRequest) => {
    const bundleId = clearedReq.aiBundleId;
    const closedAt = clearedReq.closedAt || new Date().toISOString();
    const updatedRequest = { ...clearedReq, status: 'COMPLETED' as const, closedAt };
    const updated = allRequests.map((request) => {
      const belongsToBundle = Boolean(bundleId && request.aiBundleId === bundleId);
      return request.id === clearedReq.id || belongsToBundle
        ? { ...request, status: 'COMPLETED' as const, closedAt, safetyClearedAt: updatedRequest.safetyClearedAt, safetyClearedBy: updatedRequest.safetyClearedBy, safetyChecklistPassed: updatedRequest.safetyChecklistPassed, controllerRemarks: updatedRequest.controllerRemarks }
        : request;
    });
    setAllRequests(updated);
    saveStoredRequests(updated);
    setActiveSafetyCheckoutRequest(null);
    if (activeDetailRequest?.id === clearedReq.id) {
      setActiveDetailRequest(updatedRequest);
    }

    const engineerName = clearedReq.safetyClearedBy || currentUser?.name || 'Site Engineer';

    // Persist each bundled item so the audit trail remains visible across clients.
    try {
      const closedRequests = updated.filter((request) => request.status === 'COMPLETED' && (request.id === clearedReq.id || Boolean(bundleId && request.aiBundleId === bundleId)));
      const results = await Promise.all(closedRequests.map((request) => updateBlockRequestInSupabase(request)));
      if (results.some((result) => !result.success)) {
        showToast('Safety clearance saved locally, but one or more bundled records need cloud sync retry.', 'info');
      }
    } catch (err) {
      console.warn('Supabase completed-block update fallback:', err);
    }

    // 3. Real-time notification dispatch with audio chime to the affected department and Main Control Admin
    addNotification({
      type: 'STATUS_APPROVED',
      title: `Line Clear: ${clearedReq.id}`,
      message: `✅ Safety Clearance Received: ${clearedReq.id} line cleared by Site Engineer (${engineerName}). All staff retreated, tools removed, OHE/S&T restored. Section reopened for train traffic.`,
      requestId: clearedReq.id,
      department: clearedReq.department,
      targetRole: getDepartmentRole(clearedReq.department),
      priority: 'HIGH',
    });

    showToast(`✅ Safety Clearance Received: ${clearedReq.id} line cleared by Site Engineer. Status: Completed / Line Clear`, 'success');

  };

  // Batch apply AI Master Schedule generated by CP-SAT solver
  const handleApplyAiSchedule = async (
    updatedRequests: BlockRequest[],
    solverMeta?: {
      scheduleName: string;
      hoursSaved: number;
      conflictsResolved: number;
      bundlesJson: any;
    }
  ) => {
    if (!currentUser || currentUser.role !== 'SECTION_CONTROLLER') {
      alert('Security Violation: Only the Main Control Administrator possesses sanction authority.');
      return;
    }

    // Bundle actions update the existing requisitions by ID. Normalize both
    // collections first so repeated callback payloads cannot create duplicate rows.
    const updateMap: Record<string, BlockRequest> = {};
    updatedRequests.forEach((request: BlockRequest) => {
      updateMap[request.id] = request;
    });

    const uniqueRequests: BlockRequest[] = [];
    const seenRequestIds = new Set<string>();
    allRequests.forEach((request: BlockRequest) => {
      if (!seenRequestIds.has(request.id)) {
        seenRequestIds.add(request.id);
        uniqueRequests.push(request);
      }
    });

    const merged = uniqueRequests.map((request: BlockRequest) => {
      const bundledRequest = updateMap[request.id];
      return bundledRequest
        ? {
            ...request,
            ...bundledRequest,
            status: 'APPROVED' as const,
            aiOptimized: true,
          }
        : request;
    });

    setAllRequests(merged);
    saveStoredRequests(merged);

    addNotification({
      type: 'AI_OPTIMIZATION',
      title: 'AI Master Schedule Published',
      message: `Corridor Master Schedule "${solverMeta?.scheduleName || 'Coordinated Window'}" sanctioned! ${solverMeta?.hoursSaved || '4.2'}h detention saved across ${solverMeta?.conflictsResolved || updatedRequests.length} bundled corridors.`,
      targetRole: 'ALL',
      priority: 'HIGH',
    });

    showToast(
      `AI Master Schedule Published! ${updatedRequests.length} maintenance demands successfully bundled and sanctioned into coordinated corridor windows.`,
      'success'
    );

    // Asynchronously synchronize with Supabase 3-table schema
    try {
      // 1. Batch update block_requests in Supabase
      await batchUpdateBlockRequestsInSupabase(updatedRequests);

      // 2. Audit log entry in ai_schedules table
      if (solverMeta) {
        await insertAiScheduleLogToSupabase({
          schedule_name: solverMeta.scheduleName,
          total_hours_saved: solverMeta.hoursSaved,
          conflicts_resolved: solverMeta.conflictsResolved,
          bundled_blocks_json: solverMeta.bundlesJson,
        });
      }
    } catch (err) {
      console.warn('Supabase AI schedule synchronization warning:', err);
    }
  };

  // Reset to default mock data
  const handleResetData = () => {
    if (window.confirm('Reset all block requisitions to default Indian Railways mock sample dataset?')) {
      const reset = resetStoredRequests();
      setAllRequests(reset);
      showToast('Mock sample dataset restored to initial state in localStorage.', 'info');
    }
  };

  const handleClearAllRequests = async () => {
    if (!window.confirm('This will permanently delete ALL block requests for everyone. This cannot be undone. Continue?')) {
      return;
    }

    const clearedRequests = clearAllStoredRequests();
    setAllRequests(clearedRequests);
    saveNotifications(notifications.filter((notification) => !notification.requestId));

    const supabaseResult = await deleteAllBlockRequestsInSupabase();
    if (supabaseResult.success) {
      showToast('All block requests were permanently cleared for everyone.', 'success');
    } else {
      showToast(`Local requests were cleared, but Supabase deletion failed: ${supabaseResult.error || 'Unknown error'}`, 'info');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-amber-500 selection:text-white">
      {/* Top Navigation Bar: Present on all screens (NO SIDEBAR NAVIGATION) */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onResetData={handleResetData}
        activeNavTab={activeNavTab}
        onSelectNavTab={setActiveNavTab}
        supabaseState={syncState}
        onOpenDbStatusModal={() => setIsDbModalOpen(true)}
        unreadNotificationCount={unreadNotificationCount}
        onOpenNotificationCenter={() => setIsNotificationCenterOpen(true)}
        activeZone={activeZone}
        onSelectZone={setActiveZone}
      />

      {/* Main Content Area */}
      {!currentUser ? (
        /* Official IRCTC Landing Page: Full-width Hero, Track Motifs, Evaluator Toolbar & 4 Department Consoles */
        <main className="flex-1 w-full">
          <LoginPortal
            onLoginSuccess={(user) => {
              handleLoginSuccess(user);
              if (user.zoneCode) setActiveZone(user.zoneCode);
            }}
            onSelectRole={handleSelectRole}
            onOpenDbStatusModal={() => setIsDbModalOpen(true)}
            supabaseState={syncState}
          />
        </main>
      ) : (
        <main className="flex-1 w-full max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6">
          {activeNavTab === 'MAP_ANALYTICS' ? (
            /* Live Analytics & Satellite Geographic Map: Rendered strictly INSIDE dashboard for logged-in officers */
            <Suspense fallback={<div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading live analytics map...</div>}>
              <LiveAnalyticsMapDashboard
                currentUser={currentUser}
                allRequests={allRequests}
                onViewRequestDetail={(req) => setActiveDetailRequest(req)}
                onOpenActionModal={(req) => setActiveAdminActionRequest(req)}
                onApplyAiSchedule={handleApplyAiSchedule}
                activeZone={activeZone}
                onSelectZone={setActiveZone}
              />
            </Suspense>
          ) : activeNavTab === 'GANTT' ? (
            <Suspense fallback={<div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading schedule chart...</div>}>
              <GanttChart
                currentUser={currentUser}
                allRequests={allRequests}
                activeZone={activeZone}
                onViewRequestDetail={(req) => setActiveDetailRequest(req)}
              />
            </Suspense>
          ) : currentUser.role === 'SECTION_CONTROLLER' ? (
            /* Main Control Administrator View: Cross-Department visibility + Exclusive Power */
            <AdminDashboard
              currentUser={currentUser}
              allRequests={allRequests}
              onOpenActionModal={(req) => setActiveAdminActionRequest(req)}
              onViewRequestDetail={(req) => setActiveDetailRequest(req)}
              onResetData={handleResetData}
              onClearAllRequests={handleClearAllRequests}
              onAdminAction={handleAdminAction}
              onApplyAiSchedule={handleApplyAiSchedule}
              onOpenSafetyCheckout={(req) => setActiveSafetyCheckoutRequest(req)}
              activeZone={activeZone}
            />
          ) : (
            /* Department Officer View: Engineering, S&T, or TRD */
            /* Strictly Isolated to their own department + ZERO approval rights */
            <DepartmentDashboard
              currentUser={currentUser}
              allRequests={allRequests}
              onOpenNewRequest={() => setIsNewRequestOpen(true)}
              onViewRequestDetail={(req) => setActiveDetailRequest(req)}
              onCreateNewRequest={handleCreateRequest}
              onOpenSafetyCheckout={(req) => setActiveSafetyCheckoutRequest(req)}
              activeZone={activeZone}
            />
          )}
        </main>
      )}

      {/* Official Government Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-[1800px] w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-[#000075]">RAKSHA-BLOCK</span>
            <span>•</span>
            <span>Indian Railways Automatic Block Planning & Field Execution System</span>
          </div>
          <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
            <span>Designed for Ministry of Railways</span>
          </div>
        </div>
      </footer>

      {/* Supabase 3-Table Engine & RLS Status Modal */}
      <SupabaseStatusModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        syncState={syncState}
        onForceResync={handleForceResync}
        totalRequestsCount={allRequests.length}
      />

      {/* Real-Time Interactive Notification Center Drawer with Audio Alerts */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        currentUser={currentUser}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onClearAll={handleClearAllNotifications}
        onSelectNotification={handleSelectNotification}
        isMuted={isAudioMutedState}
        onToggleMute={handleToggleMute}
      />

      {/* Modals */}
      {currentUser && currentUser.role !== 'SECTION_CONTROLLER' && (
        <NewRequestModal
          currentUser={currentUser}
          isOpen={isNewRequestOpen}
          onClose={() => setIsNewRequestOpen(false)}
          onSubmitRequest={handleCreateRequest}
        />
      )}

      {activeDetailRequest && (
        <RequestDetailModal
          request={activeDetailRequest}
          userRole={currentUser?.role || 'ENG_OFFICER'}
          isOpen={!!activeDetailRequest}
          onClose={() => setActiveDetailRequest(null)}
          onOpenAdminAction={(req) => setActiveAdminActionRequest(req)}
          onOpenSafetyCheckout={(req) => setActiveSafetyCheckoutRequest(req)}
        />
      )}

      {/* Feature 2: Site Engineer Safety Checkout & Line Clear Authorization Modal */}
      {activeSafetyCheckoutRequest && currentUser && (
        <SafetyCheckoutModal
          request={activeSafetyCheckoutRequest}
          currentUser={currentUser}
          isOpen={!!activeSafetyCheckoutRequest}
          onClose={() => setActiveSafetyCheckoutRequest(null)}
          onSubmitSafetyClearance={handleSafetyClearanceSubmit}
        />
      )}

      {currentUser?.role === 'SECTION_CONTROLLER' && activeAdminActionRequest && (
        <AdminActionModal
          request={activeAdminActionRequest}
          allRequests={allRequests}
          currentUser={currentUser}
          isOpen={!!activeAdminActionRequest}
          onClose={() => setActiveAdminActionRequest(null)}
          onSaveAction={handleAdminAction}
        />
      )}

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[70] flex items-center space-x-2 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-lg shadow-xl border border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
