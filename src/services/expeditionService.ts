/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POLARX Expedition Management Service
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as idb from '../db/indexedDB';
import { Expedition, SyncQueueRecord } from '../types';
import { logActivity } from './activityLogService';

export async function fetchExpeditions(): Promise<Expedition[]> {
  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('expeditions')
        .select('*')
        .order('start_date', { ascending: false });

      if (!error && data) {
        await idb.bulkUpsertStore('expeditions', data);
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetchExpeditions error, using IndexedDB:', err);
    }
  }
  return idb.getAllFromStore<Expedition>('expeditions');
}

export async function createExpedition(expedition: Expedition): Promise<Expedition> {
  const item: Expedition = {
    ...expedition,
    id: expedition.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exp-${Date.now()}`),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  };

  await idb.putInStore('expeditions', item);
  await logActivity('CREATE_EXPEDITION', 'expeditions', item.id, null, item);

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      await supabase.from('expeditions').insert([item]);
    } catch (err) {
      console.warn('Queued expedition create for sync:', err);
      const syncItem: SyncQueueRecord = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}`,
        device_id: 'WEB_TERMINAL',
        operation: 'CREATE',
        entity_type: 'expeditions',
        entity_id: item.id,
        payload: item,
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
      operation: 'CREATE',
      entity_type: 'expeditions',
      entity_id: item.id,
      payload: item,
      created_at: new Date().toISOString(),
      sync_status: 'PENDING',
      retry_count: 0,
    };
    await idb.addSyncQueueRecord(syncItem);
  }

  return item;
}

export async function updateExpedition(id: string, updates: Partial<Expedition>): Promise<Expedition | null> {
  const existing = await idb.getFromStore<Expedition>('expeditions', id);
  if (!existing) return null;

  const updated: Expedition = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
    version: (existing.version || 1) + 1,
  };

  await idb.putInStore('expeditions', updated);
  await logActivity('UPDATE_EXPEDITION', 'expeditions', id, existing, updated);

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      await supabase.from('expeditions').update(updated).eq('id', id);
    } catch (err) {
      console.warn('Queued expedition update for sync:', err);
      const syncItem: SyncQueueRecord = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}`,
        device_id: 'WEB_TERMINAL',
        operation: 'UPDATE',
        entity_type: 'expeditions',
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
      entity_type: 'expeditions',
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
