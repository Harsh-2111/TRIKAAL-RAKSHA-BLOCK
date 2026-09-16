import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type RealtimeTable = 'defects' | 'maintenance_schedules' | 'escalation_logs';
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | 'BROADCAST';
export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR' | 'CLOSED';

export interface SectionUpdateEvent {
  table: RealtimeTable | 'section_updates';
  eventType: RealtimeEventType;
  sectionId: string;
  record: Record<string, unknown>;
  oldRecord?: Record<string, unknown>;
  receivedAt: string;
}

export interface RealtimeStatusEvent {
  status: ConnectionStatus;
  sectionId: string;
  message?: string;
  attempt: number;
}

export type SectionUpdateCallback = (event: SectionUpdateEvent) => void;
export type StatusCallback = (event: RealtimeStatusEvent) => void;
export type UnsubscribeFunction = () => void;

const channels = new Map<string, RealtimeChannel>();
const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
const reconnectAttempts = new Map<string, number>();
const statusListeners = new Map<string, Set<StatusCallback>>();

const logStatus = (event: RealtimeStatusEvent): void => {
  const level = event.status === 'ERROR' ? 'error' : event.status === 'RECONNECTING' ? 'warn' : 'info';
  console[level](`[Realtime:${event.sectionId}] ${event.status}${event.message ? ` - ${event.message}` : ''}`);
  statusListeners.get(event.sectionId)?.forEach((listener) => listener(event));
};

const sectionFilter = (sectionId: string): string => `section=eq.${encodeURIComponent(sectionId)}`;

function createChannel(sectionId: string, callback: SectionUpdateCallback): RealtimeChannel {
  const channel = supabase.channel(`section-updates:${sectionId}`);
  const tables: RealtimeTable[] = ['defects', 'maintenance_schedules', 'escalation_logs'];

  tables.forEach((table) => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: sectionFilter(sectionId) }, (payload) => {
      const eventType = payload.eventType as RealtimeEventType;
      callback({
        table,
        eventType,
        sectionId,
        record: (payload.new || payload.old || {}) as Record<string, unknown>,
        oldRecord: payload.old as Record<string, unknown> | undefined,
        receivedAt: new Date().toISOString(),
      });
    });
  });

  channel.on('broadcast', { event: 'section_update' }, ({ payload }) => {
    callback({
      table: 'section_updates',
      eventType: 'BROADCAST',
      sectionId,
      record: (payload || {}) as Record<string, unknown>,
      receivedAt: new Date().toISOString(),
    });
  });
  return channel;
}

function scheduleReconnect(sectionId: string, callback: SectionUpdateCallback, statusCallback?: StatusCallback): void {
  if (reconnectTimers.has(sectionId)) return;
  const attempt = (reconnectAttempts.get(sectionId) || 0) + 1;
  reconnectAttempts.set(sectionId, attempt);
  const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempt - 1, 5));
  const status = { status: 'RECONNECTING' as const, sectionId, message: `retrying in ${delay}ms`, attempt };
  logStatus(status);
  statusCallback?.(status);
  reconnectTimers.set(sectionId, setTimeout(() => {
    reconnectTimers.delete(sectionId);
    const previous = channels.get(sectionId);
    if (previous) void supabase.removeChannel(previous);
    connect(sectionId, callback, statusCallback);
  }, delay));
}

function connect(sectionId: string, callback: SectionUpdateCallback, statusCallback?: StatusCallback): void {
  const channel = createChannel(sectionId, callback);
  channels.set(sectionId, channel);
  const attempt = reconnectAttempts.get(sectionId) || 0;
  const connecting = { status: attempt ? 'RECONNECTING' as const : 'CONNECTING' as const, sectionId, attempt };
  logStatus(connecting);
  statusCallback?.(connecting);
  channel.subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      reconnectAttempts.set(sectionId, 0);
      const connected = { status: 'CONNECTED' as const, sectionId, attempt: 0 };
      logStatus(connected);
      statusCallback?.(connected);
      return;
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      const failed = { status: status === 'CLOSED' ? 'CLOSED' as const : 'ERROR' as const, sectionId, message: error?.message || status, attempt };
      logStatus(failed);
      statusCallback?.(failed);
      scheduleReconnect(sectionId, callback, statusCallback);
    }
  });
}

export function subscribeToSectionUpdates(
  sectionId: string,
  callback: SectionUpdateCallback,
  statusCallback?: StatusCallback
): UnsubscribeFunction {
  const normalizedSection = sectionId.trim();
  if (!normalizedSection) throw new Error('sectionId is required for realtime synchronization.');
  if (channels.has(normalizedSection)) unsubscribeFromSection(normalizedSection);
  connect(normalizedSection, callback, statusCallback);

  return () => unsubscribeFromSection(normalizedSection);
}

export function unsubscribeFromSection(sectionId: string): void {
  const timer = reconnectTimers.get(sectionId);
  if (timer) clearTimeout(timer);
  reconnectTimers.delete(sectionId);
  reconnectAttempts.delete(sectionId);
  const channel = channels.get(sectionId);
  channels.delete(sectionId);
  statusListeners.delete(sectionId);
  if (channel) void supabase.removeChannel(channel);
}

export function onRealtimeStatus(sectionId: string, callback: StatusCallback): UnsubscribeFunction {
  const listeners = statusListeners.get(sectionId) || new Set<StatusCallback>();
  listeners.add(callback);
  statusListeners.set(sectionId, listeners);
  return () => listeners.delete(callback);
}

export async function broadcastSectionUpdate(
  sectionId: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const channel = channels.get(sectionId);
  if (!channel) {
    console.warn(`[Realtime:${sectionId}] Cannot broadcast without an active subscription.`);
    return false;
  }
  const result = await channel.send({ type: 'broadcast', event: 'section_update', payload: { ...payload, sectionId } });
  if (result !== 'ok') {
    console.warn(`[Realtime:${sectionId}] Broadcast failed with status ${result}.`);
    return false;
  }
  return true;
}

export async function broadcastScheduleChange(
  sectionId: string,
  action: 'APPROVED' | 'RESCHEDULED',
  schedule: Record<string, unknown>
): Promise<boolean> {
  return broadcastSectionUpdate(sectionId, { action, schedule, emittedAt: new Date().toISOString() });
}
