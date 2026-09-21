/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POLARX Asset Management & QR/RFID Service
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as idb from '../db/indexedDB';
import { Asset, AssetMovement, SyncQueueRecord } from '../types';
import { logActivity } from './activityLogService';

export async function fetchAssets(): Promise<Asset[]> {
  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      const { data, error } = await supabase.from('assets').select('*');
      if (!error && data) {
        await idb.bulkUpsertStore('assets', data);
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetchAssets error, using IDB:', err);
    }
  }
  return idb.getAllFromStore<Asset>('assets');
}

export async function findAssetByCodeOrQrOrRfid(code: string): Promise<Asset | null> {
  if (!code) return null;
  const localMatch = await idb.findAssetByQrOrRfidOrCode(code);
  if (localMatch) return localMatch;

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      const { data } = await supabase
        .from('assets')
        .select('*')
        .or(`asset_code.eq.${code},qr_code.eq.${code},rfid_code.eq.${code},id.eq.${code}`)
        .maybeSingle();

      if (data) {
        await idb.putInStore('assets', data);
        return data;
      }
    } catch {}
  }
  return null;
}

export async function createAsset(assetData: Partial<Asset>): Promise<Asset> {
  const assetId = assetData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ast-${Date.now()}`);
  const assetCode = assetData.asset_code || `AST-${Date.now().toString().slice(-4)}`;
  const qrCode = assetData.qr_code || `QR-POLARX-${assetCode}`;
  const rfidCode = assetData.rfid_code || `RFID-868-${assetCode}`;

  const newAsset: Asset = {
    id: assetId,
    name: assetData.name || assetData.asset_name || 'Polar Asset Unit',
    asset_code: assetCode,
    qr_code: qrCode,
    rfid_code: rfidCode,
    asset_name: assetData.asset_name || assetData.name || 'Polar Asset Unit',
    category: assetData.category || 'Surface Heavy Equipment',
    description: assetData.description || 'Standard polar expedition asset item.',
    serial_number: assetData.serial_number || `SN-${Date.now().toString(36).toUpperCase()}`,
    condition: assetData.condition || 'OPTIMAL',
    status: assetData.status || 'OPERATIONAL',
    current_location_id: assetData.current_location_id || null,
    expedition_id: assetData.expedition_id || null,
    purchase_date: assetData.purchase_date || new Date().toISOString().split('T')[0],
    last_maintenance_date: assetData.last_maintenance_date || new Date().toISOString().split('T')[0],
    next_maintenance_date: assetData.next_maintenance_date || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  };

  await idb.putInStore('assets', newAsset);
  await logActivity('REGISTER_ASSET', 'assets', newAsset.id, null, newAsset);

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      await supabase.from('assets').insert([newAsset]);
    } catch (err) {
      const syncItem: SyncQueueRecord = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}`,
        device_id: 'WEB_TERMINAL',
        operation: 'CREATE',
        entity_type: 'assets',
        entity_id: newAsset.id,
        payload: newAsset,
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
      entity_type: 'assets',
      entity_id: newAsset.id,
      payload: newAsset,
      created_at: new Date().toISOString(),
      sync_status: 'PENDING',
      retry_count: 0,
    };
    await idb.addSyncQueueRecord(syncItem);
  }

  return newAsset;
}

export async function updateAsset(
  id: string,
  updates: Partial<Asset>,
  movementReason?: string
): Promise<Asset | null> {
  const existing = await idb.getFromStore<Asset>('assets', id);
  if (!existing) return null;

  const updated: Asset = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
    version: (existing.version || 1) + 1,
  };

  await idb.putInStore('assets', updated);

  // If location changed, record asset_movements
  if (updates.current_location_id && updates.current_location_id !== existing.current_location_id) {
    const movement: AssetMovement = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `amov-${Date.now()}`,
      asset_id: id,
      from_location_id: existing.current_location_id || null,
      to_location_id: updates.current_location_id,
      movement_type: (movementReason as any) || 'DISPATCH',
      timestamp: new Date().toISOString(),
    };
    await idb.putInStore('asset_movements', movement);
  }

  await logActivity('UPDATE_ASSET', 'assets', id, existing, updated);

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      await supabase.from('assets').update(updated).eq('id', id);
    } catch (err) {
      const syncItem: SyncQueueRecord = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}`,
        device_id: 'WEB_TERMINAL',
        operation: 'UPDATE',
        entity_type: 'assets',
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
      entity_type: 'assets',
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
