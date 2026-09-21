/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  AppNotification,
  ConsumableItem,
  CargoAsset,
  Expedition,
  PersonnelMember,
  SarIncident,
  ResupplyRequest,
  NotificationSeverity,
  NotificationCategory,
} from '../types';
import {
  subscribeNotifications,
  createNotification,
  markNotificationAsRead as dbMarkAsRead,
  markAllNotificationsAsRead as dbMarkAllAsRead,
  deleteNotification as dbDeleteNotification,
  clearAllNotifications as dbClearAll,
} from '../firebase/dbService';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';

const LOCAL_STORAGE_KEY = 'polarx_notifications_cache';

export interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  unreadNotifications: AppNotification[];
  criticalCount: number;
  isLiveConnected: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  addNotification: (
    notification: Partial<AppNotification> & { title: string; message: string }
  ) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

// Initial baseline notification fixtures so the user immediately has relevant context on fresh boot
const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'NOTIF-INIT-01',
    dedupKey: 'NOTIF_LOW_STOCK_POLAR-MED-409',
    title: 'Critical Inventory: Broad-Spec IV Antibiotics',
    message: 'Stock level (180 units) breached minimum threshold (250 units). Immediate resupply required.',
    severity: 'CRITICAL',
    category: 'INVENTORY',
    targetTab: 'stock',
    targetId: 'POLAR-MED-409',
    isRead: false,
    timestamp: '14:27 UTC',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    createdBy: 'system-monitor',
  },
  {
    id: 'NOTIF-INIT-02',
    dedupKey: 'NOTIF_EMERGENCY_#SAR-2026-09',
    title: 'Emergency SAR Incident Active',
    message: 'Sector 4 crevasse fall reported. Alpha Trauma Rig dispatched to coordinates.',
    severity: 'CRITICAL',
    category: 'EMERGENCY',
    targetTab: 'sos',
    targetId: '#SAR-2026-09',
    isRead: false,
    timestamp: '13:18 UTC',
    createdAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    createdBy: 'system-monitor',
  },
  {
    id: 'NOTIF-INIT-03',
    dedupKey: 'NOTIF_RESUPPLY_APPROVAL_RES-8820',
    title: 'Emergency Resupply Requires Approval',
    message: 'Requisition #RES-8820 for Broad-Spec IV Antibiotics (120 units) pending logistics officer signoff.',
    severity: 'WARNING',
    category: 'RESUPPLY',
    targetTab: 'stock',
    targetId: 'RES-8820',
    isRead: false,
    timestamp: '12:45 UTC',
    createdAt: new Date(Date.now() - 1000 * 60 * 115).toISOString(),
    createdBy: 'system-monitor',
  },
  {
    id: 'NOTIF-INIT-04',
    dedupKey: 'NOTIF_CARGO_STATUS_CARGO-PALLET-088',
    title: 'Cargo In Transit: Generator Spares',
    message: 'Turbine Turbine Replacement Pallet en route to Bharati Station via S.A. Agulhas II.',
    severity: 'INFO',
    category: 'CARGO',
    targetTab: 'cargo',
    targetId: 'CARGO-PALLET-088',
    isRead: true,
    readAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    timestamp: '10:00 UTC',
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    createdBy: 'system-monitor',
  },
];

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser, userProfile } = useAuth();
  const currentUid = currentUser?.uid || userProfile?.uid || 'system-user';

  // Load initial notifications from localStorage or fallback to INITIAL_NOTIFICATIONS
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached notifications:', e);
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Set of handled dedupKeys in session to prevent duplicate creation cycles
  const handledDedupKeysRef = useRef<Set<string>>(new Set());

  // Populate handledDedupKeysRef with existing keys
  useEffect(() => {
    notifications.forEach((n) => {
      if (n.dedupKey) handledDedupKeysRef.current.add(n.dedupKey);
      handledDedupKeysRef.current.add(n.id);
    });
  }, []);

  // Synchronize notifications to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.warn('Failed to persist notifications to localStorage:', e);
    }
  }, [notifications]);

  // Subscribe to Cloud Firestore notifications collection
  useEffect(() => {
    if (!currentUser) {
      setIsLiveConnected(false);
      return;
    }

    const unsub = subscribeNotifications(
      (remoteList) => {
        setIsLiveConnected(true);
        if (remoteList && remoteList.length > 0) {
          setNotifications((prev) => {
            // Merge remote list with any pending local updates
            const map = new Map<string, AppNotification>();
            // Remote documents take priority
            remoteList.forEach((n) => {
              map.set(n.id, n);
              if (n.dedupKey) handledDedupKeysRef.current.add(n.dedupKey);
            });
            // Keep existing ones not deleted
            prev.forEach((n) => {
              if (!map.has(n.id)) {
                map.set(n.id, n);
              }
            });

            const merged = Array.from(map.values());
            merged.sort((a, b) => {
              const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
              const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
              return timeB - timeA;
            });
            return merged;
          });
        }
      },
      (err) => {
        console.warn('Firestore notifications sync offline or unavailable:', err);
        setIsLiveConnected(false);
      }
    );

    return () => unsub();
  }, [currentUser]);

  // Helper to dispatch a new notification safely (writes to Firestore & local state)
  const dispatchNotification = useCallback(
    async (payload: {
      dedupKey: string;
      title: string;
      message: string;
      severity: NotificationSeverity;
      category: NotificationCategory;
      targetTab?: string;
      targetId?: string;
    }) => {
      // Check if already dispatched
      if (handledDedupKeysRef.current.has(payload.dedupKey)) {
        return;
      }

      // Check if existing in state
      const alreadyExists = notifications.some(
        (n) => n.dedupKey === payload.dedupKey
      );
      if (alreadyExists) {
        handledDedupKeysRef.current.add(payload.dedupKey);
        return;
      }

      handledDedupKeysRef.current.add(payload.dedupKey);

      const notifId = 'NOTIF-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const newNotif: AppNotification = {
        id: notifId,
        dedupKey: payload.dedupKey,
        title: payload.title,
        message: payload.message,
        timestamp: new Date().toISOString().substring(11, 16) + ' UTC',
        createdAt: new Date().toISOString(),
        severity: payload.severity,
        category: payload.category,
        targetTab: payload.targetTab,
        targetId: payload.targetId,
        isRead: false,
        createdBy: currentUid,
      };

      // Optimistically update local state immediately
      setNotifications((prev) => [newNotif, ...prev]);

      // Write to Firestore
      try {
        await createNotification(newNotif, currentUid);
      } catch (e) {
        console.warn('Could not write notification to Firestore (offline fallback active):', e);
      }
    },
    [currentUid, notifications]
  );

  /* =========================================================================
   * REAL-TIME EVENT MONITORS
   * Connected to real DataContext events (both Offline IndexedDB & Online Firestore)
   * ========================================================================= */
  const dataCtx = useData();

  // 1. INVENTORY EVENT MONITOR (Low stock, critical buffer breach, run-out soon)
  useEffect(() => {
    const inventoryItems = dataCtx.inventory;
    if (!inventoryItems || inventoryItems.length === 0) return;

    inventoryItems.forEach((item) => {
      const available = item.available ?? item.currentStock ?? 0;
      const threshold = item.minimumThreshold ?? item.minBuffer ?? item.threshold ?? 50;
      const daysRemaining = item.daysRemaining ?? 30;

      // Condition A: Stock below critical threshold
      if (available <= threshold) {
        dispatchNotification({
          dedupKey: `NOTIF_LOW_STOCK_${item.id}_${threshold}`,
          title: `Low Inventory Alert: ${item.name}`,
          message: `Available stock dropped to ${available} ${item.unit || 'units'} (Safety Threshold: ${threshold} ${item.unit || 'units'}).`,
          severity: 'CRITICAL',
          category: 'INVENTORY',
          targetTab: 'stock',
          targetId: item.id,
        });
      }

      // Condition B: Inventory projected to run out soon (< 7 days)
      if (daysRemaining > 0 && daysRemaining <= 7 && available > threshold) {
        dispatchNotification({
          dedupKey: `NOTIF_DEPLETION_${item.id}_${Math.floor(daysRemaining)}D`,
          title: `Depletion Warning: ${item.name}`,
          message: `Item projected to run out in ${daysRemaining} day(s) at current burn rate (${item.burnRate || 1} ${item.unit || 'units'}/day).`,
          severity: 'WARNING',
          category: 'INVENTORY',
          targetTab: 'stock',
          targetId: item.id,
        });
      }
    });
  }, [dataCtx.inventory, dispatchNotification]);

  // 2. CARGO EVENT MONITOR (Cargo delayed, status changes, vessel transit)
  useEffect(() => {
    const cargoList = dataCtx.cargo;
    if (!cargoList || cargoList.length === 0) return;

    cargoList.forEach((cargo) => {
      const isDelayed =
        cargo.status === 'DELAYED' ||
        (cargo.eta && cargo.eta.toLowerCase().includes('delayed'));

      if (isDelayed) {
        dispatchNotification({
          dedupKey: `NOTIF_CARGO_DELAYED_${cargo.id}`,
          title: `Cargo Delivery Delayed: ${cargo.name}`,
          message: `Freight shipment ${cargo.id} (${cargo.carrier || cargo.vessel || 'Sea Convoy'}) is delayed. Revised ETA: ${cargo.eta || 'Pending Weather clearance'}.`,
          severity: 'WARNING',
          category: 'CARGO',
          targetTab: 'cargo',
          targetId: cargo.id,
        });
      } else if (cargo.status === 'IN TRANSIT') {
        dispatchNotification({
          dedupKey: `NOTIF_CARGO_TRANSIT_${cargo.id}_${cargo.carrier || 'vessel'}`,
          title: `Cargo In Transit: ${cargo.name}`,
          message: `Shipment #${cargo.id} underway to ${cargo.destination || (cargo as any).destStation || 'Bharati Station'}.`,
          severity: 'INFO',
          category: 'CARGO',
          targetTab: 'cargo',
          targetId: cargo.id,
        });
      }
    });
  }, [dataCtx.cargo, dispatchNotification]);

  // 3. ASSETS EVENT MONITOR (Asset entering maintenance, overdue maintenance, low health)
  useEffect(() => {
    const assetsList = dataCtx.assets;
    if (!assetsList || assetsList.length === 0) return;

    assetsList.forEach((asset) => {
      const health = asset.healthPercent ?? asset.integrity ?? 100;
      const status = asset.status || 'OPERATIONAL';

      if (status === 'MAINTENANCE' || health <= 40) {
        dispatchNotification({
          dedupKey: `NOTIF_ASSET_MAINT_${asset.id}_${health <= 20 ? 'OVERDUE' : 'WARN'}`,
          title: health <= 20 ? `Critical Asset Alert: ${asset.name}` : `Asset Entering Maintenance: ${asset.name}`,
          message: `Asset integrity at ${health}%. Status: ${status}. Operational check required.`,
          severity: health <= 20 ? 'CRITICAL' : 'WARNING',
          category: 'ASSET',
          targetTab: 'cargo',
          targetId: asset.id,
        });
      }
    });
  }, [dataCtx.assets, dispatchNotification]);

  // 4. EXPEDITIONS EVENT MONITOR (Expedition status changed, delayed missions)
  useEffect(() => {
    const expeditions = dataCtx.expeditions;
    if (!expeditions || expeditions.length === 0) return;

    expeditions.forEach((exp) => {
      if (exp.status === 'delayed') {
        dispatchNotification({
          dedupKey: `NOTIF_EXPED_DELAYED_${exp.id}`,
          title: `Expedition Delayed: ${exp.name}`,
          message: `Mission ${exp.id} reported weather delay in ${exp.location}. Progress halted at ${exp.progressPercent || 0}%.`,
          severity: 'WARNING',
          category: 'EXPEDITION',
          targetTab: 'expeditions',
          targetId: exp.id,
        });
      }
    });
  }, [dataCtx.expeditions, dispatchNotification]);

  // 5. PERSONNEL EVENT MONITOR (Personnel unavailable / rest cycle / medical caution)
  useEffect(() => {
    const personnelList = dataCtx.personnel;
    if (!personnelList || personnelList.length === 0) return;

    personnelList.forEach((person) => {
      const isRest =
        person.status === 'REST CYCLE' ||
        person.status === 'STANDBY SAR' ||
        person.status === 'UNAVAILABLE';
      const hasMedicalCaution = person.medicalFitness?.toLowerCase().includes('caution');

      if (hasMedicalCaution) {
        dispatchNotification({
          dedupKey: `NOTIF_PERS_MED_${person.id}`,
          title: `Medical Fitness Advisory: ${person.name}`,
          message: `${person.role} reported fitness state: ${person.medicalFitness}. Assigned to light duty.`,
          severity: 'WARNING',
          category: 'PERSONNEL',
          targetTab: 'personnel',
          targetId: person.id,
        });
      } else if (isRest) {
        dispatchNotification({
          dedupKey: `NOTIF_PERS_STATUS_${person.id}_${person.status}`,
          title: `Crew Status Update: ${person.name}`,
          message: `${person.name} (${person.role}) is currently on ${person.status}.`,
          severity: 'INFO',
          category: 'PERSONNEL',
          targetTab: 'personnel',
          targetId: person.id,
        });
      }
    });
  }, [dataCtx.personnel, dispatchNotification]);

  // 6. EMERGENCY EVENT MONITOR (SAR incidents created & unresolved)
  useEffect(() => {
    const emergencies = dataCtx.emergencyIncidents;
    if (!emergencies || emergencies.length === 0) return;

    emergencies.forEach((incident) => {
      if (incident.status === 'ACTIVE') {
        dispatchNotification({
          dedupKey: `NOTIF_EMERGENCY_${incident.id}_ACTIVE`,
          title: `🚨 Active Emergency Incident: ${incident.title}`,
          message:
            incident.situation ||
            incident.location ||
            'Critical search and rescue emergency active in polar sector.',
          severity: 'CRITICAL',
          category: 'EMERGENCY',
          targetTab: 'sos',
          targetId: incident.id,
        });
      }
    });
  }, [dataCtx.emergencyIncidents, dispatchNotification]);

  // 7. RESUPPLY EVENT MONITOR (Requisitions created & emergency approvals)
  useEffect(() => {
    const requests = dataCtx.resupplyRequests;
    if (!requests || requests.length === 0) return;

    requests.forEach((req) => {
      if (req.priority === 'EMERGENCY' && req.status === 'PENDING') {
        dispatchNotification({
          dedupKey: `NOTIF_RESUPPLY_REQ_APPROVAL_${req.id}`,
          title: `Emergency Requisition Awaiting Signoff`,
          message: `Priority order #${req.orderNumber || req.id} (${req.requestedQty} ${req.unit || 'units'} ${req.itemName}) requires commander authorization.`,
          severity: 'CRITICAL',
          category: 'RESUPPLY',
          targetTab: 'stock',
          targetId: req.id,
        });
      } else if (req.status === 'PENDING') {
        dispatchNotification({
          dedupKey: `NOTIF_RESUPPLY_CREATED_${req.id}`,
          title: `Resupply Requisition Logged: ${req.itemName}`,
          message: `Requisition order #${req.orderNumber || req.id} created for ${req.destination || 'Bharati Station'}.`,
          severity: 'INFO',
          category: 'RESUPPLY',
          targetTab: 'stock',
          targetId: req.id,
        });
      }
    });
  }, [dataCtx.resupplyRequests, dispatchNotification]);

  // Actions
  const markAsRead = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: now } : n))
      );

      try {
        await dbMarkAsRead(id, currentUid);
      } catch (e) {
        console.warn('Could not sync markAsRead to Firestore (offline cache updated):', e);
      }
    },
    [currentUid]
  );

  const markAllAsRead = useCallback(async () => {
    const now = new Date().toISOString();
    const currentList = [...notifications];
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: now }))
    );

    try {
      await dbMarkAllAsRead(currentList, currentUid);
    } catch (e) {
      console.warn('Could not sync markAllAsRead to Firestore (offline cache updated):', e);
    }
  }, [currentUid, notifications]);

  const deleteNotification = useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      try {
        await dbDeleteNotification(id);
      } catch (e) {
        console.warn('Could not delete notification from Firestore:', e);
      }
    },
    []
  );

  const clearAll = useCallback(async () => {
    const currentList = [...notifications];
    setNotifications([]);
    try {
      await dbClearAll(currentList);
    } catch (e) {
      console.warn('Could not clear notifications in Firestore:', e);
    }
  }, [notifications]);

  const addNotification = useCallback(
    async (
      notif: Partial<AppNotification> & { title: string; message: string }
    ) => {
      const id = notif.id || 'NOTIF-MANUAL-' + Date.now();
      const newNotif: AppNotification = {
        id,
        dedupKey: notif.dedupKey || id,
        title: notif.title,
        message: notif.message,
        timestamp: notif.timestamp || new Date().toISOString().substring(11, 16) + ' UTC',
        createdAt: notif.createdAt || new Date().toISOString(),
        severity: notif.severity || 'INFO',
        category: notif.category || 'SYSTEM',
        targetTab: notif.targetTab,
        targetId: notif.targetId,
        isRead: false,
        createdBy: currentUid,
        metadata: notif.metadata || {},
      };

      setNotifications((prev) => [newNotif, ...prev]);
      try {
        await createNotification(newNotif, currentUid);
      } catch (e) {
        console.warn('Could not write manual notification to Firestore:', e);
      }
    },
    [currentUid]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.isRead),
    [notifications]
  );
  const unreadCount = unreadNotifications.length;
  const criticalCount = useMemo(
    () =>
      notifications.filter(
        (n) => !n.isRead && n.severity === 'CRITICAL'
      ).length,
    [notifications]
  );

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    unreadNotifications,
    criticalCount,
    isLiveConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    addNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
};
