import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Radio,
  ShieldCheck,
  Table,
  Layers,
  Clock,
  Cpu,
  ExternalLink,
  Server
} from 'lucide-react';
import { SupabaseSyncState } from '../types';
import { SUPABASE_URL } from '../lib/supabase';

interface SupabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncState: SupabaseSyncState;
  onForceResync: () => Promise<void>;
  totalRequestsCount: number;
}

export const SupabaseStatusModal: React.FC<SupabaseStatusModalProps> = ({
  isOpen,
  onClose,
  syncState,
  onForceResync,
  totalRequestsCount,
}) => {
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncSuccess, setResyncSuccess] = useState(false);

  if (!isOpen) return null;

  const handleResync = async () => {
    setIsResyncing(true);
    setResyncSuccess(false);
    try {
      await onForceResync();
      setResyncSuccess(true);
      setTimeout(() => setResyncSuccess(false), 3000);
    } finally {
      setIsResyncing(false);
    }
  };

  const isLive = syncState.status === 'CONNECTED' || syncState.status === 'SYNCED';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-[#000075] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center space-x-2">
                <span>Supabase 3-Table Real-Time Engine</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black">
                  Production RLS
                </span>
              </h3>
              <p className="text-xs text-blue-200">
                PostgreSQL Replication & Multi-Window Data Ingestion
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Live Status Banner */}
          <div
            className={`rounded-lg p-4 border flex items-start justify-between ${
              isLive
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="mt-0.5">
                {isLive ? (
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                  </span>
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div>
                <div className="font-bold text-sm flex items-center space-x-2">
                  <span>
                    {isLive
                      ? 'Supabase Real-Time Replication: Active & Connected'
                      : 'Offline Resilient Mode: Local Fallback Cache Active'}
                  </span>
                </div>
                <p className="text-xs mt-1 text-slate-600 leading-relaxed">
                  {isLive
                    ? 'Listening to live Postgres changes on tables public.block_requests and public.ai_schedules. Changes submitted anywhere sync across all open browsers instantly.'
                    : syncState.errorMessage ||
                      'Operating in zero-latency offline cache mode. State is securely backed by local storage and will sync to Supabase when network resumes.'}
                </p>
                {syncState.lastSyncedAt && (
                  <div className="text-[11px] text-slate-500 mt-2 font-mono flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Last heartbeat / sync: {syncState.lastSyncedAt}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleResync}
              disabled={isResyncing}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-white hover:bg-slate-50 border border-slate-300 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResyncing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span>{isResyncing ? 'Re-syncing...' : 'Force Sync'}</span>
            </button>
          </div>

          {resyncSuccess && (
            <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 px-3 py-2 rounded text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Supabase records re-queried and synchronized successfully!</span>
            </div>
          )}

          {/* Database Endpoint Information */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs">
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span className="flex items-center space-x-1.5">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                <span>Cloud PostgreSQL Endpoint:</span>
              </span>
              <span className="font-mono text-slate-700 truncate max-w-[280px]">
                {SUPABASE_URL}
              </span>
            </div>
          </div>

          {/* 3-Table Architecture Status */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
              <Table className="w-3.5 h-3.5 text-[#000075]" />
              <span>Managed 3-Table Schema & RLS Policy Enforcement</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Table 1: profiles */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-mono text-blue-900">profiles</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                    4 Roles
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Dynamic officer personas (ENG, S&T, TRD, Controller) loaded on landing portal.
                </p>
                <div className="mt-2 text-[10px] text-emerald-700 font-semibold flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>RLS: Public Read</span>
                </div>
              </div>

              {/* Table 2: block_requests */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-mono text-emerald-900">block_requests</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                    {totalRequestsCount} Live Records
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Direct insert on form submit; instant update on Controller approval/rejection.
                </p>
                <div className="mt-2 text-[10px] text-emerald-700 font-semibold flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>RLS: Dept Isolated</span>
                </div>
              </div>

              {/* Table 3: ai_schedules */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-mono text-purple-900">ai_schedules</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                    Audit Log
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  CP-SAT solver execution history, hours saved, and bundled blocks JSON.
                </p>
                <div className="mt-2 text-[10px] text-emerald-700 font-semibold flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>RLS: Admin Write</span>
                </div>
              </div>
            </div>
          </div>

          {/* Realtime Subscription Channels */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 mb-2">
              <Radio className="w-4 h-4 text-emerald-600" />
              <span>Active WebSocket Channel: public-db-changes</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
              <div className="flex items-center space-x-2 bg-white p-2 rounded border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>public.block_requests (* all events)</span>
              </div>
              <div className="flex items-center space-x-2 bg-white p-2 rounded border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>public.ai_schedules (INSERT events)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Ministry of Railways • RAKSHA-BLOCK Production Architecture
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#000075] hover:bg-blue-900 text-white rounded text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
