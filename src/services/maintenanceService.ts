/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POLARX Maintenance Service
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as idb from '../db/indexedDB';
import { MaintenanceRecord, SyncQueueRecord } from '../types';
import { logActivity } from './activityLogService';

export async function fetchMaintenanceRecords(): Promise<MaintenanceRecord[]> {
  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      const { data, error } = await supabase.from('maintenance_records').select('*').order('maintenance_date', { ascending: false });
      if (!error && data) {
        await idb.bulkUpsertStore('maintenance_records', data);
        return data;
      }
    } catch (err) {
      console.warn('Supabase maintenance records error, using IDB:', err);
    }
  }
  return idb.getAllFromStore<MaintenanceRecord>('maintenance_records');
}

export async function logMaintenance(record: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
  const item: MaintenanceRecord = {
    id: record.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `maint-${Date.now()}`),
    asset_id: record.asset_id || '',
    maintenance_type: record.maintenance_type || 'SCHEDULED_PM',
    description: record.description || 'Routine preventive maintenance.',
    maintenance_date: record.maintenance_date || new Date().toISOString().split('T')[0],
    next_due_date: record.next_due_date || null,
    cost: record.cost || 0,
    status: record.status || 'COMPLETED',
    created_at: new Date().toISOString(),
  };

  await idb.putInStore('maintenance_records', item);
  await logActivity('LOG_MAINTENANCE', 'maintenance_records', item.id, null, item);

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      await supabase.from('maintenance_records').insert([item]);
    } catch (err) {
      const syncItem: SyncQueueRecord = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}`,
        device_id: 'WEB_TERMINAL',
        operation: 'CREATE',
        entity_type: 'maintenance_records',
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
      entity_type: 'maintenance_records',
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
