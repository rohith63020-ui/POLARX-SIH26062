/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POLARX Personnel Management Service
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as idb from '../db/indexedDB';
import { PersonnelMember, PersonnelMovement, SyncQueueRecord } from '../types';
import { logActivity } from './activityLogService';

export async function fetchPersonnel(): Promise<PersonnelMember[]> {
  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      const { data, error } = await supabase.from('personnel').select('*');
      if (!error && data) {
        await idb.bulkUpsertStore('personnel', data);
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetchPersonnel error, using IDB:', err);
    }
  }
  return idb.getAllFromStore<PersonnelMember>('personnel');
}

export async function updatePersonnel(
  id: string,
  updates: Partial<PersonnelMember>,
  movementReason?: string
): Promise<PersonnelMember | null> {
  const existing = await idb.getFromStore<PersonnelMember>('personnel', id);
  if (!existing) return null;

  const updated: PersonnelMember = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
    version: (existing.version || 1) + 1,
  };

  await idb.putInStore('personnel', updated);

  // If location changed, record movement
  if (updates.current_location_id && updates.current_location_id !== existing.current_location_id) {
    const movement: PersonnelMovement = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pmov-${Date.now()}`,
      personnel_id: id,
      from_location_id: existing.current_location_id || null,
      to_location_id: updates.current_location_id,
      movement_type: (movementReason as any) || 'STATION_TRANSFER',
      timestamp: new Date().toISOString(),
    };
    await idb.putInStore('personnel_movements', movement);
  }

  await logActivity('UPDATE_PERSONNEL', 'personnel', id, existing, updated);

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      await supabase.from('personnel').update(updated).eq('id', id);
    } catch (err) {
      const syncItem: SyncQueueRecord = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}`,
        device_id: 'WEB_TERMINAL',
        operation: 'UPDATE',
        entity_type: 'personnel',
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
      entity_type: 'personnel',
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
