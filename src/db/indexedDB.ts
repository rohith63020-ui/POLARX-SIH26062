/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POLARX Offline-First IndexedDB Core Engine
 * Implements persistent local storage for all 18 Polar Expedition Operational Tables,
 * supporting full offline CRUD, QR/RFID lookup, versioning, seed hydration, and sync queues.
 */

import {
  Profile,
  Location,
  Expedition,
  PersonnelMember,
  Asset,
  Cargo,
  CargoItem,
  ConsumableItem,
  InventoryTransaction,
  AssetMovement,
  PersonnelMovement,
  MaintenanceRecord,
  EmergencyIncident,
  EmergencyResource,
  AlertItem,
  AiInsight,
  SyncQueueRecord,
  ActivityLog,
  ResupplyRequest,
  OfflineRecord,
  CargoAsset,
  SarIncident,
  SitrepEvent,
  PendingSyncItem,
} from '../types';
import {
  INITIAL_EXPEDITIONS,
  INITIAL_CARGO_ASSETS,
  INITIAL_CONSUMABLES,
  INITIAL_PERSONNEL,
  INITIAL_ALERTS,
  INITIAL_SAR_INCIDENTS,
  INITIAL_SITREP_EVENTS,
  INITIAL_OFFLINE_QUEUE,
  INITIAL_AI_INSIGHTS,
} from '../data/initialData';

const DB_NAME = 'polarx_local_db';
const DB_VERSION = 2;

export type StoreName =
  | 'profiles'
  | 'locations'
  | 'expeditions'
  | 'personnel'
  | 'assets'
  | 'cargo'
  | 'cargo_items'
  | 'inventory'
  | 'inventory_transactions'
  | 'asset_movements'
  | 'personnel_movements'
  | 'maintenance_records'
  | 'emergency_incidents'
  | 'emergency_resources'
  | 'alerts'
  | 'ai_insights'
  | 'sync_queue'
  | 'activity_logs'
  | 'resupplyRequests'
  | 'offlineQueue';

// Memory cache fallback for restricted environments
const memoryFallback: Record<string, Record<string, any>> = {};

function getMemoryStore(store: string): Record<string, any> {
  if (!memoryFallback[store]) {
    try {
      const saved = localStorage.getItem(`polarx_store_${store}`);
      if (saved) {
        memoryFallback[store] = JSON.parse(saved);
      } else {
        memoryFallback[store] = {};
      }
    } catch {
      memoryFallback[store] = {};
    }
  }
  return memoryFallback[store];
}

function persistMemoryStore(store: string) {
  try {
    localStorage.setItem(
      `polarx_store_${store}`,
      JSON.stringify(memoryFallback[store] || {})
    );
  } catch {}
}

let dbInstance: IDBDatabase | null = null;
let dbOpeningPromise: Promise<IDBDatabase> | null = null;

export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (dbOpeningPromise) return dbOpeningPromise;

  dbOpeningPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in current environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const stores: StoreName[] = [
        'profiles',
        'locations',
        'expeditions',
        'personnel',
        'assets',
        'cargo',
        'cargo_items',
        'inventory',
        'inventory_transactions',
        'asset_movements',
        'personnel_movements',
        'maintenance_records',
        'emergency_incidents',
        'emergency_resources',
        'alerts',
        'ai_insights',
        'sync_queue',
        'activity_logs',
        'resupplyRequests',
        'offlineQueue',
      ];

      stores.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          if (storeName === 'assets') {
            store.createIndex('qr_code', 'qr_code', { unique: false });
            store.createIndex('asset_code', 'asset_code', { unique: false });
            store.createIndex('rfid_code', 'rfid_code', { unique: false });
          }
          if (storeName === 'sync_queue') {
            store.createIndex('sync_status', 'sync_status', { unique: false });
            store.createIndex('created_at', 'created_at', { unique: false });
          }
        }
      });
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.warn('IndexedDB failed to open, using memory/localStorage fallback', event);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbOpeningPromise;
}

// Generic Store Operations
export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve((request.result as T[]) || []);
      request.onerror = () => {
        const mem = getMemoryStore(storeName);
        resolve(Object.values(mem) as T[]);
      };
    });
  } catch {
    const mem = getMemoryStore(storeName);
    return Object.values(mem) as T[];
  }
}

export async function getFromStore<T>(storeName: StoreName, id: string): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve((request.result as T) || null);
      request.onerror = () => {
        const mem = getMemoryStore(storeName);
        resolve((mem[id] as T) || null);
      };
    });
  } catch {
    const mem = getMemoryStore(storeName);
    return (mem[id] as T) || null;
  }
}

export async function putInStore<T extends { id: string }>(storeName: StoreName, item: T): Promise<void> {
  const itemWithTimestamp = {
    ...item,
    updated_at: (item as any).updated_at || new Date().toISOString(),
    version: ((item as any).version || 0) + 1,
  };

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(itemWithTimestamp);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const mem = getMemoryStore(storeName);
        mem[item.id] = itemWithTimestamp;
        persistMemoryStore(storeName);
        resolve();
      };
    });
  } catch {
    const mem = getMemoryStore(storeName);
    mem[item.id] = itemWithTimestamp;
    persistMemoryStore(storeName);
  }
}

export async function deleteFromStore(storeName: StoreName, id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const mem = getMemoryStore(storeName);
        delete mem[id];
        persistMemoryStore(storeName);
        resolve();
      };
    });
  } catch {
    const mem = getMemoryStore(storeName);
    delete mem[id];
    persistMemoryStore(storeName);
  }
}

export async function bulkUpsertStore<T extends { id: string }>(
  storeName: StoreName,
  items: T[]
): Promise<void> {
  if (!items || items.length === 0) return;
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      items.forEach((item) => store.put(item));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        const mem = getMemoryStore(storeName);
        items.forEach((item) => {
          mem[item.id] = item;
        });
        persistMemoryStore(storeName);
        resolve();
      };
    });
  } catch {
    const mem = getMemoryStore(storeName);
    items.forEach((item) => {
      mem[item.id] = item;
    });
    persistMemoryStore(storeName);
  }
}

// Specialized QR & RFID Lookup
export async function findAssetByQrOrRfidOrCode(code: string): Promise<Asset | null> {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  const allAssets = await getAllFromStore<Asset>('assets');
  
  const found = allAssets.find((a) => {
    const qrMatch = a.qr_code && a.qr_code.trim().toUpperCase() === normalized;
    const rfidMatch = a.rfid_code && a.rfid_code.trim().toUpperCase() === normalized;
    const codeMatch = a.asset_code && a.asset_code.trim().toUpperCase() === normalized;
    const idMatch = a.id && a.id.toUpperCase() === normalized;
    const legacyQr = (a as any).qrPayload && (a as any).qrPayload.toUpperCase().includes(normalized);
    return qrMatch || rfidMatch || codeMatch || idMatch || legacyQr;
  });

  return found || null;
}

// Sync Queue helpers
export async function getPendingSyncQueue(): Promise<SyncQueueRecord[]> {
  const all = await getAllFromStore<SyncQueueRecord>('sync_queue');
  return all.filter((item) => item.sync_status === 'PENDING');
}

export async function addSyncQueueRecord(record: SyncQueueRecord): Promise<void> {
  await putInStore('sync_queue', record);
}

export async function markSyncQueueRecordDone(id: string): Promise<void> {
  const record = await getFromStore<SyncQueueRecord>('sync_queue', id);
  if (record) {
    record.sync_status = 'SYNCED';
    record.synced_at = new Date().toISOString();
    await putInStore('sync_queue', record);
  }
}

// Initialize Local Database with Seed Data if empty
export async function initLocalDatabase(): Promise<void> {
  try {
    await getDB();
    const existingExp = await getAllFromStore<Expedition>('expeditions');
    if (existingExp.length === 0) {
      console.log('POLARX: Hydrating local IndexedDB with initial seed records...');
      await bulkUpsertStore('expeditions', INITIAL_EXPEDITIONS);
      await bulkUpsertStore('assets', INITIAL_CARGO_ASSETS.map((a) => ({
        ...a,
        asset_code: a.id,
        qr_code: `QR-POLARX-${a.id}`,
        rfid_code: `RFID-868-${a.id}`,
        asset_name: a.name,
        category: a.category || 'Surface Heavy Equipment',
        condition: 'OPTIMAL',
        status: a.status || 'OPERATIONAL',
        version: 1,
      })));
      await bulkUpsertStore('cargo', INITIAL_CARGO_ASSETS.map((c) => ({
        id: c.id,
        cargo_code: c.id,
        carrier: c.carrier || 'R/V Bharati Star',
        origin: c.originPort || 'Cape Town Port',
        destination: c.destStation || 'Bharati Station',
        departure_date: c.departureDate || '2026-09-01',
        expected_arrival: c.eta || '2026-09-28',
        transport_mode: 'POLAR_RESEARCH_VESSEL',
        status: c.status || 'IN_TRANSIT',
        weight: c.weightKg || 4200,
        priority: 'HIGH',
        version: 1,
      })));
      await bulkUpsertStore('inventory', INITIAL_CONSUMABLES);
      await bulkUpsertStore('personnel', INITIAL_PERSONNEL);
      await bulkUpsertStore('alerts', INITIAL_ALERTS);
      await bulkUpsertStore('emergency_incidents', INITIAL_SAR_INCIDENTS.map((sar) => ({
        id: sar.id,
        incident_code: sar.id,
        incident_type: 'CREVASSE_FALL',
        severity: (sar.severity as any) || 'CRITICAL',
        title: sar.title,
        description: sar.situation || sar.description || 'Emergency incident recorded.',
        status: sar.status || 'ACTIVE',
        reported_at: sar.reportedTime || new Date().toISOString(),
        version: 1,
      })));
      await bulkUpsertStore('activity_logs', INITIAL_SITREP_EVENTS.map((sit) => ({
        id: sit.id,
        action: sit.badge,
        entity_type: sit.category || 'EXPEDITION',
        entity_id: sit.expeditionId || null,
        timestamp: sit.timestamp,
        new_data: { description: sit.description, title: sit.title },
      })));
      await bulkUpsertStore('offlineQueue', INITIAL_OFFLINE_QUEUE);
      await bulkUpsertStore('ai_insights', INITIAL_AI_INSIGHTS);
    }
  } catch (err) {
    console.warn('initLocalDatabase fallback hydration:', err);
  }
}

// Direct Collection Accessors for DataContext
export const getExpeditions = () => getAllFromStore<Expedition>('expeditions');
export const saveExpedition = (exp: Expedition) => putInStore('expeditions', exp);
export const saveExpeditions = (exps: Expedition[]) => bulkUpsertStore('expeditions', exps);
export const addExpedition = (exp: Expedition) => putInStore('expeditions', exp);
export const updateExpedition = async (idOrExp: string | Expedition, updates?: Partial<Expedition>) => {
  if (typeof idOrExp === 'string') {
    const existing = await getFromStore<Expedition>('expeditions', idOrExp);
    if (existing) return putInStore('expeditions', { ...existing, ...(updates || {}), id: idOrExp });
  } else {
    return putInStore('expeditions', idOrExp);
  }
};

export const getAssets = () => getAllFromStore<CargoAsset>('assets');
export const saveAsset = (asset: CargoAsset) => putInStore('assets', asset);
export const saveAssets = (assets: CargoAsset[]) => bulkUpsertStore('assets', assets);
export const addAsset = (asset: CargoAsset) => putInStore('assets', asset);
export const updateAsset = async (idOrAsset: string | CargoAsset, updates?: Partial<CargoAsset>) => {
  if (typeof idOrAsset === 'string') {
    const existing = await getFromStore<CargoAsset>('assets', idOrAsset);
    if (existing) return putInStore('assets', { ...existing, ...(updates || {}), id: idOrAsset });
  } else {
    return putInStore('assets', idOrAsset);
  }
};

export const getCargo = () => getAllFromStore<CargoAsset>('cargo');
export const saveCargo = (cargo: CargoAsset) => putInStore('cargo', cargo);
export const saveCargoList = (cargo: CargoAsset[]) => bulkUpsertStore('cargo', cargo);
export const addCargo = (cargo: CargoAsset) => putInStore('cargo', cargo);
export const updateCargo = async (idOrCargo: string | CargoAsset, updates?: Partial<CargoAsset>) => {
  if (typeof idOrCargo === 'string') {
    const existing = await getFromStore<CargoAsset>('cargo', idOrCargo);
    if (existing) return putInStore('cargo', { ...existing, ...(updates || {}), id: idOrCargo });
  } else {
    return putInStore('cargo', idOrCargo);
  }
};

export const getInventory = () => getAllFromStore<ConsumableItem>('inventory');
export const saveInventoryItem = (item: ConsumableItem) => putInStore('inventory', item);
export const saveInventory = (items: ConsumableItem[]) => bulkUpsertStore('inventory', items);
export const addInventory = (item: ConsumableItem) => putInStore('inventory', item);
export const updateInventory = async (idOrItem: string | ConsumableItem, updates?: Partial<ConsumableItem>) => {
  if (typeof idOrItem === 'string') {
    const existing = await getFromStore<ConsumableItem>('inventory', idOrItem);
    if (existing) return putInStore('inventory', { ...existing, ...(updates || {}), id: idOrItem });
  } else {
    return putInStore('inventory', idOrItem);
  }
};

export const getPersonnel = () => getAllFromStore<PersonnelMember>('personnel');
export const savePersonnelMember = (person: PersonnelMember) => putInStore('personnel', person);
export const savePersonnel = (personnel: PersonnelMember[]) => bulkUpsertStore('personnel', personnel);
export const addPersonnel = (person: PersonnelMember) => putInStore('personnel', person);
export const updatePersonnel = async (idOrPerson: string | PersonnelMember, updates?: Partial<PersonnelMember>) => {
  if (typeof idOrPerson === 'string') {
    const existing = await getFromStore<PersonnelMember>('personnel', idOrPerson);
    if (existing) return putInStore('personnel', { ...existing, ...(updates || {}), id: idOrPerson });
  } else {
    return putInStore('personnel', idOrPerson);
  }
};

export const getAlerts = () => getAllFromStore<AlertItem>('alerts');
export const saveAlert = (alert: AlertItem) => putInStore('alerts', alert);
export const saveAlerts = (alerts: AlertItem[]) => bulkUpsertStore('alerts', alerts);
export const addAlert = (alert: AlertItem) => putInStore('alerts', alert);

export const getEmergencyIncidents = () => getAllFromStore<SarIncident>('emergency_incidents');
export const saveEmergencyIncident = (incident: SarIncident) => putInStore('emergency_incidents', incident as any);
export const saveEmergencyIncidents = (incidents: SarIncident[]) => bulkUpsertStore('emergency_incidents', incidents as any);
export const createEmergencyIncident = (incident: SarIncident) => putInStore('emergency_incidents', incident as any);
export const updateEmergencyIncident = async (idOrInc: string | SarIncident, updates?: Partial<SarIncident>) => {
  if (typeof idOrInc === 'string') {
    const existing = await getFromStore<SarIncident>('emergency_incidents', idOrInc);
    if (existing) return putInStore('emergency_incidents', { ...existing, ...(updates || {}), id: idOrInc });
  } else {
    return putInStore('emergency_incidents', idOrInc);
  }
};

export const getActivityLogs = () => getAllFromStore<SitrepEvent>('activity_logs');
export const saveActivityLog = (log: SitrepEvent) => putInStore('activity_logs', log);
export const saveActivityLogs = (logs: SitrepEvent[]) => bulkUpsertStore('activity_logs', logs);
export const addActivityLog = (log: SitrepEvent) => putInStore('activity_logs', log);

export const getResupplyRequests = () => getAllFromStore<ResupplyRequest>('resupplyRequests');
export const saveResupplyRequest = (req: ResupplyRequest) => putInStore('resupplyRequests', req);
export const addResupplyRequest = (req: ResupplyRequest) => putInStore('resupplyRequests', req);

export const getPendingSync = () => getAllFromStore<PendingSyncItem>('sync_queue');
export const addPendingSync = (item: PendingSyncItem) => putInStore('sync_queue', item as any);

export const getOfflineQueue = () => getAllFromStore<OfflineRecord>('offlineQueue');
export const saveOfflineQueue = (queue: OfflineRecord[]) => bulkUpsertStore('offlineQueue', queue);
export const addOfflineRecord = (rec: OfflineRecord) => putInStore('offlineQueue', rec);
