/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POLARX Inventory & Stock Control Service
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as idb from '../db/indexedDB';
import { ConsumableItem, InventoryTransaction, AlertItem, SyncQueueRecord } from '../types';
import { logActivity } from './activityLogService';

export async function fetchInventory(): Promise<ConsumableItem[]> {
  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      const { data, error } = await supabase.from('inventory').select('*');
      if (!error && data) {
        await idb.bulkUpsertStore('inventory', data);
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetchInventory error, using IDB:', err);
    }
  }
  return idb.getAllFromStore<ConsumableItem>('inventory');
}

export async function processStockTransaction(
  inventoryId: string,
  type: 'ADD' | 'CONSUME' | 'ADJUST' | 'RESUPPLY_RESTOCK' | 'WASTE',
  amount: number,
  reason: string = 'Operational Consumption',
  performedBy: string = 'Polar Operator'
): Promise<{ item: ConsumableItem; transaction: InventoryTransaction } | null> {
  const existing = await idb.getFromStore<ConsumableItem>('inventory', inventoryId);
  if (!existing) return null;

  const prevQty = Number(existing.quantity ?? existing.available ?? 0);
  let newQty = prevQty;

  if (type === 'CONSUME' || type === 'WASTE') {
    newQty = Math.max(0, prevQty - amount);
  } else if (type === 'ADD' || type === 'RESUPPLY_RESTOCK') {
    newQty = prevQty + amount;
  } else if (type === 'ADJUST') {
    newQty = amount;
  }

  const updatedItem: ConsumableItem = {
    ...existing,
    quantity: newQty,
    available: newQty,
    currentStock: newQty,
    last_updated: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: (existing.version || 1) + 1,
  };

  const burnRate = Number(existing.consumption_rate || existing.burnRate || 1.0);
  const daysRem = burnRate > 0 ? Math.round(newQty / burnRate) : 999;
  const minThreshold = Number(existing.minimum_quantity || existing.minBuffer || 10);

  updatedItem.daysRemaining = daysRem;
  if (newQty <= 0) {
    updatedItem.status = 'CRITICAL';
  } else if (newQty <= minThreshold) {
    updatedItem.status = 'LOW';
  } else if (newQty > minThreshold * 2) {
    updatedItem.status = 'OPTIMAL';
  } else {
    updatedItem.status = 'NORMAL';
  }

  await idb.putInStore('inventory', updatedItem);

  // Record Transaction
  const transaction: InventoryTransaction = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `itxn-${Date.now()}`,
    inventory_id: inventoryId,
    transaction_type: type,
    quantity: amount,
    previous_quantity: prevQty,
    new_quantity: newQty,
    reason,
    created_at: new Date().toISOString(),
  };

  await idb.putInStore('inventory_transactions', transaction);
  await logActivity(`INVENTORY_${type}`, 'inventory', inventoryId, existing, updatedItem);

  // If low stock, create/update alert
  if (newQty <= minThreshold) {
    const alertId = `alert-low-${inventoryId}`;
    const alertItem: AlertItem = {
      id: alertId,
      alert_type: 'LOW_STOCK_DEPLETION',
      severity: newQty === 0 ? 'CRITICAL' : 'WARNING',
      title: `Low Stock: ${existing.item_name || existing.name}`,
      message: `Stock level dropped to ${newQty} ${existing.unit} (Threshold: ${minThreshold}). Estimated days remaining: ${daysRem}d.`,
      entity_type: 'inventory',
      entity_id: inventoryId,
      expedition_id: existing.expedition_id,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    await idb.putInStore('alerts', alertItem);
  }

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      await supabase.from('inventory').update(updatedItem).eq('id', inventoryId);
      await supabase.from('inventory_transactions').insert([transaction]);
    } catch (err) {
      console.warn('Supabase inventory sync failed, queued:', err);
      const syncItem: SyncQueueRecord = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}`,
        device_id: 'WEB_TERMINAL',
        operation: 'UPDATE',
        entity_type: 'inventory',
        entity_id: inventoryId,
        payload: updatedItem,
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
      entity_type: 'inventory',
      entity_id: inventoryId,
      payload: updatedItem,
      created_at: new Date().toISOString(),
      sync_status: 'PENDING',
      retry_count: 0,
    };
    await idb.addSyncQueueRecord(syncItem);
  }

  return { item: updatedItem, transaction };
}
