import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Zap,
  Sparkles,
  Info,
} from 'lucide-react';
import { AppNotification, User } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectNotification: (notification: AppNotification) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onSelectNotification,
  isMuted,
  onToggleMute,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  if (!isOpen) return null;

  // Filter notifications for current user's role/department
  const filteredForUser = notifications.filter((item, index, list) => {
    if (!currentUser) return false;
    if (item.targetRole !== 'ALL' && item.targetRole && item.targetRole !== currentUser.role && currentUser.role !== 'SECTION_CONTROLLER') {
      return false;
    }
    const key = item.requestId
      ? `${item.type}|${item.requestId}`
      : `${item.type}|${item.title}|${item.message}`;
    return list.findIndex((candidate) => (candidate.requestId
      ? `${candidate.type}|${candidate.requestId}`
      : `${candidate.type}|${candidate.title}|${candidate.message}`) === key) === index;
  });

  const displayedList = filteredForUser.filter((item) => {
    if (activeFilter === 'UNREAD') return !item.read;
    return true;
  });

  const unreadCount = filteredForUser.filter((n) => !n.read).length;

  const getIconForType = (type: AppNotification['type']) => {
    switch (type) {
      case 'STATUS_APPROVED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'STATUS_MODIFIED':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'STATUS_REJECTED':
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      case 'NEW_DEMAND':
        return <Zap className="w-5 h-5 text-indigo-600" />;
      case 'AI_OPTIMIZATION':
        return <Sparkles className="w-5 h-5 text-purple-600" />;
      case 'CAUTION_ORDER':
        return <ShieldAlert className="w-5 h-5 text-amber-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getDeptBadgeColor = (dept?: string) => {
    switch (dept) {
      case 'ENGINEERING':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'SIGNALLING_TELECOM':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'TRD':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Background click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Right-hand side drawer */}
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 text-slate-800 animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <div className="bg-[#000075] text-white p-4 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                <Bell className="w-5 h-5 text-amber-400" />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-amber-500 text-blue-950 font-bold text-[10px] rounded-full ring-2 ring-[#000075]">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                Notification Center
                <span className="text-[10px] uppercase font-semibold tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/30">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-blue-200">
                {currentUser?.role === 'SECTION_CONTROLLER'
                  ? 'Main Control Division Dispatch & Alerts'
                  : `${currentUser?.department} Department Corridor Alerts`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Close notifications"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium text-[11px]">Control Room Dispatch & Operational Log</span>
          <div className="text-[11px] text-slate-500 font-mono font-medium">
            {unreadCount} unread
          </div>
        </div>

        {/* Filter and Bulk Action Toolbar */}
        <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-md text-xs">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-white text-[#000075] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({filteredForUser.length})
            </button>
            <button
              onClick={() => setActiveFilter('UNREAD')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                activeFilter === 'UNREAD'
                  ? 'bg-white text-[#000075] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="flex items-center space-x-1.5 text-xs">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="flex items-center space-x-1 text-blue-700 hover:text-blue-900 hover:bg-blue-50 px-2 py-1 rounded font-medium transition-colors cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark Read</span>
              </button>
            )}

            {filteredForUser.length > 0 && (
              <button
                onClick={onClearAll}
                className="flex items-center space-x-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded font-medium transition-colors cursor-pointer"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Notification Cards List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100 bg-[#F8FAFC]">
          {displayedList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Bell className="w-6 h-6 stroke-1" />
              </div>
              <p className="text-sm font-medium text-slate-600">No notifications to display</p>
              <p className="text-xs text-slate-400 mt-1">
                {activeFilter === 'UNREAD'
                  ? 'All maintenance alerts have been marked as read.'
                  : 'Real-time corridor updates will appear here automatically.'}
              </p>
            </div>
          ) : (
            displayedList.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (!item.read) onMarkAsRead(item.id);
                  onSelectNotification(item);
                }}
                className={`p-3 rounded-lg border transition-all cursor-pointer relative group ${
                  item.read
                    ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    : 'bg-blue-50/50 border-blue-200 hover:border-blue-400 shadow-xs'
                }`}
              >
                {!item.read && (
                  <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-100" />
                )}

                <div className="flex items-start space-x-3">
                  <div className="mt-0.5 p-1.5 rounded-md bg-white border border-slate-200 shadow-2xs shrink-0">
                    {getIconForType(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 mb-1">
                      {item.department && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getDeptBadgeColor(
                            item.department
                          )}`}
                        >
                          {item.department === 'ENGINEERING'
                            ? 'ENG'
                            : item.department === 'SIGNALLING_TELECOM'
                            ? 'S&T'
                            : item.department === 'TRD'
                            ? 'TRD'
                            : item.department}
                        </span>
                      )}

                      {item.requestId && (
                        <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.requestId}
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400 ml-auto">
                        {item.timestamp}
                      </span>
                    </div>

                    <h4
                      className={`text-xs font-bold leading-snug ${
                        item.read ? 'text-slate-800' : 'text-blue-950 font-extrabold'
                      }`}
                    >
                      {item.title}
                    </h4>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {item.message}
                    </p>

                    {item.requestId && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-[#000075] font-semibold flex items-center gap-1 group-hover:underline">
                          <span>Inspect & Open Request</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>

                        <span className="text-slate-400 text-[10px]">
                          Click to jump
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer with status notice */}
        <div className="p-3 bg-white border-t border-slate-200 text-center text-[11px] text-slate-500">
          <span>Connected to Indian Railways Real-Time Event Dispatcher</span>
        </div>
      </div>
    </div>
  );
};
