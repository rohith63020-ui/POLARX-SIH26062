/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POLARX Cargo & Shipment Consignment Service
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as idb from '../db/indexedDB';
import { Cargo, CargoItem, SyncQueueRecord } from '../types';
import { logActivity } from './activityLogService';

export async function fetchCargo(): Promise<Cargo[]> {
  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      const { data, error } = await supabase.from('cargo').select('*').order('departure_date', { ascending: false });
      if (!error && data) {
        await idb.bulkUpsertStore('cargo', data);
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetchCargo error, using IDB:', err);
    }
  }
  return idb.getAllFromStore<Cargo>('cargo');
}

export async function updateCargoStatus(id: string, status: string): Promise<Cargo | null> {
  const existing = await idb.getFromStore<Cargo>('cargo', id);
  if (!existing) return null;

  const updated: Cargo = {
    ...existing,
    status,
    actual_arrival: status === 'DELIVERED' || status === 'UNLOADED' ? new Date().toISOString() : existing.actual_arrival,
    updated_at: new Date().toISOString(),
    version: (existing.version || 1) + 1,
  };

  await idb.putInStore('cargo', updated);
  await logActivity('UPDATE_CARGO_STATUS', 'cargo', id, existing, updated);

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      await supabase.from('cargo').update(updated).eq('id', id);
    } catch (err) {
      const syncItem: SyncQueueRecord = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}`,
        device_id: 'WEB_TERMINAL',
        operation: 'UPDATE',
        entity_type: 'cargo',
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
      entity_type: 'cargo',
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
