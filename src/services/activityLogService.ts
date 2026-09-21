/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POLARX Activity Log Service
 * Provides persistent audit logging across Supabase and local IndexedDB.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as idb from '../db/indexedDB';
import { ActivityLog, SyncQueueRecord } from '../types';

export async function logActivity(
  action: string,
  entityType: string,
  entityId: string | null = null,
  oldData: Record<string, any> | null = null,
  newData: Record<string, any> | null = null,
  deviceId: string = 'WEB_TERMINAL'
): Promise<ActivityLog> {
  const log: ActivityLog = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_data: oldData,
    new_data: newData,
    timestamp: new Date().toISOString(),
    device_id: deviceId,
  };

  // Always persist locally in IndexedDB
  await idb.putInStore('activity_logs', log);

  // If online and Supabase is configured, push directly
  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      await supabase.from('activity_logs').insert([log]);
    } catch (err) {
      console.warn('Supabase activity log sync fallback to queue:', err);
      // Queue for background sync
      const syncItem: SyncQueueRecord = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}`,
        device_id: deviceId,
        operation: 'CREATE',
        entity_type: 'activity_logs',
        entity_id: log.id,
        payload: log,
        created_at: new Date().toISOString(),
        sync_status: 'PENDING',
        retry_count: 0,
      };
      await idb.addSyncQueueRecord(syncItem);
    }
  } else {
    // Record in offline sync queue
    const syncItem: SyncQueueRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}`,
      device_id: deviceId,
      operation: 'CREATE',
      entity_type: 'activity_logs',
      entity_id: log.id,
      payload: log,
      created_at: new Date().toISOString(),
      sync_status: 'PENDING',
      retry_count: 0,
    };
    await idb.addSyncQueueRecord(syncItem);
  }

  return log;
}

export async function getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (!error && data) {
        await idb.bulkUpsertStore('activity_logs', data);
        return data;
      }
    } catch (err) {
      console.warn('Failed fetching logs from Supabase, loading from IndexedDB:', err);
    }
  }

  const localLogs = await idb.getAllFromStore<ActivityLog>('activity_logs');
  return localLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}
