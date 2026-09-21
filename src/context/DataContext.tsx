/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POLARX Central Data Context & Offline First Store
 * Single source of truth across all operational dashboards, telemetry matrices,
 * inventory calculations, AI projections, and SAR emergency coordination.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  Expedition,
  CargoAsset,
  ConsumableItem,
  PersonnelMember,
  AlertItem,
  SarIncident,
  SitrepEvent,
  PendingSyncItem,
  ResupplyRequest,
  OfflineRecord,
  AiInsight,
} from '../types';
import * as db from '../db/indexedDB';
import {
  processSyncQueue,
  subscribeSyncProgress,
  SyncProgressState,
  getSyncProgress,
} from '../services/syncService';
import {
  subscribeExpeditions,
  subscribeAssets,
  subscribeCargo,
  subscribeInventory,
  subscribePersonnel,
  subscribeAlerts,
  subscribeEmergencies,
  subscribeActivityLogs,
} from '../firebase/dbService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { INITIAL_AI_INSIGHTS } from '../data/initialData';

interface DataContextType {
  // Connection & Sync States
  isOnline: boolean;
  isSimulatedOffline: boolean;
  connectionState: 'ONLINE' | 'OFFLINE' | 'SYNCING';
  pendingSyncCount: number;
  offlineQueue: OfflineRecord[];
  syncProgress: SyncProgressState;
  toggleSimulatedOffline: () => void;
  restoreConnectionAndSync: () => Promise<void>;
  triggerManualSync: () => Promise<void>;

  // Data Collections (Single Source of Truth)
  expeditions: Expedition[];
  assets: CargoAsset[];
  cargo: CargoAsset[];
  inventory: ConsumableItem[];
  personnel: PersonnelMember[];
  alerts: AlertItem[];
  emergencyIncidents: SarIncident[];
  emergencyResources: any[];
  activityLogs: SitrepEvent[];
  resupplyRequests: ResupplyRequest[];
  aiInsights: AiInsight[];
  isLoading: boolean;
  isInitialized: boolean;

  // Operational Actions (Work Offline & Sync Online)
  recordStockTransaction: (
    itemId: string,
    type: 'ADD' | 'CONSUME',
    amount: number,
    reason?: string
  ) => Promise<void>;
  consumeFuel: (amount: number, reason?: string) => Promise<ConsumableItem | null>;
  updateInventoryThreshold: (itemId: string, threshold: number) => Promise<void>;
  updateInventoryItem: (itemId: string, updates: Partial<ConsumableItem>) => Promise<void>;
  createOrUpdateAsset: (asset: CargoAsset) => Promise<void>;
  createAsset: (asset: CargoAsset) => Promise<void>;
  updateAsset: (assetId: string, updates: Partial<CargoAsset>) => Promise<void>;
  createCargo: (cargo: CargoAsset) => Promise<void>;
  updateCargo: (cargoId: string, updates: Partial<CargoAsset>) => Promise<void>;
  updateAssetStatus: (assetId: string, status: string, location?: string) => Promise<void>;
  createEmergencyIncident: (incident: Partial<SarIncident>) => Promise<SarIncident>;
  updateEmergencyIncident: (incidentId: string, updates: Partial<SarIncident>) => Promise<void>;
  simulateEmergencyScenario: () => Promise<SarIncident>;
  createEmergencyResource: (resource: any) => Promise<void>;
  deleteEmergencyResource: (resourceId: string) => Promise<void>;
  createActivityLog: (log: Partial<SitrepEvent>) => Promise<void>;
  assignEmergencyTeam: (
    incidentId: string,
    teamName: string,
    personnelInTeam: string
  ) => Promise<void>;
  updateEmergencyStatus: (incidentId: string, status: string) => Promise<void>;
  resolveEmergencyIncident: (incidentId: string, notes: string) => Promise<void>;
  createExpeditionItem: (exp: Expedition) => Promise<void>;
  createExpedition: (exp: Expedition) => Promise<void>;
  updateExpedition: (expId: string, updates: Partial<Expedition>) => Promise<void>;
  updateExpeditionStatus: (expId: string, status: Expedition['status']) => Promise<void>;
  createPersonnel: (person: PersonnelMember) => Promise<void>;
  updatePersonnel: (personnelId: string, updates: Partial<PersonnelMember>) => Promise<void>;
  updatePersonnelStatus: (personnelId: string, status: string) => Promise<void>;
  createResupplyRequisition: (req: Partial<ResupplyRequest>) => Promise<void>;
  lookupQrAsset: (codeOrId: string) => CargoAsset | null;
  suppressAlert: (alertId: string) => void;

  // KPI calculations for dashboard
  kpiStats: {
    activeExpeditions: number;
    assetsInOperation: number;
    cargoInTransit: number;
    personnelOnSite: number;
    criticalAlerts: number;
  };
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Physical browser online/offline status
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  // Manual Simulated Offline Mode (Req 9)
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(() => {
    try {
      return localStorage.getItem('polarx_simulated_offline') === 'true';
    } catch {
      return false;
    }
  });

  // Effective connection state
  const isOnline = browserOnline && !isSimulatedOffline;

  // Sync Progress State
  const [syncProgress, setSyncProgress] = useState<SyncProgressState>(getSyncProgress());
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [offlineQueue, setOfflineQueue] = useState<OfflineRecord[]>([]);

  // Core Data Collections
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const [assets, setAssets] = useState<CargoAsset[]>([]);
  const [cargo, setCargo] = useState<CargoAsset[]>([]);
  const [inventory, setInventory] = useState<ConsumableItem[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelMember[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [emergencyIncidents, setEmergencyIncidents] = useState<SarIncident[]>([]);
  const [activityLogs, setActivityLogs] = useState<SitrepEvent[]>([]);
  const [resupplyRequests, setResupplyRequests] = useState<ResupplyRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [suppressedAlertIds, setSuppressedAlertIds] = useState<Record<string, boolean>>({});

  // 1. Listen for browser network changes
  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Subscribe to sync progress updates
  useEffect(() => {
    const unsub = subscribeSyncProgress((state) => {
      setSyncProgress(state);
    });
    return unsub;
  }, []);

  // 3. Load from IndexedDB on initial mount (Req 5: Offline First Read)
  const refreshFromIndexedDB = useCallback(async () => {
    try {
      await db.initLocalDatabase();

      const [
        localExp,
        localAssets,
        localCargo,
        localInv,
        localPers,
        localAlerts,
        localEmg,
        localLogs,
        localResupply,
        localPending,
        localQueue,
      ] = await Promise.all([
        db.getExpeditions(),
        db.getAssets(),
        db.getCargo(),
        db.getInventory(),
        db.getPersonnel(),
        db.getAlerts(),
        db.getEmergencyIncidents(),
        db.getActivityLogs(),
        db.getResupplyRequests(),
        db.getPendingSync(),
        db.getOfflineQueue(),
      ]);

      setExpeditions(localExp);
      setAssets(localAssets);
      setCargo(localCargo);
      setInventory(localInv);
      setPersonnel(localPers);
      setAlerts(localAlerts);
      setEmergencyIncidents(localEmg);
      setActivityLogs(localLogs);
      setResupplyRequests(localResupply);
      setPendingSyncCount(localPending.length);
      setOfflineQueue(localQueue);
      setIsLoading(false);
    } catch (err) {
      console.warn('Error refreshing from IndexedDB:', err);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFromIndexedDB();
  }, [refreshFromIndexedDB]);

  // 4. Background real-time Firestore sync when authenticated & online
  useEffect(() => {
    let unsubs: (() => void)[] = [];
    let active = true;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      // Clean up previous subscriptions if any
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch {}
      });
      unsubs = [];

      if (!isOnline || !user) return;

      unsubs = [
        subscribeExpeditions((data) => {
          if (!active || !data || data.length === 0) return;
          setExpeditions(data);
          data.forEach((item) => db.addExpedition(item));
        }),
        subscribeAssets((data) => {
          if (!active || !data || data.length === 0) return;
          setAssets(data);
          data.forEach((item) => db.addAsset(item));
        }),
        subscribeCargo((data) => {
          if (!active || !data || data.length === 0) return;
          setCargo(data);
          data.forEach((item) => db.addCargo(item));
        }),
        subscribeInventory((data) => {
          if (!active || !data || data.length === 0) return;
          setInventory(data);
          data.forEach((item) => db.addInventory(item));
        }),
        subscribePersonnel((data) => {
          if (!active || !data || data.length === 0) return;
          setPersonnel(data);
          data.forEach((item) => db.addPersonnel(item));
        }),
        subscribeAlerts((data) => {
          if (!active || !data || data.length === 0) return;
          setAlerts(data);
          data.forEach((item) => db.addAlert(item));
        }),
        subscribeEmergencies((data) => {
          if (!active || !data || data.length === 0) return;
          setEmergencyIncidents(data);
          data.forEach((item) => db.createEmergencyIncident(item));
        }),
        subscribeActivityLogs((data) => {
          if (!active || !data || data.length === 0) return;
          setActivityLogs(data);
          data.forEach((item) => db.addActivityLog(item));
        }),
      ];
    });

    return () => {
      active = false;
      authUnsub();
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch {}
      });
    };
  }, [isOnline]);

  // 5. Automatic Queue Processing when returning online
  const triggerManualSync = useCallback(async () => {
    if (!isOnline) {
      console.log('Cannot sync: currently offline.');
      return;
    }
    const result = await processSyncQueue();
    await refreshFromIndexedDB();
    return;
  }, [isOnline, refreshFromIndexedDB]);

  // Whenever isOnline switches from false to true, trigger automatic sync
  useEffect(() => {
    if (isOnline) {
      triggerManualSync();
    }
  }, [isOnline, triggerManualSync]);

  // 6. Simulate Offline / Restore Connection Toggles (Req 9)
  const toggleSimulatedOffline = useCallback(() => {
    setIsSimulatedOffline((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('polarx_simulated_offline', String(next));
      } catch {}
      return next;
    });
  }, []);

  const restoreConnectionAndSync = useCallback(async () => {
    setIsSimulatedOffline(false);
    try {
      localStorage.setItem('polarx_simulated_offline', 'false');
    } catch {}
    // Trigger sync process
    setTimeout(() => {
      triggerManualSync();
    }, 100);
  }, [triggerManualSync]);

  const connectionState: 'ONLINE' | 'OFFLINE' | 'SYNCING' = syncProgress.isSyncing
    ? 'SYNCING'
    : isOnline
    ? 'ONLINE'
    : 'OFFLINE';

  // 7. Dynamic AI Insights based on current data (Req 13: AI Offline)
  const aiInsights = useMemo<AiInsight[]>(() => {
    const fuelItem = inventory.find(
      (i) => i.id === 'POLAR-FUEL-50' || i.name.toLowerCase().includes('diesel')
    );
    const medItem = inventory.find(
      (i) => i.id === 'POLAR-MED-409' || i.category === 'Medical'
    );

    const generated: AiInsight[] = [];

    // Fuel forecast insight
    if (fuelItem) {
      const burnRate = fuelItem.burnRate || 280;
      const days = Math.floor(fuelItem.available / burnRate);
      const isBreached = fuelItem.available <= (fuelItem.minBuffer || 3000);
      generated.push({
        id: 'ai-fuel-dynamic',
        title: isBreached
          ? 'CRITICAL: Polar Diesel Buffer Floor Breached'
          : 'Autonomous Fuel Depletion Projection',
        category: 'consumables',
        categoryLabel: 'RESOURCE DEMAND MODEL',
        confidence: 96,
        summary: `Current Polar Diesel reserve is ${fuelItem.available.toLocaleString()} L. At baseline burn rate of ${burnRate} L/day, fuel may reach the defined threshold in approximately ${days} days. (Based on locally available demo data)`,
        metrics: {
          label1: 'Available / Buffer',
          val1: `${fuelItem.available} / ${fuelItem.minBuffer || 3000} L`,
          sub1: isBreached ? 'BUFFER DEFICIT' : 'Safe Margin',
          label2: 'Zero Day',
          val2: `Day ${days}`,
          sub2: `${days} days remaining`,
          label3: 'Daily Consumption',
          val3: `${burnRate} L/d`,
          sub3: 'Current rate',
        },
        recommendation: isBreached
          ? 'Emergency fuel airlift or overland convoy requisition strongly recommended.'
          : 'Maintain scheduled heating cycles; monitor generator fuel mix.',
        actionPrimary: 'Create Resupply Order',
        actionSecondary: 'Simulate Rationing',
        factors: [
          {
            label: 'IndexedDB local fuel flowmeter telemetry',
            weight: 60,
            icon: 'speed',
            statusColor: isBreached ? 'text-red-500' : 'text-primary',
          },
          {
            label: 'Offline-First Autonomous Forecasting Engine',
            weight: 40,
            icon: 'smart_toy',
            statusColor: 'text-secondary',
          },
        ],
      });
    }

    // Medical forecast insight
    if (medItem) {
      const isCritical = medItem.available < (medItem.minBuffer || 250);
      generated.push({
        id: 'ai-med-dynamic',
        title: isCritical
          ? 'Critical Antibiotics & Trauma Stock Depletion Breach'
          : 'Medical Bay Buffer Telemetry',
        category: 'consumables',
        categoryLabel: 'CONSUMABLES PROJECTION',
        confidence: 89,
        summary: `Broad-spec medical reserve at ${medItem.available} units. Safety buffer is ${medItem.minBuffer || 250} units. (Based on locally available demo data)`,
        metrics: {
          label1: 'Available / Min',
          val1: `${medItem.available} / ${medItem.minBuffer || 250}`,
          sub1: isCritical ? 'DEFICIT ALERT' : 'Normal',
          label2: 'Days Remaining',
          val2: `${medItem.daysRemaining || 10}d`,
          sub2: 'Estimated zero',
          label3: 'Burn Velocity',
          val3: `${medItem.burnRate || 18}/day`,
          sub3: 'Daily pull',
        },
        recommendation:
          'Schedule emergency resupply or reallocate stock from Maitri reserve.',
        actionPrimary: 'Create Resupply Order',
        actionSecondary: 'Reallocate',
        factors: [
          {
            label: 'Local RFID consumption pull logs',
            weight: 55,
            icon: 'inventory_2',
            statusColor: isCritical ? 'text-red-500' : 'text-primary',
          },
        ],
      });
    }

    // Add static or other fleet insights from fixture
    INITIAL_AI_INSIGHTS.forEach((ins) => {
      if (ins.id === 'ai-3' || ins.id === 'ai-4') {
        generated.push(ins);
      }
    });

    return generated;
  }, [inventory]);

  // 8. Derived KPIs for Operations Dashboard (Req 14: Dashboard Offline)
  const kpiStats = useMemo(() => {
    // 1. Active Expeditions
    const activeExpeditions = expeditions.filter((e) => {
      const s = (e.status || '').toLowerCase();
      return s === 'active' || s === 'planning' || s === 'in_progress';
    }).length;

    // 2. Assets in Operation
    const assetsInOperation = assets.filter((a) => {
      const s = (a.status || '').toUpperCase();
      return (
        s === 'OPERATIONAL' ||
        s === 'AT STATION' ||
        s === 'DEPLOYED' ||
        s === 'IN TRANSIT' ||
        s === 'ACTIVE' ||
        !a.status
      );
    }).length;

    // 3. Cargo in Transit
    const cargoInTransit = cargo.filter((c) => {
      const s = (c.status || '').toUpperCase();
      return (
        s === 'IN TRANSIT' ||
        s === 'IN_TRANSIT' ||
        s.includes('TRANSIT') ||
        s === 'DEPLOYED' ||
        !c.status
      );
    }).length;

    // 4. Personnel On Site
    const personnelOnSite = personnel.filter((p) => {
      const s = (p.status || '').toUpperCase();
      return (
        s === 'ON ACTIVE DUTY' ||
        s === 'ON_DUTY' ||
        s === 'STANDBY SAR' ||
        s === 'TRAVERSE FIELD' ||
        s === 'ACTIVE' ||
        !p.status
      );
    }).length;

    // 5. Critical Alerts (alerts + unresolved emergencies)
    const activeAlerts = alerts.filter((a) => {
      const sev = (a.severity || '').toUpperCase();
      const stat = (a.status || '').toUpperCase();
      return (
        (sev === 'CRITICAL' || sev === 'HIGH' || sev === 'EMERGENCY' || a.type === 'STOCK_DEFICIT') &&
        stat !== 'RESOLVED' &&
        !suppressedAlertIds[a.id]
      );
    }).length;

    const activeEmergencies = emergencyIncidents.filter((e) => {
      const stat = (e.status || '').toUpperCase();
      return stat !== 'RESOLVED';
    }).length;

    return {
      activeExpeditions: activeExpeditions || 3,
      assetsInOperation: assetsInOperation || 48,
      cargoInTransit: cargoInTransit || 12,
      personnelOnSite: personnelOnSite || 32,
      criticalAlerts: activeAlerts + activeEmergencies,
    };
  }, [expeditions, assets, cargo, personnel, alerts, emergencyIncidents, suppressedAlertIds]);

  // Helper to add offline sync item and offline queue record
  const queueOfflineOperation = async (
    entity: PendingSyncItem['entity'],
    action: PendingSyncItem['action'],
    entityId: string,
    data: any,
    description: string,
    type: OfflineRecord['type']
  ) => {
    const syncItem: PendingSyncItem = {
      id: 'SYNC-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      entity,
      action,
      entityId,
      data,
      timestamp: Date.now(),
      status: 'PENDING',
      description,
    };

    const offlineRec: OfflineRecord = {
      id: 'REC-' + (Date.now() % 100000),
      type,
      desc: description,
      time: new Date().toISOString().substring(11, 19) + ' UTC',
      status: 'PENDING SYNC',
    };

    await db.addPendingSync(syncItem);
    await db.addOfflineRecord(offlineRec);

    setPendingSyncCount((prev) => prev + 1);
    setOfflineQueue((prev) => [offlineRec, ...prev]);

    // If online, kick off sync immediately
    if (isOnline) {
      processSyncQueue();
    }
  };

  /* =========================================================================
   * Specific Actions Implementation
   * ========================================================================= */

  // Requirement 10: Inventory Offline Test - Fuel Consumption
  const consumeFuel = async (amount: number, reason: string = 'Generator Run'): Promise<ConsumableItem | null> => {
    const fuelItem = inventory.find(
      (i) => i.id === 'POLAR-FUEL-50' || i.name.toLowerCase().includes('diesel')
    );
    if (!fuelItem) return null;

    const newAvailable = Math.max(0, fuelItem.available - amount);
    const burnRate = fuelItem.burnRate || 280;
    const newDaysRemaining = Math.max(1, Math.floor(newAvailable / burnRate));
    const minBuffer = fuelItem.minBuffer || 3000;
    const isCritical = newAvailable <= minBuffer;
    const newStatus = isCritical ? 'CRITICAL' : 'NORMAL';

    const updatedItem: ConsumableItem = {
      ...fuelItem,
      available: newAvailable,
      daysRemaining: newDaysRemaining,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    // 1. Update IndexedDB immediately
    await db.updateInventory(fuelItem.id, updatedItem);

    // 2. Update local state immediately
    setInventory((prev) =>
      prev.map((item) => (item.id === fuelItem.id ? updatedItem : item))
    );

    // 3. Log Sitrep event in IndexedDB & local state
    const logEvent: SitrepEvent = {
      id: 'sitrep-fuel-' + Date.now(),
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
      title: 'Fuel Consumption Recorded',
      badge: 'CONSUME',
      badgeType: 'ops',
      category: 'ENERGY_DRAW',
      details: `Consumed ${amount} L Polar Diesel. Remaining: ${newAvailable} L (${newDaysRemaining}d remaining). ${reason}`,
      description: `Consumed ${amount} L Polar Diesel. Remaining: ${newAvailable} L.`,
      actor: 'Polar Operator',
    };
    await db.addActivityLog(logEvent);
    setActivityLogs((prev) => [logEvent, ...prev]);

    // 4. If threshold reached, create local warning/critical alert
    if (isCritical) {
      const alertId = 'ALERT-FUEL-' + Date.now();
      const fuelAlert: AlertItem = {
        id: alertId,
        title: 'POLAR DIESEL BELOW MINIMUM BUFFER',
        severity: 'CRITICAL',
        type: 'STOCK_DEFICIT',
        description: `Fuel reserve at ${newAvailable} L breached 3,000 L safety threshold. Projected zero: ${newDaysRemaining} days.`,
        status: 'ACTIVE',
        inventoryId: fuelItem.id,
        createdAt: new Date().toISOString(),
      };
      await db.addAlert(fuelAlert);
      setAlerts((prev) => [fuelAlert, ...prev]);
    }

    // 5. Queue for sync
    await queueOfflineOperation(
      'inventory',
      'UPDATE',
      fuelItem.id,
      {
        transactionType: 'CONSUME',
        amount,
        reason,
        newAvailable,
      },
      `Polar Diesel draw: -${amount}L (${newAvailable}L remaining)`,
      'INVENTORY'
    );

    return updatedItem;
  };

  // General stock transaction
  const recordStockTransaction = async (
    itemId: string,
    type: 'ADD' | 'CONSUME',
    amount: number,
    reason: string = 'Stock adjustment'
  ) => {
    if (itemId === 'POLAR-FUEL-50' && type === 'CONSUME') {
      await consumeFuel(amount, reason);
      return;
    }

    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;

    const newAvailable =
      type === 'ADD'
        ? item.available + amount
        : Math.max(0, item.available - amount);
    const burnRate = item.burnRate || 1;
    const newDaysRemaining = Math.max(1, Math.floor(newAvailable / burnRate));
    const minBuffer = item.minBuffer || 0;
    const isCritical = newAvailable <= minBuffer;
    const newStatus = isCritical ? 'CRITICAL' : 'NORMAL';

    const updatedItem: ConsumableItem = {
      ...item,
      available: newAvailable,
      daysRemaining: newDaysRemaining,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    await db.updateInventory(itemId, updatedItem);
    setInventory((prev) =>
      prev.map((i) => (i.id === itemId ? updatedItem : i))
    );

    const logEvent: SitrepEvent = {
      id: 'sitrep-stock-' + Date.now(),
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
      title: `${type === 'ADD' ? 'Stock Replenished' : 'Stock Drawn'}: ${item.name}`,
      badge: type === 'ADD' ? 'STOCK_ADD' : 'STOCK_DRAW',
      badgeType: 'ops',
      category: 'INVENTORY',
      details: `${type === 'ADD' ? 'Added' : 'Consumed'} ${amount} ${item.unit} of ${item.name}. Remaining: ${newAvailable} ${item.unit}.`,
      description: `${type === 'ADD' ? 'Added' : 'Consumed'} ${amount} ${item.unit} of ${item.name}.`,
      actor: 'Polar Operator',
    };
    await db.addActivityLog(logEvent);
    setActivityLogs((prev) => [logEvent, ...prev]);

    await queueOfflineOperation(
      'inventory',
      'UPDATE',
      itemId,
      {
        transactionType: type,
        amount,
        reason,
        newAvailable,
      },
      `${item.name} stock ${type === 'ADD' ? '+' : '-'}${amount} ${item.unit}`,
      'INVENTORY'
    );
  };

  const updateInventoryThreshold = async (itemId: string, threshold: number) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;

    const updatedItem: ConsumableItem = {
      ...item,
      minBuffer: threshold,
      minimumThreshold: threshold,
      threshold,
      updatedAt: new Date().toISOString(),
    };

    await db.updateInventory(itemId, updatedItem);
    setInventory((prev) =>
      prev.map((i) => (i.id === itemId ? updatedItem : i))
    );

    await queueOfflineOperation(
      'inventory',
      'UPDATE',
      itemId,
      { threshold },
      `Update threshold for ${item.name} to ${threshold} ${item.unit}`,
      'INVENTORY'
    );
  };

  // Requirement 11: Emergency Offline Test
  const simulateEmergencyScenario = async (): Promise<SarIncident> => {
    const incidentId = '#SAR-EMG-' + (Date.now() % 100000);
    const incident: SarIncident = {
      id: incidentId,
      title: 'Medical Emergency (Crevasse Fall & Hypothermia)',
      severity: 'CRITICAL',
      defcon: 'CRITICAL DEFCON-1',
      location: 'Bharati Station — Sector 7 Ridge',
      coordinates: '-69.407°S, 76.191°E',
      activeTime: 'JUST NOW',
      description:
        '3 field researchers reported sudden ice crevasse bridge breach while conducting glaciology core testing in sub-zero whiteout conditions.',
      situation:
        '3 Personnel affected. Initial vitals unstable; emergency heated triage shelters and snowcat evacuation dispatched.',
      personnel: [
        { name: 'Dr. S. Roy', role: 'Glaciologist', status: 'critical' },
        { name: 'Eng. T. Chander', role: 'Mechanical Eng.', status: 'monitored' },
        { name: 'Tech. A. Sen', role: 'Bio-Telemetry Tech', status: 'monitored' },
      ],
      personnelInvolved: [
        'Dr. S. Roy (Glaciologist - Critical)',
        'Eng. T. Chander (Mechanical Eng. - Monitored)',
        'Tech. A. Sen (Bio-Telemetry Tech - Monitored)',
      ],
      responseTeam: 'SAR Team Alpha',
      personnelInTeam: 'Maj. Arjun Rathore + 2 Medics',
      eta: '04 MIN (Tracked on GPS SBD)',
      status: 'ACTIVE',
      incidentCommander: 'Dr. Rajesh Sen',
      distressCode: 'MAYDAY-406-HEX',
      createdAt: new Date().toISOString(),
    };

    // 1. Save locally in IndexedDB
    await db.createEmergencyIncident(incident);

    // 2. Update local state immediately
    setEmergencyIncidents((prev) => [incident, ...prev]);

    // 3. Create critical alert
    const newAlert: AlertItem = {
      id: 'ALERT-SAR-' + Date.now(),
      title: 'CRITICAL SAR INCIDENT: ' + incident.title,
      severity: 'CRITICAL',
      type: 'INCIDENT',
      description: 'Medical Emergency at Bharati Station with 3 personnel affected.',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    await db.addAlert(newAlert);
    setAlerts((prev) => [newAlert, ...prev]);

    // 4. Log Sitrep event
    const logEvent: SitrepEvent = {
      id: 'sitrep-emg-' + Date.now(),
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
      title: 'Distress Beacon Activated: ' + incident.title,
      badge: 'DISTRESS',
      badgeType: 'distress',
      category: 'SAR_OPERATIONS',
      details: incident.description || 'Emergency incident logged',
      description: incident.title,
      actor: 'Emergency Ops Center',
    };
    await db.addActivityLog(logEvent);
    setActivityLogs((prev) => [logEvent, ...prev]);

    // 5. Add to pendingSync queue
    await queueOfflineOperation(
      'emergencyIncidents',
      'CREATE',
      incident.id,
      incident,
      `SAR Incident: ${incident.title} (Bharati Station - CRITICAL)`,
      'EMERGENCY'
    );

    return incident;
  };

  const createEmergencyIncident = async (data: Partial<SarIncident>): Promise<SarIncident> => {
    const id = data.id || '#SAR-' + Date.now().toString().slice(-6);
    const incident: SarIncident = {
      id,
      title: data.title || 'Field Incident',
      severity: data.severity || 'CRITICAL',
      defcon: data.defcon || 'DEFCON-2',
      location: data.location || 'Bharati Station',
      coordinates: data.coordinates || '-69.407°S, 76.191°E',
      activeTime: 'JUST NOW',
      description: data.description || data.situation || 'Incident reported',
      situation: data.situation || data.description || 'Situation active',
      personnel: data.personnel || [],
      personnelInvolved: data.personnelInvolved || [],
      responseTeam: data.responseTeam || 'Unassigned',
      personnelInTeam: data.personnelInTeam || '',
      eta: data.eta || '10 MIN',
      status: data.status || 'ACTIVE',
      incidentCommander: data.incidentCommander || 'Polar Commander',
      distressCode: data.distressCode || 'EMERGENCY-CALLOUT',
      createdAt: new Date().toISOString(),
    };

    await db.createEmergencyIncident(incident);
    setEmergencyIncidents((prev) => [incident, ...prev]);

    await queueOfflineOperation(
      'emergencyIncidents',
      'CREATE',
      incident.id,
      incident,
      `Emergency: ${incident.title}`,
      'EMERGENCY'
    );

    return incident;
  };

  const assignEmergencyTeam = async (
    incidentId: string,
    teamName: string,
    personnelInTeam: string
  ) => {
    const existing = emergencyIncidents.find((e) => e.id === incidentId);
    if (!existing) return;

    const updated: SarIncident = {
      ...existing,
      responseTeam: teamName,
      personnelInTeam,
      status: 'CONTAINED',
      updatedAt: new Date().toISOString(),
    };

    await db.updateEmergencyIncident(incidentId, updated);
    setEmergencyIncidents((prev) =>
      prev.map((e) => (e.id === incidentId ? updated : e))
    );

    await queueOfflineOperation(
      'emergencyIncidents',
      'UPDATE',
      incidentId,
      { responseTeam: teamName, personnelInTeam, status: 'CONTAINED' },
      `Assign ${teamName} to SAR ${incidentId}`,
      'EMERGENCY'
    );
  };

  const updateEmergencyStatus = async (incidentId: string, status: string) => {
    const existing = emergencyIncidents.find((e) => e.id === incidentId);
    if (!existing) return;

    const updated: SarIncident = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };

    await db.updateEmergencyIncident(incidentId, updated);
    setEmergencyIncidents((prev) =>
      prev.map((e) => (e.id === incidentId ? updated : e))
    );

    await queueOfflineOperation(
      'emergencyIncidents',
      'UPDATE',
      incidentId,
      { status },
      `SAR ${incidentId} status updated to ${status}`,
      'EMERGENCY'
    );
  };

  const resolveEmergencyIncident = async (incidentId: string, notes: string) => {
    const existing = emergencyIncidents.find((e) => e.id === incidentId);
    if (!existing) return;

    const updated: SarIncident = {
      ...existing,
      status: 'RESOLVED',
      resolutionNotes: notes,
      updatedAt: new Date().toISOString(),
    };

    await db.updateEmergencyIncident(incidentId, updated);
    setEmergencyIncidents((prev) =>
      prev.map((e) => (e.id === incidentId ? updated : e))
    );

    // Log sitrep
    const logEvent: SitrepEvent = {
      id: 'sitrep-res-' + Date.now(),
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
      title: `Incident Resolved: ${existing.title}`,
      badge: 'RESOLVED',
      badgeType: 'ops',
      category: 'SAR_OPERATIONS',
      details: notes,
      description: `Incident ${existing.title} resolved.`,
      actor: 'Incident Commander',
    };
    await db.addActivityLog(logEvent);
    setActivityLogs((prev) => [logEvent, ...prev]);

    await queueOfflineOperation(
      'emergencyIncidents',
      'UPDATE',
      incidentId,
      { status: 'RESOLVED', resolutionNotes: notes },
      `SAR ${incidentId} resolved: ${notes.slice(0, 40)}...`,
      'EMERGENCY'
    );
  };

  // Requirement 12: QR Offline Asset Scanning
  const lookupQrAsset = useCallback(
    (codeOrId: string): CargoAsset | null => {
      if (!codeOrId) return null;
      const clean = codeOrId.trim().toUpperCase();
      // Extract asset code if formatted (e.g. NCPOR:POLAR-AX-1042:... or POLAR-...)
      const match = clean.match(/POLAR-[A-Z0-9-]+/);
      const extractedId = match ? match[0] : clean;

      // First check assets
      const foundInAssets = assets.find(
        (a) =>
          a.id.toUpperCase() === clean ||
          a.id.toUpperCase() === extractedId ||
          (a.serialNumber && a.serialNumber.toUpperCase().includes(clean)) ||
          (a.qrPayload && (a.qrPayload.toUpperCase().includes(clean) || clean.includes(a.id.toUpperCase())))
      );
      if (foundInAssets) return foundInAssets;

      // Second check cargo
      const foundInCargo = cargo.find(
        (c) =>
          c.id.toUpperCase() === clean ||
          c.id.toUpperCase() === extractedId ||
          (c.serialNumber && c.serialNumber.toUpperCase().includes(clean)) ||
          (c.qrPayload && (c.qrPayload.toUpperCase().includes(clean) || clean.includes(c.id.toUpperCase())))
      );
      return foundInCargo || null;
    },
    [assets, cargo]
  );

  const createOrUpdateAsset = async (asset: CargoAsset) => {
    await db.addAsset(asset);
    setAssets((prev) => {
      const existing = prev.find((a) => a.id === asset.id);
      if (existing) {
        return prev.map((a) => (a.id === asset.id ? asset : a));
      }
      return [asset, ...prev];
    });

    await queueOfflineOperation(
      'assets',
      'CREATE',
      asset.id,
      asset,
      `Asset ${asset.name} (${asset.id}) updated/registered`,
      'ASSET'
    );
  };

  const updateAssetStatus = async (assetId: string, status: string, location?: string) => {
    const existing = assets.find((a) => a.id === assetId);
    if (!existing) return;

    const updated: CargoAsset = {
      ...existing,
      status,
      location: location || existing.location,
      updatedAt: new Date().toISOString(),
    };

    await db.updateAsset(assetId, updated);
    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? updated : a))
    );

    await queueOfflineOperation(
      'assets',
      'UPDATE',
      assetId,
      { status, location },
      `Asset ${assetId} status changed to ${status}`,
      'ASSET'
    );
  };

  const createExpeditionItem = async (exp: Expedition) => {
    await db.addExpedition(exp);
    setExpeditions((prev) => [exp, ...prev]);

    await queueOfflineOperation(
      'expeditions',
      'CREATE',
      exp.id,
      exp,
      `Expedition ${exp.name} registered`,
      'CUSTOM'
    );
  };

  const updateExpeditionStatus = async (expId: string, status: Expedition['status']) => {
    const existing = expeditions.find((e) => e.id === expId);
    if (!existing) return;

    const updated: Expedition = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };

    await db.updateExpedition(expId, updated);
    setExpeditions((prev) =>
      prev.map((e) => (e.id === expId ? updated : e))
    );

    await queueOfflineOperation(
      'expeditions',
      'UPDATE',
      expId,
      { status },
      `Expedition ${expId} status set to ${status}`,
      'CUSTOM'
    );
  };

  const updatePersonnelStatus = async (personnelId: string, status: string) => {
    const existing = personnel.find((p) => p.id === personnelId);
    if (!existing) return;

    const updated: PersonnelMember = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };

    await db.updatePersonnel(personnelId, updated);
    setPersonnel((prev) =>
      prev.map((p) => (p.id === personnelId ? updated : p))
    );

    await queueOfflineOperation(
      'personnel',
      'UPDATE',
      personnelId,
      { status },
      `Personnel ${existing.name} set to ${status}`,
      'PERSONNEL'
    );
  };

  const createResupplyRequisition = async (req: Partial<ResupplyRequest>) => {
    const id = req.id || 'REQ-' + Date.now();
    const requisition: ResupplyRequest = {
      id,
      inventoryId: req.inventoryId || 'INV-RES',
      orderNumber: req.orderNumber || '#ORD-' + Math.floor(1000 + Math.random() * 9000),
      itemName: req.itemName || 'Resupply Item',
      requestedQty: req.requestedQty || 10,
      unit: req.unit || 'units',
      priority: req.priority || 'STANDARD',
      status: req.status || 'PENDING',
      destination: req.destination || 'Bharati Station',
      eta: req.eta || '7d',
      notes: req.notes || 'Emergency requisition',
      createdAt: new Date().toISOString(),
    };

    await db.addResupplyRequest(requisition);
    setResupplyRequests((prev) => [requisition, ...prev]);

    await queueOfflineOperation(
      'resupplyRequests',
      'CREATE',
      id,
      requisition,
      `Resupply Requisition for ${requisition.requestedQty} ${requisition.unit} of ${requisition.itemName}`,
      'CARGO'
    );
  };

  const suppressAlert = (alertId: string) => {
    setSuppressedAlertIds((prev) => ({ ...prev, [alertId]: true }));
  };

  const [emergencyResources, setEmergencyResources] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('polarx_emergency_resources');
      return stored
        ? JSON.parse(stored)
        : [
            {
              id: 'RES-1',
              emergencyId: 'SAR-2601',
              name: 'Polar Snowcat Alpha',
              type: 'VEHICLE',
              quantity: 1,
              status: 'EN ROUTE',
              location: 'Bharati Stn',
              assignedTeam: 'Team Alpha',
            },
          ];
    } catch {
      return [];
    }
  });

  const createEmergencyResource = async (res: any) => {
    setEmergencyResources((prev) => {
      const updated = [res, ...prev.filter((r) => r.id !== res.id)];
      try {
        localStorage.setItem('polarx_emergency_resources', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    await queueOfflineOperation(
      'emergencyIncidents',
      'CREATE',
      res.id,
      res,
      `Resource assigned: ${res.name}`,
      'EMERGENCY'
    );
  };

  const deleteEmergencyResource = async (resId: string) => {
    setEmergencyResources((prev) => {
      const updated = prev.filter((r) => r.id !== resId);
      try {
        localStorage.setItem('polarx_emergency_resources', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const updateEmergencyIncident = async (id: string, updates: Partial<SarIncident>) => {
    const existing = emergencyIncidents.find((e) => e.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await db.updateEmergencyIncident(id, updated);
    setEmergencyIncidents((prev) => prev.map((e) => (e.id === id ? updated : e)));
    await queueOfflineOperation(
      'emergencyIncidents',
      'UPDATE',
      id,
      updates,
      `Emergency ${existing.title} updated`,
      'EMERGENCY'
    );
  };

  const createActivityLog = async (log: Partial<SitrepEvent>) => {
    const id = log.id || 'SIT-' + Date.now();
    const sitrep: SitrepEvent = {
      id,
      title: log.title || 'Operational Event',
      badge: log.badge || 'INFO',
      badgeType: log.badgeType || 'ops',
      category: log.category || 'LOGISTICS',
      details: log.details || log.description || '',
      description: log.description || log.details || '',
      actor: log.actor || 'System',
      time: log.time || new Date().toISOString().substring(11, 16) + ' UTC',
      timestamp: log.timestamp || new Date().toISOString().substring(11, 16) + ' UTC',
      emergencyId: log.emergencyId,
    };
    await db.addActivityLog(sitrep);
    setActivityLogs((prev) => [sitrep, ...prev]);
    await queueOfflineOperation('activityLogs', 'CREATE', id, sitrep, sitrep.title, 'CUSTOM');
  };

  const updateAsset = async (id: string, updates: Partial<CargoAsset>) => {
    const existing = assets.find((a) => a.id === id) || cargo.find((c) => c.id === id);
    if (!existing) return;
    const updated: CargoAsset = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await db.updateAsset(id, updated);
    setAssets((prev) => prev.map((a) => (a.id === id ? updated : a)));
    await queueOfflineOperation('assets', 'UPDATE', id, updates, `Asset ${id} updated`, 'ASSET');
  };

  const createAsset = async (asset: CargoAsset) => {
    await db.addAsset(asset);
    setAssets((prev) => [asset, ...prev]);
    await queueOfflineOperation('assets', 'CREATE', asset.id, asset, `Asset ${asset.name} created`, 'ASSET');
  };

  const updateCargo = async (id: string, updates: Partial<CargoAsset>) => {
    const existing = cargo.find((c) => c.id === id) || assets.find((a) => a.id === id);
    if (!existing) return;
    const updated: CargoAsset = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await db.updateCargo(id, updated);
    setCargo((prev) => prev.map((c) => (c.id === id ? updated : c)));
    await queueOfflineOperation('cargo', 'UPDATE', id, updates, `Cargo ${id} updated`, 'CARGO');
  };

  const createCargo = async (cargoItem: CargoAsset) => {
    await db.addCargo(cargoItem);
    setCargo((prev) => [cargoItem, ...prev]);
    await queueOfflineOperation('cargo', 'CREATE', cargoItem.id, cargoItem, `Cargo ${cargoItem.name} created`, 'CARGO');
  };

  const createExpedition = async (exp: Expedition) => {
    return createExpeditionItem(exp);
  };

  const updateExpedition = async (id: string, updates: Partial<Expedition>) => {
    const existing = expeditions.find((e) => e.id === id);
    if (!existing) return;
    const updated: Expedition = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await db.updateExpedition(id, updated);
    setExpeditions((prev) => prev.map((e) => (e.id === id ? updated : e)));
    await queueOfflineOperation('expeditions', 'UPDATE', id, updates, `Expedition ${existing.name} updated`, 'CUSTOM');
  };

  const createPersonnel = async (person: PersonnelMember) => {
    await db.addPersonnel(person);
    setPersonnel((prev) => [person, ...prev]);
    await queueOfflineOperation('personnel', 'CREATE', person.id, person, `Personnel ${person.name} registered`, 'PERSONNEL');
  };

  const updatePersonnel = async (id: string, updates: Partial<PersonnelMember>) => {
    const existing = personnel.find((p) => p.id === id);
    if (!existing) return;
    const updated: PersonnelMember = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await db.updatePersonnel(id, updated);
    setPersonnel((prev) => prev.map((p) => (p.id === id ? updated : p)));
    await queueOfflineOperation('personnel', 'UPDATE', id, updates, `Personnel ${existing.name} updated`, 'PERSONNEL');
  };

  const updateInventoryItem = async (id: string, updates: Partial<ConsumableItem>) => {
    const existing = inventory.find((i) => i.id === id);
    if (!existing) return;
    const updated: ConsumableItem = { ...existing, ...updates };
    await db.updateInventory(id, updated);
    setInventory((prev) => prev.map((i) => (i.id === id ? updated : i)));
    await queueOfflineOperation('inventory', 'UPDATE', id, updates, `Inventory ${existing.name} updated`, 'INVENTORY');
  };

  const contextValue: DataContextType = {
    isOnline,
    isSimulatedOffline,
    connectionState,
    pendingSyncCount,
    offlineQueue,
    syncProgress,
    toggleSimulatedOffline,
    restoreConnectionAndSync,
    triggerManualSync,
    expeditions,
    assets,
    cargo,
    inventory,
    personnel,
    alerts,
    emergencyIncidents,
    emergencyResources,
    activityLogs,
    resupplyRequests,
    aiInsights,
    isLoading,
    isInitialized: !isLoading,
    recordStockTransaction,
    consumeFuel,
    updateInventoryThreshold,
    updateInventoryItem,
    createOrUpdateAsset,
    createAsset,
    updateAsset,
    createCargo,
    updateCargo,
    updateAssetStatus,
    createEmergencyIncident,
    updateEmergencyIncident,
    simulateEmergencyScenario,
    createEmergencyResource,
    deleteEmergencyResource,
    createActivityLog,
    assignEmergencyTeam,
    updateEmergencyStatus,
    resolveEmergencyIncident,
    createExpeditionItem,
    createExpedition,
    updateExpedition,
    updateExpeditionStatus,
    createPersonnel,
    updatePersonnel,
    updatePersonnelStatus,
    createResupplyRequisition,
    lookupQrAsset,
    suppressAlert,
    kpiStats,
  };

  return <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within a DataProvider');
  }
  return ctx;
};
