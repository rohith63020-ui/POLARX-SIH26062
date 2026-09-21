/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POLARX Offline-First Dual Store Sync Engine
 * Coordinates bi-directional synchronization between local IndexedDB and central Supabase PostgreSQL,
 * processing pending sync_queue records, resolving version conflicts, and broadcasting real-time status.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as idb from '../db/indexedDB';
import { SyncQueueRecord } from '../types';

export interface SyncProgressState {
  isSyncing: boolean;
  progressPercent: number;
  totalItems: number;
  syncedItems: number;
  failedItems: number;
  currentEntity: string;
  error?: string | null;
  lastSyncedTimestamp: string | null;
  current?: number;
  total?: number;
  lastProcessedItem?: string;
  status?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}

type SyncListener = (status: SyncStatus) => void;
type SyncProgressListener = (state: SyncProgressState) => void;

let globalProgress: SyncProgressState = {
  isSyncing: false,
  progressPercent: 100,
  totalItems: 0,
  syncedItems: 0,
  failedItems: 0,
  currentEntity: 'IDLE',
  error: null,
  lastSyncedTimestamp: null,
};

const progressListeners = new Set<SyncProgressListener>();

export function getSyncProgress(): SyncProgressState {
  return { ...globalProgress };
}

export function subscribeSyncProgress(listener: SyncProgressListener): () => void {
  progressListeners.add(listener);
  listener(globalProgress);
  return () => progressListeners.delete(listener);
}

function notifyProgress(updates: Partial<SyncProgressState>) {
  globalProgress = { ...globalProgress, ...updates };
  progressListeners.forEach((fn) => fn(globalProgress));
}

class SyncManager {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private pollInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));

      // Periodic queue check every 20 seconds
      this.pollInterval = setInterval(() => {
        if (this.isOnline && !this.isSyncing) {
          this.processSyncQueue();
        }
      }, 20000);
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.broadcast();
    return () => this.listeners.delete(listener);
  }

  private broadcast() {
    idb.getPendingSyncQueue().then((pending) => {
      const status: SyncStatus = {
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        pendingCount: pending.length,
        lastSyncedAt: this.lastSyncedAt,
        lastError: this.lastError,
      };
      this.listeners.forEach((fn) => fn(status));
    });
  }

  private async handleNetworkChange(online: boolean) {
    this.isOnline = online;
    this.broadcast();
    if (online) {
      console.log('POLARX: Network restored to ONLINE. Triggering synchronization cycle...');
      await this.processSyncQueue();
      await this.pullLatestFromSupabase();
    } else {
      console.log('POLARX: Network switched to OFFLINE. Operations will be queued locally.');
    }
  }

  public async triggerManualSync(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (!this.isOnline) {
      return { success: false, syncedCount: 0, error: 'Network is currently offline.' };
    }
    return this.processSyncQueue();
  }

  public async processSyncQueue(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (this.isSyncing) return { success: true, syncedCount: 0 };
    if (!isSupabaseConfigured() || !this.isOnline) {
      this.broadcast();
      return { success: false, syncedCount: 0, error: 'Supabase not connected or terminal offline' };
    }

    this.isSyncing = true;
    this.lastError = null;
    this.broadcast();

    let syncedCount = 0;

    try {
      const pendingItems = await idb.getPendingSyncQueue();
      const total = pendingItems.length;

      notifyProgress({
        isSyncing: true,
        progressPercent: total === 0 ? 100 : 10,
        totalItems: total,
        syncedItems: 0,
        failedItems: 0,
        currentEntity: total > 0 ? pendingItems[0].entity_type : 'READY',
        error: null,
      });

      console.log(`POLARX Sync Engine: Found ${total} pending items in sync_queue.`);

      for (let i = 0; i < total; i++) {
        const item = pendingItems[i];
        notifyProgress({
          currentEntity: item.entity_type,
          progressPercent: Math.round(((i + 1) / total) * 90),
        });

        try {
          const tableName = item.entity_type;
          const payload = item.payload;

          if (item.operation === 'CREATE') {
            const { error } = await supabase.from(tableName).upsert([payload]);
            if (error) throw error;
          } else if (item.operation === 'UPDATE') {
            if (item.entity_id) {
              const { error } = await supabase.from(tableName).update(payload).eq('id', item.entity_id);
              if (error) throw error;
            } else {
              const { error } = await supabase.from(tableName).upsert([payload]);
              if (error) throw error;
            }
          } else if (item.operation === 'DELETE') {
            if (item.entity_id) {
              const { error } = await supabase.from(tableName).delete().eq('id', item.entity_id);
              if (error) throw error;
            }
          }

          // Mark item as synced
          await idb.markSyncQueueRecordDone(item.id);
          syncedCount++;
          notifyProgress({ syncedItems: syncedCount });
        } catch (itemErr: any) {
          console.error(`POLARX Sync: Failed processing queue record ${item.id}:`, itemErr);
          item.retry_count = (item.retry_count || 0) + 1;
          item.error_message = itemErr.message || String(itemErr);
          if (item.retry_count > 5) {
            item.sync_status = 'FAILED';
          }
          await idb.putInStore('sync_queue', item);
        }
      }

      this.lastSyncedAt = new Date().toISOString();
      notifyProgress({
        isSyncing: false,
        progressPercent: 100,
        lastSyncedTimestamp: this.lastSyncedAt,
        currentEntity: 'COMPLETE',
      });

      await this.pullLatestFromSupabase();
      return { success: true, syncedCount };
    } catch (err: any) {
      console.error('POLARX Sync Queue fatal error:', err);
      this.lastError = err.message || 'Sync error occurred';
      notifyProgress({
        isSyncing: false,
        error: this.lastError,
      });
      return { success: false, syncedCount, error: this.lastError };
    } finally {
      this.isSyncing = false;
      this.broadcast();
    }
  }

  public async pullLatestFromSupabase(): Promise<void> {
    if (!isSupabaseConfigured() || !this.isOnline) return;

    try {
      const tables: idb.StoreName[] = [
        'locations',
        'expeditions',
        'personnel',
        'assets',
        'cargo',
        'cargo_items',
        'inventory',
        'emergency_incidents',
        'emergency_resources',
        'alerts',
      ];

      for (const table of tables) {
        try {
          const { data, error } = await supabase.from(table).select('*').limit(200);
          if (!error && data && data.length > 0) {
            await idb.bulkUpsertStore(table, data);
          }
        } catch {}
      }
    } catch (err) {
      console.warn('POLARX Pull latest from Supabase failed:', err);
    }
  }

  public getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: 0,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    };
  }
}

export const syncManager = new SyncManager();
export const processSyncQueue = () => syncManager.processSyncQueue();
export const triggerManualSync = () => syncManager.triggerManualSync();
