/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POLARX Alert Management Service
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as idb from '../db/indexedDB';
import { AlertItem, SyncQueueRecord } from '../types';
import { logActivity } from './activityLogService';

export async function fetchAlerts(): Promise<AlertItem[]> {
  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      const { data, error } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        await idb.bulkUpsertStore('alerts', data);
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetchAlerts error, using IDB:', err);
    }
  }
  return idb.getAllFromStore<AlertItem>('alerts');
}

export async function acknowledgeAlert(id: string, acknowledgedBy?: string): Promise<AlertItem | null> {
  const existing = await idb.getFromStore<AlertItem>('alerts', id);
  if (!existing) return null;

  const updated: AlertItem = {
    ...existing,
    status: 'ACKNOWLEDGED',
    acknowledged_at: new Date().toISOString(),
    acknowledged_by: acknowledgedBy || null,
  };

  await idb.putInStore('alerts', updated);
  await logActivity('ACKNOWLEDGE_ALERT', 'alerts', id, existing, updated);

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      await supabase.from('alerts').update(updated).eq('id', id);
    } catch (err) {
      const syncItem: SyncQueueRecord = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}`,
        device_id: 'WEB_TERMINAL',
        operation: 'UPDATE',
        entity_type: 'alerts',
        entity_id: id,
        payload: updated,
        created_at: new Date().toISOString(),
        sync_status: 'PENDING',
        retry_count: 0,
      };
      await idb.addSyncQueueRecord(syncItem);
    }
  } else {
    const syncItem: SyncQueueRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}`,
      device_id: 'WEB_TERMINAL',
      operation: 'UPDATE',
      entity_type: 'alerts',
      entity_id: id,
      payload: updated,
      created_at: new Date().toISOString(),
      sync_status: 'PENDING',
      retry_count: 0,
    };
    await idb.addSyncQueueRecord(syncItem);
  }

  return updated;
}
