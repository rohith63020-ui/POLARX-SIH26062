/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './config';
import {
  Expedition,
  CargoAsset,
  ConsumableItem,
  PersonnelMember,
  AlertItem,
  EmergencyResource,
  ResupplyRequest,
  SarIncident,
  SitrepEvent,
  MissionReport,
  StockLog,
  AppNotification,
} from '../types';
import {
  INITIAL_EXPEDITIONS,
  INITIAL_ASSETS,
  INITIAL_CONSUMABLES,
  INITIAL_SAR_INCIDENT,
  INITIAL_SITREP_EVENTS,
} from '../data/initialData';

// Helper to ensure createdBy, createdAt, updatedAt exist on every document
const withTimestampsAndUser = <T extends Record<string, any>>(
  data: T,
  userId?: string,
  isUpdate = false
): T & { createdBy: string; createdAt: string; updatedAt: string } => {
  const currentUid = userId || auth.currentUser?.uid || 'user-polarx-system';
  const now = new Date().toISOString();

  if (isUpdate) {
    return {
      ...data,
      updatedAt: now,
    } as any;
  }

  return {
    ...data,
    createdBy: data.createdBy || currentUid,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
};

// Safe snapshot error handler: Logs connectivity/offline state gracefully without crashing the application
const handleSnapshotError = (err: any, path: string, onError?: (err: Error) => void) => {
  if (onError) {
    onError(err);
    return;
  }
  const isUnavailable =
    err?.code === 'unavailable' ||
    err?.message?.includes('offline') ||
    err?.message?.includes('Could not reach Cloud Firestore backend');

  if (isUnavailable) {
    console.warn(`[POLARX Offline Cache] '${path}' subscription: Backend temporarily unavailable, operating in offline mode.`);
    return;
  }

  handleFirestoreError(err, OperationType.LIST, path);
};

/* =========================================================================
 * 1. EXPEDITIONS COLLECTION (expeditions)
 * ========================================================================= */
export const subscribeExpeditions = (
  callback: (expeditions: Expedition[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!auth.currentUser) {
    return () => {};
  }
  const colRef = collection(db, 'expeditions');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Expedition[];
      callback(list);
    },
    (err) => handleSnapshotError(err, 'expeditions', onError)
  );
};

export const getExpeditions = async (): Promise<Expedition[]> => {
  const colRef = collection(db, 'expeditions');
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Expedition[];
};

export const createExpedition = async (
  expedition: Partial<Expedition> & { id: string; name: string },
  userId?: string
): Promise<void> => {
  const docRef = doc(db, 'expeditions', expedition.id);
  const data = withTimestampsAndUser(expedition, userId);
  await setDoc(docRef, data);
};

export const updateExpedition = async (
  id: string,
  updates: Partial<Expedition>
): Promise<void> => {
  const docRef = doc(db, 'expeditions', id);
  await updateDoc(docRef, withTimestampsAndUser(updates, undefined, true));
};

export const deleteExpedition = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'expeditions', id));
};

/* =========================================================================
 * 2. ASSETS COLLECTION (assets)
 * ========================================================================= */
export const subscribeAssets = (
  callback: (assets: CargoAsset[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!auth.currentUser) {
    return () => {};
  }
  const colRef = collection(db, 'assets');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as CargoAsset[];
      callback(list);
    },
    (err) => handleSnapshotError(err, 'assets', onError)
  );
};

export const getAssets = async (): Promise<CargoAsset[]> => {
  const snap = await getDocs(collection(db, 'assets'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CargoAsset[];
};

export const fetchAssetByIdFromFirestore = async (
  assetIdOrCode: string
): Promise<CargoAsset | null> => {
  if (!assetIdOrCode) return null;
  const cleanedCode = assetIdOrCode.trim();

  try {
    // 1. Direct document lookup in 'assets' collection
    const assetRef = doc(db, 'assets', cleanedCode);
    const assetSnap = await getDoc(assetRef);
    if (assetSnap.exists()) {
      return { id: assetSnap.id, ...assetSnap.data() } as CargoAsset;
    }

    // 2. Direct document lookup in 'cargo' collection
    const cargoRef = doc(db, 'cargo', cleanedCode);
    const cargoSnap = await getDoc(cargoRef);
    if (cargoSnap.exists()) {
      return { id: cargoSnap.id, ...cargoSnap.data() } as CargoAsset;
    }

    // 3. Query 'assets' collection by qrPayload or serialNumber
    const assetsCol = collection(db, 'assets');
    const qQr = query(assetsCol, where('qrPayload', '==', cleanedCode));
    const snapQr = await getDocs(qQr);
    if (!snapQr.empty) {
      const d = snapQr.docs[0];
      return { id: d.id, ...d.data() } as CargoAsset;
    }

    const qSerial = query(assetsCol, where('serialNumber', '==', cleanedCode));
    const snapSerial = await getDocs(qSerial);
    if (!snapSerial.empty) {
      const d = snapSerial.docs[0];
      return { id: d.id, ...d.data() } as CargoAsset;
    }

    return null;
  } catch (err) {
    console.warn('[POLARX Firebase] Firestore asset fetch warning:', err);
    return null;
  }
};

export const createAsset = async (
  asset: Partial<CargoAsset> & { id: string; name: string },
  userId?: string
): Promise<void> => {
  const docRef = doc(db, 'assets', asset.id);
  const data = withTimestampsAndUser(asset, userId);
  await setDoc(docRef, data);
};

export const updateAsset = async (
  id: string,
  updates: Partial<CargoAsset>
): Promise<void> => {
  const docRef = doc(db, 'assets', id);
  await updateDoc(docRef, withTimestampsAndUser(updates, undefined, true));
};

/* =========================================================================
 * 3. CARGO COLLECTION (cargo)
 * ========================================================================= */
export const subscribeCargo = (
  callback: (cargo: CargoAsset[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!auth.currentUser) {
    return () => {};
  }
  const colRef = collection(db, 'cargo');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as CargoAsset[];
      callback(list);
    },
    (err) => handleSnapshotError(err, 'cargo', onError)
  );
};

export const getCargo = async (): Promise<CargoAsset[]> => {
  const snap = await getDocs(collection(db, 'cargo'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CargoAsset[];
};

export const createCargo = async (
  cargoItem: Partial<CargoAsset> & { id: string; name: string },
  userId?: string
): Promise<void> => {
  const docRef = doc(db, 'cargo', cargoItem.id);
  const data = withTimestampsAndUser(cargoItem, userId);
  await setDoc(docRef, data);
};

export const updateCargo = async (
  id: string,
  updates: Partial<CargoAsset>
): Promise<void> => {
  const docRef = doc(db, 'cargo', id);
  await updateDoc(docRef, withTimestampsAndUser(updates, undefined, true));
};

/* =========================================================================
 * 4. INVENTORY COLLECTION (inventory)
 * ========================================================================= */
export const subscribeInventory = (
  callback: (inventory: ConsumableItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!auth.currentUser) {
    return () => {};
  }
  const colRef = collection(db, 'inventory');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ConsumableItem[];
      callback(list);
    },
    (err) => handleSnapshotError(err, 'inventory', onError)
  );
};

export const getInventory = async (): Promise<ConsumableItem[]> => {
  const snap = await getDocs(collection(db, 'inventory'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ConsumableItem[];
};

export const createInventoryItem = async (
  item: Partial<ConsumableItem> & { id: string; name: string },
  userId?: string
): Promise<void> => {
  const docRef = doc(db, 'inventory', item.id);
  const data = withTimestampsAndUser(item, userId);
  await setDoc(docRef, data);
};

export const updateInventoryItem = async (
  id: string,
  updates: Partial<ConsumableItem>
): Promise<void> => {
  const docRef = doc(db, 'inventory', id);
  await updateDoc(docRef, withTimestampsAndUser(updates, undefined, true));
};

export const recordStockTransaction = async (
  itemId: string,
  type: 'ADD' | 'CONSUME',
  amount: number,
  reason?: string,
  userId?: string
): Promise<ConsumableItem> => {
  const docRef = doc(db, 'inventory', itemId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error(`Inventory item ${itemId} not found`);
  }
  const current = snap.data() as ConsumableItem;
  const currentAvailable = current.available ?? current.currentStock ?? 0;
  const newAvailable = type === 'ADD' ? currentAvailable + amount : Math.max(0, currentAvailable - amount);

  const minThreshold = current.minimumThreshold ?? current.minBuffer ?? current.threshold ?? 50;
  let newStatus: ConsumableItem['status'] = 'NORMAL';
  if (newAvailable <= minThreshold) {
    newStatus = 'CRITICAL';
  } else if (newAvailable <= minThreshold * 1.5) {
    newStatus = 'LOW';
  } else if (newAvailable >= minThreshold * 3) {
    newStatus = 'OPTIMAL';
  }

  const burnRate = current.burnRate && current.burnRate > 0 ? current.burnRate : 1;
  const daysRemaining = Math.max(1, Math.round(newAvailable / burnRate));

  const newLog: StockLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    amount,
    remaining: newAvailable,
    reason: reason || (type === 'ADD' ? 'Restocked from depot' : 'Station routine consumption'),
    timestamp: new Date().toISOString(),
    user: userId || 'Polar Logistics Officer',
  };

  const existingHistory = current.consumptionHistory || [];
  const updatedHistory = [newLog, ...existingHistory].slice(0, 50);

  const updates: Partial<ConsumableItem> = {
    available: newAvailable,
    currentStock: newAvailable,
    daysRemaining,
    status: newStatus,
    consumptionHistory: updatedHistory,
  };

  await updateDoc(docRef, withTimestampsAndUser(updates, userId, true));

  if (newStatus === 'CRITICAL') {
    try {
      await createAlert({
        id: `alert-inv-${itemId}-${Date.now()}`,
        inventoryId: itemId,
        title: `CRITICAL INVENTORY: ${current.name}`,
        description: `Stock dropped to ${newAvailable} ${current.unit || 'units'} (Threshold: ${minThreshold}). Immediate resupply mandatory.`,
        severity: 'CRITICAL',
        status: 'ACTIVE',
      }, userId);
    } catch (e) {
      console.warn('Failed to auto-generate alert for critical inventory:', e);
    }
  }

  return { ...current, ...updates };
};

export const updateInventoryThreshold = async (
  itemId: string,
  minThreshold: number,
  userId?: string
): Promise<void> => {
  const docRef = doc(db, 'inventory', itemId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error(`Inventory item ${itemId} not found`);
  }
  const current = snap.data() as ConsumableItem;
  const currentAvailable = current.available ?? current.currentStock ?? 0;

  let newStatus: ConsumableItem['status'] = 'NORMAL';
  if (currentAvailable <= minThreshold) {
    newStatus = 'CRITICAL';
  } else if (currentAvailable <= minThreshold * 1.5) {
    newStatus = 'LOW';
  } else if (currentAvailable >= minThreshold * 3) {
    newStatus = 'OPTIMAL';
  }

  const updates: Partial<ConsumableItem> = {
    minBuffer: minThreshold,
    minimumThreshold: minThreshold,
    threshold: minThreshold,
    status: newStatus,
  };

  await updateDoc(docRef, withTimestampsAndUser(updates, userId, true));
};

/* =========================================================================
 * 5. PERSONNEL COLLECTION (personnel)
 * ========================================================================= */
export const subscribePersonnel = (
  callback: (personnel: PersonnelMember[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!auth.currentUser) {
    return () => {};
  }
  const colRef = collection(db, 'personnel');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as PersonnelMember[];
      callback(list);
    },
    (err) => handleSnapshotError(err, 'personnel', onError)
  );
};

export const getPersonnel = async (): Promise<PersonnelMember[]> => {
  const snap = await getDocs(collection(db, 'personnel'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PersonnelMember[];
};

export const createPersonnel = async (
  person: Partial<PersonnelMember> & { id: string; name: string },
  userId?: string
): Promise<void> => {
  const docRef = doc(db, 'personnel', person.id);
  const data = withTimestampsAndUser(person, userId);
  await setDoc(docRef, data);
};

export const updatePersonnel = async (
  id: string,
  updates: Partial<PersonnelMember>
): Promise<void> => {
  const docRef = doc(db, 'personnel', id);
  await updateDoc(docRef, withTimestampsAndUser(updates, undefined, true));
};

/* =========================================================================
 * 6. ALERTS COLLECTION (alerts)
 * ========================================================================= */
export const subscribeAlerts = (
  callback: (alerts: AlertItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!auth.currentUser) {
    return () => {};
  }
  const colRef = collection(db, 'alerts');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AlertItem[];
      callback(list);
    },
    (err) => handleSnapshotError(err, 'alerts', onError)
  );
};

export const getAlerts = async (): Promise<AlertItem[]> => {
  const snap = await getDocs(collection(db, 'alerts'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AlertItem[];
};

export const createAlert = async (
  alertItem: Partial<AlertItem> & { id: string; title: string },
  userId?: string
): Promise<void> => {
  const docRef = doc(db, 'alerts', alertItem.id);
  const data = withTimestampsAndUser(alertItem, userId);
  await setDoc(docRef, data);
};

export const updateAlert = async (
  id: string,
  updates: Partial<AlertItem>
): Promise<void> => {
  const docRef = doc(db, 'alerts', id);
  await updateDoc(docRef, withTimestampsAndUser(updates, undefined, true));
};

/* =========================================================================
 * 7. EMERGENCIES COLLECTION (emergencies)
 * ========================================================================= */
export const subscribeEmergencies = (
  callback: (emergencies: SarIncident[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!auth.currentUser) {
    return () => {};
  }
  const colRef = collection(db, 'emergencies');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as SarIncident[];
      callback(list);
    },
    (err) => handleSnapshotError(err, 'emergencies', onError)
  );
};

export const getEmergencies = async (): Promise<SarIncident[]> => {
  const snap = await getDocs(collection(db, 'emergencies'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SarIncident[];
};

export const createEmergency = async (
  incident: Partial<SarIncident> & { id: string; title: string },
  userId?: string
): Promise<void> => {
  const docRef = doc(db, 'emergencies', incident.id);
  const data = withTimestampsAndUser(incident, userId);
  await setDoc(docRef, data);

  // Automatically propagate to alerts collection so emergencies reflect in alerts
  try {
    const alertId = 'ALERT-' + incident.id;
    const alertDoc = doc(db, 'alerts', alertId);
    await setDoc(
      alertDoc,
      withTimestampsAndUser(
        {
          id: alertId,
          emergencyId: incident.id,
          expeditionId: incident.expeditionId || 'INPEX-2026',
          title: `EMERGENCY INCIDENT: ${incident.title}`,
          description: incident.situation || incident.location || 'Critical SAR incident reported',
          severity: 'CRITICAL',
          status: 'ACTIVE',
          type: 'INCIDENT',
          stationId: incident.expeditionId || 'bharati',
          timestamp: incident.reportedTime || new Date().toISOString().substring(11, 16) + ' UTC',
        },
        userId
      )
    );
  } catch (err) {
    console.warn('Failed to auto-propagate emergency to alerts:', err);
  }
};

export const updateEmergency = async (
  id: string,
  updates: Partial<SarIncident>
): Promise<void> => {
  const docRef = doc(db, 'emergencies', id);
  await updateDoc(docRef, withTimestampsAndUser(updates, undefined, true));

  if (updates.status) {
    try {
      const alertId = 'ALERT-' + id;
      const alertDoc = doc(db, 'alerts', alertId);
      await updateDoc(alertDoc, {
        status: updates.status === 'RESOLVED' ? 'RESOLVED' : 'ACTIVE',
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      // Alert might not exist
    }
  }
};

export const resolveEmergency = async (
  id: string,
  resolutionNotes?: string,
  userId?: string
): Promise<void> => {
  await updateEmergency(id, {
    status: 'RESOLVED',
  });

  const logId = 'SIT-RES-' + Date.now();
  await createActivityLog({
    id: logId,
    title: `Emergency Incident ${id} Resolved`,
    badge: 'RESOLVED',
    badgeType: 'ops',
    category: 'INCIDENT_RESOLVED',
    details: resolutionNotes || 'All personnel secured and medical stabilization achieved. Normal ops restored.',
    description: resolutionNotes || 'All personnel secured and medical stabilization achieved. Normal ops restored.',
    emergencyId: id,
    actor: userId || 'Incident Commander',
    timestamp: new Date().toISOString().substring(11, 16) + ' UTC',
    time: new Date().toISOString().substring(11, 16) + ' UTC',
  });
};

/* =========================================================================
 * 8. EMERGENCY RESOURCES COLLECTION (emergencyResources)
 * ========================================================================= */
export const subscribeEmergencyResources = (
  callback: (resources: EmergencyResource[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!auth.currentUser) {
    return () => {};
  }
  const colRef = collection(db, 'emergencyResources');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as EmergencyResource[];
      callback(list);
    },
    (err) => handleSnapshotError(err, 'emergencyResources', onError)
  );
};

export const getEmergencyResources = async (): Promise<EmergencyResource[]> => {
  const snap = await getDocs(collection(db, 'emergencyResources'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as EmergencyResource[];
};

export const createEmergencyResource = async (
  resource: Partial<EmergencyResource> & { id: string; name: string; emergencyId: string },
  userId?: string
): Promise<void> => {
  const docRef = doc(db, 'emergencyResources', resource.id);
  const data = withTimestampsAndUser(resource, userId);
  await setDoc(docRef, data);
};

export const updateEmergencyResource = async (
  id: string,
  updates: Partial<EmergencyResource>
): Promise<void> => {
  const docRef = doc(db, 'emergencyResources', id);
  await updateDoc(docRef, withTimestampsAndUser(updates, undefined, true));
};

export const deleteEmergencyResource = async (id: string): Promise<void> => {
  const docRef = doc(db, 'emergencyResources', id);
  await deleteDoc(docRef);
};

/* =========================================================================
 * 9. RESUPPLY REQUESTS COLLECTION (resupplyRequests)
 * ========================================================================= */
export const subscribeResupplyRequests = (
  callback: (requests: ResupplyRequest[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!auth.currentUser) {
    return () => {};
  }
  const colRef = collection(db, 'resupplyRequests');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ResupplyRequest[];
      callback(list);
    },
    (err) => handleSnapshotError(err, 'resupplyRequests', onError)
  );
};

export const getResupplyRequests = async (): Promise<ResupplyRequest[]> => {
  const snap = await getDocs(collection(db, 'resupplyRequests'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ResupplyRequest[];
};

export const createResupplyRequest = async (
  req: Partial<ResupplyRequest> & { id: string; itemName: string; requestedQty: number },
  userId?: string
): Promise<void> => {
  const docRef = doc(db, 'resupplyRequests', req.id);
  const data = withTimestampsAndUser(req, userId);
  await setDoc(docRef, data);
};

export const updateResupplyRequest = async (
  id: string,
  updates: Partial<ResupplyRequest>
): Promise<void> => {
  const docRef = doc(db, 'resupplyRequests', id);
  await updateDoc(docRef, withTimestampsAndUser(updates, undefined, true));
};

/* =========================================================================
 * 10. ACTIVITY LOGS COLLECTION (activityLogs)
 * ========================================================================= */
export const subscribeActivityLogs = (
  callback: (logs: SitrepEvent[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!auth.currentUser) {
    return () => {};
  }
  const colRef = collection(db, 'activityLogs');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as SitrepEvent[];
      callback(list);
    },
    (err) => handleSnapshotError(err, 'activityLogs', onError)
  );
};

export const getActivityLogs = async (): Promise<SitrepEvent[]> => {
  const snap = await getDocs(collection(db, 'activityLogs'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SitrepEvent[];
};

export const createActivityLog = async (
  log: Partial<SitrepEvent> & { id: string; description: string },
  userId?: string
): Promise<void> => {
  const docRef = doc(db, 'activityLogs', log.id);
  const data = withTimestampsAndUser(log, userId);
  await setDoc(docRef, data);
};

/* =========================================================================
 * 11. REPORTS COLLECTION (reports)
 * ========================================================================= */
export const subscribeReports = (
  callback: (reports: MissionReport[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!auth.currentUser) {
    return () => {};
  }
  const colRef = collection(db, 'reports');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MissionReport[];
      callback(list);
    },
    (err) => handleSnapshotError(err, 'reports', onError)
  );
};

export const getReports = async (): Promise<MissionReport[]> => {
  const snap = await getDocs(collection(db, 'reports'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MissionReport[];
};

export const createReport = async (
  report: Partial<MissionReport> & { id: string; title: string },
  userId?: string
): Promise<void> => {
  const docRef = doc(db, 'reports', report.id);
  const data = withTimestampsAndUser(report, userId);
  await setDoc(docRef, data);
};

export const deleteReport = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'reports', id));
};

/* =========================================================================
 * 12. NOTIFICATIONS COLLECTION (notifications)
 * ========================================================================= */
export const subscribeNotifications = (
  callback: (notifications: AppNotification[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!auth.currentUser) {
    return () => {};
  }
  const colRef = collection(db, 'notifications');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AppNotification[];
      // Sort newest first
      list.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
        return timeB - timeA;
      });
      callback(list);
    },
    (err) => handleSnapshotError(err, 'notifications', onError)
  );
};

export const getNotifications = async (): Promise<AppNotification[]> => {
  const snap = await getDocs(collection(db, 'notifications'));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AppNotification[];
  list.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
    const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
    return timeB - timeA;
  });
  return list;
};

export const createNotification = async (
  notification: Partial<AppNotification> & { id: string; title: string; message: string },
  userId?: string
): Promise<void> => {
  const docRef = doc(db, 'notifications', notification.id);
  const now = new Date().toISOString();
  const payload: AppNotification = {
    id: notification.id,
    dedupKey: notification.dedupKey || notification.id,
    title: notification.title,
    message: notification.message,
    timestamp: notification.timestamp || new Date().toISOString().substring(11, 16) + ' UTC',
    createdAt: notification.createdAt || now,
    updatedAt: now,
    severity: notification.severity || 'INFO',
    category: notification.category || 'SYSTEM',
    targetTab: notification.targetTab,
    targetId: notification.targetId,
    isRead: notification.isRead ?? false,
    readAt: notification.readAt || null,
    userId: notification.userId,
    role: notification.role,
    stationId: notification.stationId,
    createdBy: notification.createdBy || userId || auth.currentUser?.uid || 'system',
    metadata: notification.metadata || {},
  };
  await setDoc(docRef, payload);
};

export const updateNotification = async (
  id: string,
  updates: Partial<AppNotification>
): Promise<void> => {
  const docRef = doc(db, 'notifications', id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

export const markNotificationAsRead = async (
  id: string,
  userId?: string
): Promise<void> => {
  const docRef = doc(db, 'notifications', id);
  await updateDoc(docRef, {
    isRead: true,
    readAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
};

export const markAllNotificationsAsRead = async (
  notifications: AppNotification[],
  userId?: string
): Promise<void> => {
  const unread = notifications.filter((n) => !n.isRead);
  if (unread.length === 0) return;

  const batch = writeBatch(db);
  const now = new Date().toISOString();
  unread.forEach((n) => {
    const ref = doc(db, 'notifications', n.id);
    batch.update(ref, {
      isRead: true,
      readAt: now,
      updatedAt: now,
    });
  });
  await batch.commit();
};

export const deleteNotification = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'notifications', id));
};

export const clearAllNotifications = async (
  notifications: AppNotification[]
): Promise<void> => {
  if (notifications.length === 0) return;
  const batch = writeBatch(db);
  notifications.forEach((n) => {
    const ref = doc(db, 'notifications', n.id);
    batch.delete(ref);
  });
  await batch.commit();
};


/* =========================================================================
 * SEED INITIAL DATA WITH FULL CONNECTED RELATIONSHIPS
 * Connects:
 * users -> expeditions -> assets / cargo / personnel / inventory
 * emergencies -> personnel -> emergencyResources
 * inventory -> alerts -> AI insights
 * ========================================================================= */
export const seedPolarxDatabaseIfEmpty = async (userId: string): Promise<boolean> => {
  try {
    const expeditionsSnap = await getDocs(collection(db, 'expeditions'));
    if (!expeditionsSnap.empty) {
      // Database already seeded with real records
      return false;
    }

    console.log('Seeding POLARX relational database structure into Firestore...');
    const now = new Date().toISOString();
    const batch = writeBatch(db);

    // 1. Expeditions (Parent)
    INITIAL_EXPEDITIONS.forEach((exp) => {
      const expRef = doc(db, 'expeditions', exp.id);
      batch.set(expRef, {
        ...exp,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // 2. Assets (Linked to expeditionId: 'INPEX-2026')
    INITIAL_ASSETS.forEach((asset) => {
      const assetRef = doc(db, 'assets', asset.id);
      batch.set(assetRef, {
        ...asset,
        expeditionId: 'INPEX-2026',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // 3. Cargo (Linked to expeditionId: 'INPEX-2026' and asset carrier)
    INITIAL_ASSETS.forEach((cargo, index) => {
      const cargoId = `CARGO-${cargo.id}`;
      const cargoRef = doc(db, 'cargo', cargoId);
      batch.set(cargoRef, {
        ...cargo,
        id: cargoId,
        expeditionId: 'INPEX-2026',
        assetId: cargo.id,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // 4. Inventory (Linked to expeditionId: 'INPEX-2026')
    INITIAL_CONSUMABLES.forEach((item) => {
      const invRef = doc(db, 'inventory', item.id);
      batch.set(invRef, {
        ...item,
        expeditionId: 'INPEX-2026',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // 5. Personnel (Linked to expeditionId: 'INPEX-2026' and emergencyId: '#SAR-2026-09')
    const initialPersonnelList: PersonnelMember[] = [
      {
        id: 'PERS-001',
        expeditionId: 'INPEX-2026',
        emergencyId: '#SAR-2026-09',
        name: 'Commander V. K. Nair',
        role: 'Base Commander / Apex Admin',
        station: 'bharati',
        clearance: 'LEVEL-5 FULL COMMAND',
        status: 'ON ACTIVE DUTY',
        medicalFitness: 'OPTIMAL (100%)',
        contact: 'sat-node-01@ncpor.gov.in',
        specialty: 'Polar Strategic Command & Geophysics',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'PERS-042',
        expeditionId: 'INPEX-2026',
        name: 'Rohith Sai',
        role: 'Logistics Manager',
        station: 'bharati',
        clearance: 'LEVEL-4 TOP SECRET',
        status: 'ON ACTIVE DUTY',
        medicalFitness: 'OPTIMAL (100%)',
        contact: 'logistics@polarx.demo',
        specialty: 'Continental Resupply, Sea-Ice Corridors & Fuel Logistics',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'PERS-108',
        expeditionId: 'LARSEM-V',
        name: 'Maj. Arjun Rathore',
        role: 'Expedition Field Officer',
        station: 'maitri',
        clearance: 'LEVEL-3 FIELD TACTICAL',
        status: 'TRAVERSE FIELD',
        medicalFitness: 'GOOD (94%)',
        contact: 'officer@polarx.demo',
        specialty: 'Overland Traverse Convoys, Crevasse Detection & SAR sorties',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'PERS-219',
        expeditionId: 'IND-ARCTIC-08',
        name: 'Dr. Maya Sen',
        role: 'Lead Polar Paleoclimatologist',
        station: 'himadri',
        clearance: 'LEVEL-2 SCIENCE OBSERVER',
        status: 'REST CYCLE',
        medicalFitness: 'OPTIMAL (100%)',
        contact: 'science@polarx.demo',
        specialty: 'Fjord Sediment Coring & Arctic Marine Biology',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    initialPersonnelList.forEach((person) => {
      const persRef = doc(db, 'personnel', person.id);
      batch.set(persRef, person);
    });

    // 6. Emergencies (Linked to expeditionId: 'INPEX-2026')
    const emergencyRef = doc(db, 'emergencies', INITIAL_SAR_INCIDENT.id);
    batch.set(emergencyRef, {
      ...INITIAL_SAR_INCIDENT,
      expeditionId: 'INPEX-2026',
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // 7. Emergency Resources (Linked to emergencies: '#SAR-2026-09', personnel: 'PERS-001', asset: 'POLAR-VEH-088')
    const emergencyResourcesList: EmergencyResource[] = [
      {
        id: 'EM-RES-01',
        emergencyId: '#SAR-2026-09',
        personnelId: 'PERS-001',
        assetId: 'POLAR-VEH-088',
        name: 'PistenBully Snowcat-02 Trauma Rig',
        type: 'TACTICAL_VEHICLE',
        quantity: 1,
        status: 'DISPATCHED',
        location: 'Sector B Access Corridor',
        assignedTeam: 'Medical Unit 02',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'EM-RES-02',
        emergencyId: '#SAR-2026-09',
        personnelId: 'PERS-001',
        name: 'Arctic Trauma Kit #04 & Heated Stretcher',
        type: 'MEDICAL_KIT',
        quantity: 2,
        status: 'ACTIVE_FIELD',
        location: 'Sector B Sub-vault',
        assignedTeam: 'Medical Unit 02',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'EM-RES-03',
        emergencyId: '#SAR-2026-09',
        name: 'Emergency Cryo Blood Plasma Carrier',
        type: 'BIO_SUPPLY',
        quantity: 4,
        status: 'IN_TRANSIT',
        location: 'Bharati Medical Bay Locker A-04',
        assignedTeam: 'Medical Unit 02',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    emergencyResourcesList.forEach((res) => {
      const resRef = doc(db, 'emergencyResources', res.id);
      batch.set(resRef, res);
    });

    // 8. Alerts (Linked to inventory: 'POLAR-MED-409' and expedition: 'INPEX-2026')
    const initialAlerts: AlertItem[] = [
      {
        id: 'ALT-MED-01',
        inventoryId: 'POLAR-MED-409',
        expeditionId: 'INPEX-2026',
        title: 'Trauma Antibiotics Buffer Breach (Day 10 Zero-Day)',
        severity: 'CRITICAL',
        type: 'STOCK_DEFICIT',
        description: 'Available units (180) are below the mandatory minimum safety threshold (250).',
        timestamp: '14:27 UTC',
        status: 'ACTIVE',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ALT-FUEL-02',
        inventoryId: 'POLAR-FUEL-50',
        expeditionId: 'INPEX-2026',
        title: 'Polar Diesel Surge Consumption +18% Gale Rate',
        severity: 'WARNING',
        type: 'BURN_SURGE',
        description: 'Fuel burn rate surged to 280 L/day during ongoing katabatic blizzard.',
        timestamp: '12:15 UTC',
        status: 'ACTIVE',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    initialAlerts.forEach((alt) => {
      const altRef = doc(db, 'alerts', alt.id);
      batch.set(altRef, alt);
    });

    // 9. Resupply Requests (Linked to inventoryId: 'POLAR-MED-409', expeditionId: 'INPEX-2026')
    const initialResupplyRequests: ResupplyRequest[] = [
      {
        id: 'RES-8820',
        inventoryId: 'POLAR-MED-409',
        expeditionId: 'INPEX-2026',
        orderNumber: '#RES-8820',
        itemName: 'Broad-Spec IV Antibiotics',
        requestedQty: 120,
        unit: 'units',
        priority: 'EMERGENCY',
        status: 'IN_TRANSIT',
        destination: 'Bharati Medical Bay',
        eta: '4d 12h',
        vesselOrCarrier: 'S.A. Agulhas II',
        notes: 'Expedited air-lift from Maitri reserve depot if sea ice blocks bay ingress.',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    initialResupplyRequests.forEach((req) => {
      const reqRef = doc(db, 'resupplyRequests', req.id);
      batch.set(reqRef, req);
    });

    // 10. Activity Logs (Linked to expeditionId: 'INPEX-2026' and emergencyId: '#SAR-2026-09')
    INITIAL_SITREP_EVENTS.forEach((evt) => {
      const logRef = doc(db, 'activityLogs', evt.id);
      batch.set(logRef, {
        ...evt,
        expeditionId: 'INPEX-2026',
        emergencyId: '#SAR-2026-09',
        status: 'SYNCHRONIZED',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // 11. Initial Reports
    const initialReports: MissionReport[] = [
      {
        id: 'REP-2026-089',
        type: 'sitrep',
        title: 'Daily Continental Situation Report (SITREP-089)',
        station: 'Bharati Station',
        date: '2026-09-13',
        author: 'Rohith Sai (Logistics Manager)',
        summary: 'Sea-ice fast ice stability confirmed at 2.1m. PistenBully convoys operational with 0 incidents.',
        status: 'VERIFIED',
        classification: 'OFFICIAL',
        dataSnapshot: {
          activeExpeditions: 3,
          totalAssets: 4,
          lowStockItems: 1,
          criticalAlerts: 1,
          activePersonnel: 6,
        },
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'REP-2026-088',
        type: 'cargo',
        title: 'Heavy Asset & Generator Resupply Audit',
        station: 'Bharati Station',
        date: '2026-09-12',
        author: 'Rohith Sai (Logistics Manager)',
        summary: 'Turbine Gen-Set #03 reached 100% operational test bench load. 40,000L Arctic Diesel transferred.',
        status: 'VERIFIED',
        classification: 'OFFICIAL',
        dataSnapshot: {
          activeExpeditions: 3,
          totalAssets: 4,
          lowStockItems: 1,
          criticalAlerts: 1,
        },
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'REP-2026-087',
        type: 'fuel',
        title: 'Maitri Fuel Depletion & Buffer Burn Rate Audit',
        station: 'Maitri Station',
        date: '2026-09-11',
        author: 'Maj. Arjun Rathore (Expedition Officer)',
        summary: 'Schirmacher Oasis secondary tanks holding 142 days of winter reserve at current thermal output.',
        status: 'SUBMITTED',
        classification: 'RESTRICTED',
        dataSnapshot: {
          activeExpeditions: 3,
          totalAssets: 4,
          lowStockItems: 1,
        },
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'REP-2026-086',
        type: 'research',
        title: 'Paleoclimate Ice Core Volatile Chemistry Analysis',
        station: 'Himadri Arctic Station',
        date: '2026-09-10',
        author: 'Dr. Maya Sen (Lead Researcher)',
        summary: 'Kongsvegen Glacier Core Sample #81 indicates 420ppm CO2 spike in historical layer B.',
        status: 'PUBLISHED',
        classification: 'SCIENCE UNRESTRICTED',
        dataSnapshot: {
          activeExpeditions: 3,
          totalAssets: 4,
        },
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    initialReports.forEach((rep) => {
      const repRef = doc(db, 'reports', rep.id);
      batch.set(repRef, rep);
    });

    await batch.commit();
    console.log('Successfully seeded POLARX Firestore relational collections.');
    return true;
  } catch (error) {
    console.error('Failed to seed POLARX Firestore data:', error);
    return false;
  }
};
