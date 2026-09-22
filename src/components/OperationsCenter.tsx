/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { OfflineRecord, StationKey } from '../types';
import { StationTileMap } from './StationTileMap';
import { LeafletOperationsMap } from './LeafletOperationsMap';
import { OfflineMapCache } from './OfflineMapCache';
import { AnimatedTelemetryValue, AnimatedProgressBar } from './AnimatedTelemetryValue';
import { useData } from '../context/DataContext';
import {
  createExpedition,
  createAsset,
  createCargo,
  createPersonnel,
  createEmergency,
  updateAlert,
  updateEmergency,
} from '../firebase/dbService';
import {
  Expedition,
  CargoAsset,
  PersonnelMember,
  AlertItem,
  SarIncident,
} from '../types';

export interface StationTelemetryState {
  temp: number;
  windSpeed: number;
  powerLoad: number;
  batteryReserve: number;
  pressure: number;
  activeExpeditions: number;
  fleetAssets: number;
  fleetReadiness: number;
  cargoInRoute: number;
  stationPax: number;
  fuelPercent: number;
  foodPercent: number;
  medicalPercent: number;
  sparesPercent: number;
  packetsReceived: number;
}

const STATION_BASELINES: Record<StationKey, StationTelemetryState> = {
  bharati: {
    temp: -28.4,
    windSpeed: 38.2,
    powerLoad: 146.5,
    batteryReserve: 92.4,
    pressure: 984.0,
    activeExpeditions: 3,
    fleetAssets: 48,
    fleetReadiness: 98.2,
    cargoInRoute: 12,
    stationPax: 32,
    fuelPercent: 72.0,
    foodPercent: 84.0,
    medicalPercent: 38.0,
    sparesPercent: 61.0,
    packetsReceived: 42890,
  },
  maitri: {
    temp: -34.8,
    windSpeed: 46.5,
    powerLoad: 118.2,
    batteryReserve: 79.1,
    pressure: 968.5,
    activeExpeditions: 2,
    fleetAssets: 34,
    fleetReadiness: 94.6,
    cargoInRoute: 8,
    stationPax: 18,
    fuelPercent: 22.0,
    foodPercent: 76.0,
    medicalPercent: 31.0,
    sparesPercent: 54.0,
    packetsReceived: 39420,
  },
  himadri: {
    temp: -14.2,
    windSpeed: 24.8,
    powerLoad: 86.4,
    batteryReserve: 96.8,
    pressure: 1008.2,
    activeExpeditions: 1,
    fleetAssets: 18,
    fleetReadiness: 99.1,
    cargoInRoute: 4,
    stationPax: 14,
    fuelPercent: 88.0,
    foodPercent: 92.0,
    medicalPercent: 64.0,
    sparesPercent: 78.0,
    packetsReceived: 28150,
  },
};

interface OperationsCenterProps {
  queue?: OfflineRecord[];
  offlineCount?: number;
  onAddQueueItem?: (type: OfflineRecord['type'], desc: string) => void;
  onSyncQueue?: () => void;
  onTriggerSync?: () => void;
  onResetQueue?: () => void;
  isSyncing?: boolean;
  syncProgress?: number;
  station?: StationKey;
  currentStation?: StationKey;
  onSelectStation?: (st: StationKey) => void;
  onOpenModal: (title: string, body: React.ReactNode, icon?: string) => void;
  onToast: (title: string, body: string, icon?: string, color?: 'green' | 'amber' | 'blue') => void;
  onNavigateTab?: (tab: any) => void;
  onNavigate?: (tab: any) => void;
  kidMode?: boolean;
}

export const OperationsCenter: React.FC<OperationsCenterProps> = ({
  queue = [],
  onAddQueueItem = (_type: OfflineRecord['type'], _desc: string) => {},
  onSyncQueue,
  onTriggerSync,
  onResetQueue = () => {},
  isSyncing = false,
  syncProgress = 0,
  station = 'bharati',
  currentStation,
  onSelectStation = (_st: StationKey) => {},
  onOpenModal,
  onToast,
  onNavigateTab,
  onNavigate,
  kidMode = true,
}) => {
  const effectiveQueue = queue || [];
  const effectiveStation = station || currentStation || 'bharati';
  const handleSync = onSyncQueue || onTriggerSync || (() => {});
  const handleNavigate = onNavigateTab || onNavigate || (() => {});
  const [mapViewMode, setMapViewMode] = useState<'leaflet' | 'tile' | 'offline_cache'>('leaflet');
  const [clock, setClock] = useState('');
  const [simSeconds, setSimSeconds] = useState(180);
  const [simRunning, setSimRunning] = useState(false);
  const [suppressedAlerts, setSuppressedAlerts] = useState<Record<string, boolean>>({});
  const [telemetry, setTelemetry] = useState<StationTelemetryState>(
    STATION_BASELINES[effectiveStation] || STATION_BASELINES.bharati
  );

  // Central Offline-First Data Store
  const dataCtx = useData();
  const expeditions = dataCtx.expeditions;
  const assets = dataCtx.assets;
  const cargo = dataCtx.cargo;
  const personnel = dataCtx.personnel;
  const alerts = dataCtx.alerts;
  const emergencies = dataCtx.emergencyIncidents;
  const isLiveConnected = dataCtx.isOnline && !dataCtx.isSimulatedOffline;

  // Real-time Loading & Error States
  const kpiLoading = {
    expeditions: !dataCtx.isInitialized,
    assets: !dataCtx.isInitialized,
    cargo: !dataCtx.isInitialized,
    personnel: !dataCtx.isInitialized,
    alerts: !dataCtx.isInitialized,
    emergencies: !dataCtx.isInitialized,
  };
  const firestoreError = null;

  // Quick Action Modal States for direct testing
  const [isQuickExpModalOpen, setIsQuickExpModalOpen] = useState(false);
  const [isQuickAssetModalOpen, setIsQuickAssetModalOpen] = useState(false);
  const [isQuickEmergencyModalOpen, setIsQuickEmergencyModalOpen] = useState(false);
  const [isSubmittingFirestore, setIsSubmittingFirestore] = useState(false);

  // Derived Real-Time Firestore KPIs
  // 1. Active Expeditions (expeditions collection)
  const activeExpeditionsCount = expeditions.filter((e) => {
    const s = (e.status || '').toLowerCase();
    return s === 'active' || s === 'planning' || s === 'in_progress';
  }).length;

  // 2. Assets in Operation (assets collection)
  const assetsInOperationCount = assets.filter((a) => {
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

  // 3. Cargo in Transit (cargo collection)
  const cargoInTransitCount = cargo.filter((c) => {
    const s = (c.status || '').toUpperCase();
    return (
      s === 'IN TRANSIT' ||
      s === 'IN_TRANSIT' ||
      s.includes('TRANSIT') ||
      s === 'DEPLOYED' ||
      !c.status
    );
  }).length;

  // 4. Personnel On Site (personnel collection)
  const personnelOnSiteCount = personnel.filter((p) => {
    const s = (p.status || '').toUpperCase();
    return s === 'ON_DUTY' || s === 'STANDBY' || s === 'FIELD' || s === 'ACTIVE' || !p.status;
  }).length;

  // 5. Critical Alerts (alerts + emergencies collections)
  const criticalAlertsList = alerts.filter((a) => {
    const sev = (a.severity || '').toUpperCase();
    const stat = (a.status || '').toUpperCase();
    return (
      (sev === 'CRITICAL' || sev === 'HIGH' || sev === 'EMERGENCY' || a.type === 'STOCK_DEFICIT' || a.type === 'INCIDENT') &&
      stat !== 'RESOLVED' &&
      stat !== 'SUPPRESSED' &&
      !suppressedAlerts[a.id]
    );
  });

  const activeEmergenciesList = emergencies.filter((e) => {
    const stat = (e.status || '').toUpperCase();
    return stat !== 'RESOLVED';
  });

  const unmirroredEmergencies = activeEmergenciesList.filter(
    (e) => !criticalAlertsList.some((a) => a.id.includes(e.id) || (a as any).emergencyId === e.id)
  );

  const criticalAlertsCount = criticalAlertsList.length + unmirroredEmergencies.length;

  // Synchronize telemetry baseline when active station changes
  useEffect(() => {
    const base = STATION_BASELINES[effectiveStation] || STATION_BASELINES.bharati;
    setTelemetry((prev) => (prev ? { ...base, ...prev } : base));
  }, [effectiveStation]);

  // Periodic life-like telemetry micro-updates
  useEffect(() => {
    const intervalMs = simRunning ? 1500 : 4500;
    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const current = prev || STATION_BASELINES[effectiveStation] || STATION_BASELINES.bharati;
        const tempShift = (Math.random() - 0.48) * 0.3;
        const windShift = (Math.random() - 0.48) * 0.8;
        const powerShift = (Math.random() - 0.48) * 0.6;
        const pressureShift = (Math.random() - 0.5) * 0.2;
        const packetsInc = Math.floor(1 + Math.random() * 3);

        return {
          ...current,
          temp: +(current.temp + tempShift).toFixed(1),
          windSpeed: Math.max(5, +(current.windSpeed + windShift).toFixed(1)),
          powerLoad: +(current.powerLoad + powerShift).toFixed(1),
          pressure: +(current.pressure + pressureShift).toFixed(1),
          packetsReceived: (current.packetsReceived || 0) + packetsInc,
        };
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [simRunning, effectiveStation]);

  const handleTriggerTelemetryPulse = () => {
    setTelemetry((prev) => {
      const current = prev || STATION_BASELINES[effectiveStation] || STATION_BASELINES.bharati;
      const tempDelta = (Math.random() - 0.48) * 0.8;
      const windDelta = (Math.random() - 0.48) * 2.2;
      const powerDelta = (Math.random() - 0.48) * 1.8;
      const pressureDelta = (Math.random() - 0.5) * 0.6;
      const batteryDelta = (Math.random() - 0.5) * 0.4;
      const packetsDelta = Math.floor(4 + Math.random() * 8);

      return {
        ...current,
        temp: +(current.temp + tempDelta).toFixed(1),
        windSpeed: Math.max(5, +(current.windSpeed + windDelta).toFixed(1)),
        powerLoad: +(current.powerLoad + powerDelta).toFixed(1),
        batteryReserve: Math.min(100, Math.max(20, +(current.batteryReserve + batteryDelta).toFixed(1))),
        pressure: +(current.pressure + pressureDelta).toFixed(1),
        packetsReceived: (current.packetsReceived || 0) + packetsDelta,
      };
    });
    onToast(
      'TELEMETRY BURST RECEIVED',
      `Live sensor stream refreshed for ${effectiveStation.toUpperCase()} Base.`,
      'sensors',
      'blue'
    );
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(
        `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(
          2,
          '0'
        )}:${String(now.getUTCSeconds()).padStart(2, '0')} UTC`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!simRunning) return;
    const interval = setInterval(() => {
      setSimSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSimRunning(false);
          onToast(
            'SIMULATION COMPLETED',
            '3-minute high-frequency sensor telemetry test has concluded.',
            'task_alt',
            'green'
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [simRunning, onToast]);

  const handleStartSim = () => {
    if (simRunning) return;
    setSimRunning(true);
    onToast(
      'SIMULATION INITIATED',
      '3-Minute High-Frequency Sensor Telemetry active for Bharati & Maitri.',
      'play_circle',
      'blue'
    );
  };

  const handleQuickDockAction = async (type: OfflineRecord['type']) => {
    const randId = Math.floor(1000 + Math.random() * 9000);
    let desc = '';

    if (type === 'ASSET') {
      const assetId = `POLAR-AX-${randId}`;
      desc = `Asset Scan: ${assetId} calibrated at Sector 3 Apron`;
      try {
        await dataCtx.createAsset({
          id: assetId,
          name: `Snowcat Telemetry Rig #${randId}`,
          category: 'Field Vehicle',
          status: 'OPERATIONAL',
          location: `${effectiveStation.toUpperCase()} Sector 3 Apron`,
          destStation: `${effectiveStation.toUpperCase()} Base`,
          mass: '820 kg',
          weightKg: 820,
          healthPercent: 98,
          lastTelemetry: 'Calibrated via Field Dock',
          expeditionId: 'INPEX-2026',
        });
        onToast('ASSET REGISTERED', `Asset ${assetId} stored in local IndexedDB ${dataCtx.isOnline && !dataCtx.isSimulatedOffline ? '& synced' : '(queued offline)'}`, 'commute', 'green');
      } catch (err: any) {
        console.warn('Asset creation error:', err);
      }
    } else if (type === 'INVENTORY') {
      desc = `Inventory Update: Consumed 500L Polar Diesel`;
      try {
        await dataCtx.consumeFuel(500);
        onToast('500L FUEL DRAWN', 'Fuel reduced by 500L in IndexedDB. Days remaining updated.', 'local_gas_station', 'blue');
      } catch (err: any) {
        console.warn('Inventory consumption error:', err);
      }
    } else if (type === 'PERSONNEL') {
      const persId = `PERS-${randId}`;
      const people = [
        'Dr. V. Nair',
        'Maj. S. Rawat',
        'Dr. Maya Sen',
        'Eng. T. Chander',
        'Tech. A. Sen',
      ];
      const p = people[Math.floor(Math.random() * people.length)];
      desc = `Personnel Check-in: ${p} logged entry at Bio-Lab Sub-vault`;
      try {
        await dataCtx.createPersonnel({
          id: persId,
          name: p,
          role: 'Field Scientist',
          station: effectiveStation,
          status: 'ON_DUTY',
          clearance: 'LEVEL-3 FIELD',
          medicalFitness: 'OPTIMAL (100%)',
          contact: `${p.toLowerCase().replace(/[^a-z]/g, '')}@ncpor.gov.in`,
          expeditionId: 'INPEX-2026',
        });
        onToast('PERSONNEL SAVED', `${p} checked in to local personnel database`, 'groups', 'green');
      } catch (err: any) {
        console.warn('Personnel creation error:', err);
      }
    } else if (type === 'CARGO') {
      const cargoId = `CARGO-POLAR-${randId}`;
      desc = `Cargo Staging: Emergency Resupply Pallet #${randId} loaded to Apron`;
      try {
        await dataCtx.createCargo({
          id: cargoId,
          name: `Emergency Resupply Pallet #${randId}`,
          category: 'Logistics / Life Support',
          status: 'IN TRANSIT',
          location: 'In Transit (Traverse Route 3)',
          carrier: 'S.A. Agulhas II Traverse Convoy',
          destination: `${effectiveStation.toUpperCase()} Base`,
          mass: '450 kg',
          weightKg: 450,
          expeditionId: 'INPEX-2026',
        });
        onToast('CARGO DISPATCHED', `${cargoId} saved to local cargo store`, 'local_shipping', 'green');
      } catch (err: any) {
        console.warn('Cargo creation error:', err);
      }
    } else if (type === 'EMERGENCY') {
      desc = `Emergency SITREP: Katabatic gale 54kt whiteout advisory`;
      try {
        await dataCtx.simulateEmergencyScenario();
        onToast('EMERGENCY SIMULATED', 'Medical Emergency created at Bharati Station. Stored locally.', 'crisis_alert', 'amber');
      } catch (err: any) {
        console.warn('Emergency simulation error:', err);
      }
    } else {
      desc = `Field Sample: Cryospheric ice core #C-${randId} logged locally`;
    }

    onAddQueueItem(type, desc);
  };

  // Direct Quick Test Handlers using DataContext
  const handleQuickCreateExpedition = async () => {
    setIsSubmittingFirestore(true);
    const randNum = Math.floor(100 + Math.random() * 900);
    const id = `EXP-EAST-${randNum}`;
    try {
      await dataCtx.createExpedition({
        id,
        name: `East Ice Shelf Traverse #${randNum}`,
        status: 'active',
        location: `${effectiveStation.toUpperCase()} Outer Sector`,
        coordinates: "-69°40'S, 76°19'E",
        discipline: 'Cryosphere Radar Profiling',
        objective: 'Sub-ice radar traverse and ambient acoustic sounding.',
        startDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        endDate: '30 Nov 2026',
        durationDays: 30,
        currentDay: 1,
        progressPercent: 5,
        commander: {
          name: 'Maj. Vikram Rawat',
          role: 'Field Commander',
          subordinatesCount: 12,
        },
        manifestSummary: '12 Crew • 4 Snowcats • 14 Tons Life Support',
      });
      onToast('EXPEDITION REGISTERED', `Created ${id} in local database. Active Expeditions KPI updated.`, 'explore', 'green');
    } catch (err: any) {
      console.error('Failed to create expedition:', err);
      onToast('ERROR', err?.message || 'Database write error', 'error', 'amber');
    } finally {
      setIsSubmittingFirestore(false);
    }
  };

  const handleQuickCreateAsset = async () => {
    setIsSubmittingFirestore(true);
    const randNum = Math.floor(100 + Math.random() * 900);
    const id = `ASSET-PB-${randNum}`;
    try {
      await dataCtx.createAsset({
        id,
        name: `PistenBully Polar 300 #${randNum}`,
        category: 'Heavy Snowcat',
        status: 'OPERATIONAL',
        location: `${effectiveStation.toUpperCase()} Apron`,
        destStation: `${effectiveStation.toUpperCase()} Base`,
        mass: '4,200 kg',
        weightKg: 4200,
        healthPercent: 99,
        lastTelemetry: 'Pre-flight verified',
        expeditionId: 'INPEX-2026',
      });
      onToast('ASSET DEPLOYED', `Saved ${id} to IndexedDB. Asset KPI updated.`, 'commute', 'green');
    } catch (err: any) {
      console.error('Failed to create asset:', err);
      onToast('ERROR', err?.message || 'Database write error', 'error', 'amber');
    } finally {
      setIsSubmittingFirestore(false);
    }
  };

  const handleQuickCreateEmergency = async () => {
    setIsSubmittingFirestore(true);
    try {
      await dataCtx.simulateEmergencyScenario();
      onToast('EMERGENCY LOGGED', 'Medical Emergency logged at Bharati Station (3 Personnel Affected). Critical Alerts KPI increased.', 'crisis_alert', 'amber');
    } catch (err: any) {
      console.error('Failed to create emergency:', err);
      onToast('ERROR', err?.message || 'Database write error', 'error', 'amber');
    } finally {
      setIsSubmittingFirestore(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      if (alertId.startsWith('ALERT-SAR-')) {
        const emId = alertId.replace('ALERT-', '');
        await dataCtx.resolveEmergencyIncident(emId, 'Resolved via Tactical Operations Center');
      }
      setSuppressedAlerts((prev) => ({ ...prev, [alertId]: true }));
      onToast('ALERT RESOLVED', `Alert ${alertId} marked resolved`, 'check_circle', 'green');
    } catch (err: any) {
      setSuppressedAlerts((prev) => ({ ...prev, [alertId]: true }));
      onToast('ALERT SUPPRESSED', `Suppressed locally`, 'visibility_off', 'blue');
    }
  };

  const pendingCount = effectiveQueue.filter((i) => i.status === 'PENDING SYNC').length;

  return (
    <div className="flex flex-col w-full space-y-4 pb-8">
      {/* Tactical Header & Simulation Ribbon */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest text-neutral-900 dark:text-[#a4c9ff]">
              TACTICAL COMMAND DECK • SIH26062
            </span>
            {isLiveConnected && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase font-bold ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                FIRESTORE LIVE
              </span>
            )}
          </div>
          <div className="font-mono text-[10px] sm:text-xs text-neutral-500 dark:text-[#c1c6d3] flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">update</span>
            <span>{clock || 'Syncing clock...'}</span>
          </div>
        </div>

        <div className="flex flex-col">
          <h1 className="font-headline text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc] tracking-tight">
            Polar Operations Center
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-[#c1c6d3]">
            Real-time expedition overview, multi-modal asset tracking, and offline synchronization
          </p>
        </div>

        {/* Metadata Tactical Strip */}
        <div className="bg-neutral-100 dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col gap-1 text-xs">
          <div className="flex items-center justify-between font-headline font-bold text-neutral-800 dark:text-[#d2e4fc]">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-neutral-900 dark:text-[#a4c9ff]">
                navigation
              </span>
              <span>
                {effectiveStation === 'himadri'
                  ? 'ARCTIC-2026 (Himadri Base, Ny-Ålesund)'
                  : effectiveStation === 'maitri'
                  ? 'INPEX-2026 (Maitri Base)'
                  : 'INPEX-2026 (Bharati Base)'}
              </span>
            </span>
            <span className="font-mono">
              {effectiveStation === 'himadri'
                ? '78.925°N, 11.922°E'
                : effectiveStation === 'maitri'
                ? '-70.766°S, 11.736°E'
                : '-69.407°S, 76.191°E'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 dark:text-[#c1c6d3]">
            <span>FEED: Polar-Sat Alpha L-Band Stream</span>
            <span className="font-bold text-neutral-800 dark:text-[#a4c9ff]">
              SIMULATED DATA · CACHED LOCAL-FIRST
            </span>
          </div>
        </div>

        {/* Live Polar Sensor Telemetry HUD with smooth value-transition animation */}
        <div className="bg-white dark:bg-[#071A2B] border border-neutral-200 dark:border-[#253648] p-3 rounded-xl shadow-sm space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="font-headline text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-[#d2e4fc] flex items-center gap-1.5">
                <span>{effectiveStation.toUpperCase()} SENSOR TELEMETRY FEED</span>
                <span className="hidden sm:inline-block text-neutral-300 dark:text-[#253648]">•</span>
                <span className="hidden sm:inline font-mono font-normal text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
                  PKT #<AnimatedTelemetryValue value={telemetry.packetsReceived} precision={0} showDelta pulseColor="blue" />
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">sensors</span>
                <span>STREAMING</span>
              </span>
              <button
                onClick={handleTriggerTelemetryPulse}
                title="Trigger simulated telemetry burst"
                className="bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-300 dark:border-[#253648] px-2.5 py-1 rounded-lg text-[11px] font-headline font-bold text-neutral-800 dark:text-[#d2e4fc] flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px] text-neutral-900 dark:text-[#a4c9ff]">
                  autorenew
                </span>
                <span>Pulse Telemetry</span>
              </button>
            </div>
          </div>

          {/* 5 Live Environmental & Operational Telemetry Gauges with Smooth Animated Values */}
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
            {/* Ambient Temperature */}
            <div className="bg-neutral-50 dark:bg-[#0a1d2e] border border-neutral-200 dark:border-[#253648] p-2 rounded-lg">
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase font-bold">
                <span>Ambient Temp</span>
                <span className="material-symbols-outlined text-[14px] text-blue-500">device_thermostat</span>
              </div>
              <div className="text-lg sm:text-xl font-telemetry-num font-black text-neutral-900 dark:text-[#d2e4fc] mt-0.5">
                <AnimatedTelemetryValue
                  value={telemetry?.temp ?? -28.4}
                  precision={1}
                  suffix="°C"
                  showDelta
                  pulseColor="blue"
                />
              </div>
              <span className="text-[9px] text-neutral-400 dark:text-[#8b919c] font-mono">
                {(telemetry?.temp ?? -28.4) < -30 ? 'Extreme Chill' : (telemetry?.temp ?? -28.4) < -20 ? 'Sub-Zero Ridge' : 'Polar Maritime'}
              </span>
            </div>

            {/* Wind Velocity */}
            <div className="bg-neutral-50 dark:bg-[#0a1d2e] border border-neutral-200 dark:border-[#253648] p-2 rounded-lg">
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase font-bold">
                <span>Wind Velocity</span>
                <span className="material-symbols-outlined text-[14px] text-amber-500">air</span>
              </div>
              <div className="text-lg sm:text-xl font-telemetry-num font-black text-neutral-900 dark:text-[#d2e4fc] mt-0.5">
                <AnimatedTelemetryValue
                  value={telemetry.windSpeed}
                  precision={1}
                  suffix=" kt"
                  showDelta
                  pulseColor="amber"
                />
              </div>
              <span className="text-[9px] text-neutral-400 dark:text-[#8b919c] font-mono">
                {telemetry.windSpeed >= 45 ? 'Katabatic Gale' : telemetry.windSpeed >= 30 ? 'Moderate Drift' : 'Light Breeze'}
              </span>
            </div>

            {/* Power Generator Load */}
            <div className="bg-neutral-50 dark:bg-[#0a1d2e] border border-neutral-200 dark:border-[#253648] p-2 rounded-lg">
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase font-bold">
                <span>Generator Load</span>
                <span className="material-symbols-outlined text-[14px] text-emerald-500">bolt</span>
              </div>
              <div className="text-lg sm:text-xl font-telemetry-num font-black text-neutral-900 dark:text-[#d2e4fc] mt-0.5">
                <AnimatedTelemetryValue
                  value={telemetry.powerLoad}
                  precision={1}
                  suffix=" kW"
                  showDelta
                  pulseColor="emerald"
                />
              </div>
              <span className="text-[9px] text-neutral-400 dark:text-[#8b919c] font-mono">
                {telemetry.powerLoad > 130 ? 'Dual Turbine Mode' : 'Single Turbine'}
              </span>
            </div>

            {/* Battery Reserve */}
            <div className="bg-neutral-50 dark:bg-[#0a1d2e] border border-neutral-200 dark:border-[#253648] p-2 rounded-lg">
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase font-bold">
                <span>UPS Battery Bus</span>
                <span className="material-symbols-outlined text-[14px] text-teal-500">battery_charging_full</span>
              </div>
              <div className="text-lg sm:text-xl font-telemetry-num font-black text-neutral-900 dark:text-[#d2e4fc] mt-0.5">
                <AnimatedTelemetryValue
                  value={telemetry.batteryReserve}
                  precision={1}
                  suffix="%"
                  showDelta
                  pulseColor="blue"
                />
              </div>
              <span className="text-[9px] text-neutral-400 dark:text-[#8b919c] font-mono">
                {telemetry.batteryReserve > 85 ? 'Nominal Buffer' : 'Auxiliary Staged'}
              </span>
            </div>

            {/* Barometric Pressure */}
            <div className="col-span-2 xs:col-span-1 bg-neutral-50 dark:bg-[#0a1d2e] border border-neutral-200 dark:border-[#253648] p-2 rounded-lg">
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase font-bold">
                <span>Barometric</span>
                <span className="material-symbols-outlined text-[14px] text-indigo-400">compress</span>
              </div>
              <div className="text-lg sm:text-xl font-telemetry-num font-black text-neutral-900 dark:text-[#d2e4fc] mt-0.5">
                <AnimatedTelemetryValue
                  value={telemetry.pressure}
                  precision={1}
                  suffix=" hPa"
                  showDelta
                  pulseColor="blue"
                />
              </div>
              <span className="text-[9px] text-neutral-400 dark:text-[#8b919c] font-mono">
                {telemetry.pressure < 975 ? 'Low Cell Inbound' : 'Stable Pressure'}
              </span>
            </div>
          </div>
        </div>

        {/* Offline Field Operations Quick Action Dock */}
        <div className="bg-white dark:bg-[#071A2B] border-2 border-neutral-900 dark:border-[#a4c9ff] p-3 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-neutral-900 dark:text-[#a4c9ff] text-[18px]">
                terminal
              </span>
              <span className="font-headline text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-[#d2e4fc]">
                Field Ops Offline Action Dock
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-[#0b5ea8]/40 text-neutral-800 dark:text-[#a4c9ff] font-mono text-[9px] font-bold uppercase border border-neutral-300 dark:border-[#a4c9ff]/30">
              LOCAL DOCK ACTIVE
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-[#c1c6d3]">
            Record transactions directly to local encrypted offline storage in real-time:
          </p>

          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
            <button
              onClick={() => handleQuickDockAction('ASSET')}
              className="bg-neutral-50 hover:bg-neutral-100 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-200 dark:border-[#253648] p-2 rounded-lg text-left flex flex-col gap-1 active:scale-95 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-[16px] text-neutral-800 dark:text-[#a4c9ff] group-hover:scale-110 transition-transform">
                  qr_code_scanner
                </span>
                <span className="text-[9px] font-mono font-bold text-neutral-400 dark:text-[#8b919c]">
                  +SCAN
                </span>
              </div>
              <span className="font-headline text-[11px] font-bold text-neutral-900 dark:text-[#d2e4fc] leading-tight">
                Scan Asset
              </span>
              <span className="text-[9px] text-neutral-500 dark:text-[#c1c6d3] truncate font-mono">
                POLAR-AX-1042
              </span>
            </button>

            <button
              onClick={() => handleQuickDockAction('INVENTORY')}
              className="bg-neutral-50 hover:bg-neutral-100 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-200 dark:border-[#253648] p-2 rounded-lg text-left flex flex-col gap-1 active:scale-95 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-[16px] text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                  local_gas_station
                </span>
                <span className="text-[9px] font-mono font-bold text-neutral-400 dark:text-[#8b919c]">
                  -120L
                </span>
              </div>
              <span className="font-headline text-[11px] font-bold text-neutral-900 dark:text-[#d2e4fc] leading-tight">
                Update Fuel
              </span>
              <span className="text-[9px] text-neutral-500 dark:text-[#c1c6d3] truncate font-mono">
                Diesel Draw
              </span>
            </button>

            <button
              onClick={() => handleQuickDockAction('PERSONNEL')}
              className="bg-neutral-50 hover:bg-neutral-100 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-200 dark:border-[#253648] p-2 rounded-lg text-left flex flex-col gap-1 active:scale-95 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-[16px] text-neutral-800 dark:text-[#a4c9ff] group-hover:scale-110 transition-transform">
                  badge
                </span>
                <span className="text-[9px] font-mono font-bold text-neutral-400 dark:text-[#8b919c]">
                  PAX
                </span>
              </div>
              <span className="font-headline text-[11px] font-bold text-neutral-900 dark:text-[#d2e4fc] leading-tight">
                Personnel
              </span>
              <span className="text-[9px] text-neutral-500 dark:text-[#c1c6d3] truncate font-mono">
                Bio-Lab Egress
              </span>
            </button>

            <button
              onClick={() => handleQuickDockAction('CARGO')}
              className="bg-neutral-50 hover:bg-neutral-100 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-200 dark:border-[#253648] p-2 rounded-lg text-left flex flex-col gap-1 active:scale-95 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-[16px] text-neutral-800 dark:text-[#a4c9ff] group-hover:scale-110 transition-transform">
                  inventory
                </span>
                <span className="text-[9px] font-mono font-bold text-neutral-400 dark:text-[#8b919c]">
                  PLT
                </span>
              </div>
              <span className="font-headline text-[11px] font-bold text-neutral-900 dark:text-[#d2e4fc] leading-tight">
                Cargo Staging
              </span>
              <span className="text-[9px] text-neutral-500 dark:text-[#c1c6d3] truncate font-mono">
                Pallet #8820
              </span>
            </button>

            <button
              onClick={() => handleQuickDockAction('EMERGENCY')}
              className="col-span-2 xs:col-span-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 border border-red-300 dark:border-red-800 p-2 rounded-lg text-left flex flex-col gap-1 active:scale-95 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-[16px] text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                  warning
                </span>
                <span className="text-[9px] font-mono font-bold text-red-600 dark:text-red-400">
                  SITREP
                </span>
              </div>
              <span className="font-headline text-[11px] font-bold text-red-700 dark:text-red-300 leading-tight">
                Emergency Log
              </span>
              <span className="text-[9px] text-red-600/80 dark:text-red-400/80 truncate font-mono">
                Whiteout Gust
              </span>
            </button>
          </div>
        </div>

        {/* 3-Minute Live Simulation Countdown Button */}
        <button
          onClick={handleStartSim}
          className="w-full relative overflow-hidden bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white py-3 px-4 rounded-xl font-headline text-xs sm:text-sm flex items-center justify-between shadow-md active:scale-[0.99] transition-all border border-neutral-800 dark:border-[#a4c9ff]/40"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-90" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
            </span>
            <span className="font-bold tracking-wider uppercase">
              ⚡ DEMO MODE: LIVE 3-MIN SIMULATION
            </span>
          </div>
          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-white text-black dark:bg-[#d2e4fc] dark:text-[#00315d]">
            {String(Math.floor(simSeconds / 60)).padStart(2, '0')}:
            {String(simSeconds % 60).padStart(2, '0')}
          </span>
        </button>
      </div>

      {/* Pending Synchronization Center */}
      <div
        id="syncCenterSection"
        className="bg-white dark:bg-[#0a1d2e] rounded-xl p-4 space-y-3 shadow-sm border border-neutral-200 dark:border-[#253648]"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-neutral-900 dark:text-[#a4c9ff] text-[22px]">
              sync_alt
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline text-sm font-black uppercase tracking-tight text-neutral-900 dark:text-[#d2e4fc]">
                  PENDING SYNCHRONIZATION
                </h3>
                <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-[#0f2132] text-neutral-800 dark:text-[#d2e4fc] font-mono text-[10px] font-bold border border-neutral-200 dark:border-[#253648]">
                  <AnimatedTelemetryValue value={pendingCount} precision={0} showDelta /> records
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-[#c1c6d3]">
                Simulated offline synchronization buffer stored in browser local storage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full xs:w-auto">
            <button
              onClick={() => handleQuickDockAction('CUSTOM')}
              className="flex-1 xs:flex-initial px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-300 dark:border-[#253648] text-xs font-headline font-bold text-neutral-800 dark:text-[#d2e4fc] flex items-center justify-center gap-1 active:scale-95"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span>+ Log Action</span>
            </button>
            <button
              onClick={onSyncQueue}
              disabled={isSyncing}
              className="flex-1 xs:flex-initial px-3 py-1.5 rounded-lg bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white text-xs font-headline font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-60 transition-all"
            >
              <span className={`material-symbols-outlined text-[15px] ${isSyncing ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{isSyncing ? 'Syncing...' : 'Sync All Records'}</span>
            </button>
          </div>
        </div>

        {/* Sync Progress Bar */}
        {isSyncing && (
          <div className="bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#a4c9ff]/40 rounded-lg p-2.5 space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-1.5 text-neutral-900 dark:text-[#d2e4fc]">
                <span className="material-symbols-outlined text-[16px] animate-spin text-neutral-900 dark:text-[#a4c9ff]">
                  refresh
                </span>
                <span>↻ Syncing records with NCPOR Central Relay (Goa)...</span>
              </span>
              <span className="font-mono text-neutral-900 dark:text-[#a4c9ff] font-bold">
                {syncProgress}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-[#253648] overflow-hidden">
              <div
                className="h-full bg-black dark:bg-[#a4c9ff] transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Offline Records Scrollable Queue List */}
        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
          {effectiveQueue.length === 0 ? (
            <div className="text-center py-6 text-neutral-500 dark:text-[#c1c6d3] text-xs bg-neutral-50 dark:bg-[#0f2132] rounded-lg">
              <span className="material-symbols-outlined text-[24px] text-neutral-800 dark:text-[#a4c9ff] mb-1">
                task_alt
              </span>
              <p className="font-bold text-neutral-900 dark:text-[#d2e4fc]">Queue Empty</p>
              <p className="text-[10px]">All local transactions synced with NCPOR central servers.</p>
            </div>
          ) : (
            effectiveQueue.map((item) => {
              const isSynced = item.status === 'SYNCHRONIZED';
              let badgeColor =
                'bg-neutral-100 dark:bg-[#0f2132] text-neutral-800 dark:text-[#d2e4fc] border-neutral-300 dark:border-[#253648]';
              if (item.type === 'EMERGENCY') {
                badgeColor = 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800';
              } else if (item.type === 'INVENTORY') {
                badgeColor = 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
              }

              return (
                <div
                  key={item.id}
                  className="bg-neutral-50 hover:bg-neutral-100 dark:bg-[#0f2132]/70 dark:hover:bg-[#0f2132] p-2.5 rounded-lg border border-neutral-200 dark:border-[#253648] flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border shrink-0 ${badgeColor}`}
                    >
                      {item.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-[#d2e4fc] truncate leading-tight">
                        {item.desc}
                      </p>
                      <p className="font-mono text-[9px] text-neutral-500 dark:text-[#c1c6d3] flex items-center gap-1">
                        <span>{item.time}</span>
                        <span>•</span>
                        <span>{item.id}</span>
                      </p>
                    </div>
                  </div>

                  {isSynced ? (
                    <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 shrink-0">
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      <span>SYNCED</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 shrink-0">
                      <span className="material-symbols-outlined text-[12px] animate-spin">
                        schedule
                      </span>
                      <span>PENDING</span>
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info & reset demo data */}
        <div className="flex items-center justify-between pt-1 border-t border-neutral-200 dark:border-[#253648] text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
          <span className="flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-[#a4c9ff]" />
            <span>STORAGE: localStorage['polarx_offline_queue']</span>
          </span>
          <button
            onClick={onResetQueue}
            className="text-red-600 dark:text-red-400 font-bold hover:underline flex items-center gap-0.5 uppercase tracking-wide"
          >
            <span className="material-symbols-outlined text-[13px]">restart_alt</span>
            <span>Seed 12 Demo Records</span>
          </button>
        </div>
      </div>

      {/* Firebase Error Advisory Banner */}
      {firestoreError && (
        <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-500 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-red-600 text-[24px] shrink-0">
              cloud_off
            </span>
            <div>
              <h4 className="font-headline text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wide">
                Firebase Firestore Query Advisory
              </h4>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5 leading-relaxed">
                {firestoreError}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              dataCtx.restoreConnectionAndSync();
            }}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-headline text-xs font-bold flex items-center gap-1 shrink-0 self-end sm:self-auto shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Firestore Real-Time KPI Sync Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-neutral-100 dark:bg-[#071A2B] p-2.5 rounded-xl border border-neutral-200 dark:border-[#253648]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-[11px] font-bold text-neutral-900 dark:text-[#d2e4fc]">
            FIRESTORE LIVE TELEMETRY
          </span>
          <span className="text-[10px] text-neutral-500 dark:text-[#c1c6d3] hidden sm:inline">
            • Real-time queries active (no full-page reloads)
          </span>
        </div>

        {/* Quick mutation buttons for immediate user testing */}
        <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
          <button
            onClick={handleQuickCreateExpedition}
            disabled={isSubmittingFirestore}
            title="Create new expedition in Firestore expeditions collection"
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0f2132] hover:bg-neutral-200 dark:hover:bg-[#1a2b3d] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc] text-[10px] font-headline font-bold flex items-center gap-1 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[13px] text-blue-600 dark:text-[#a4c9ff]">
              add_circle
            </span>
            <span>+ Expedition</span>
          </button>

          <button
            onClick={handleQuickCreateAsset}
            disabled={isSubmittingFirestore}
            title="Add new asset in Firestore assets collection"
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0f2132] hover:bg-neutral-200 dark:hover:bg-[#1a2b3d] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc] text-[10px] font-headline font-bold flex items-center gap-1 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[13px] text-emerald-600 dark:text-emerald-400">
              add_circle
            </span>
            <span>+ Asset</span>
          </button>

          <button
            onClick={handleQuickCreateEmergency}
            disabled={isSubmittingFirestore}
            title="Create emergency: emergencies → alerts collections"
            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-[10px] font-headline font-bold flex items-center gap-1 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[13px] text-red-600">crisis_alert</span>
            <span>⚡ Emergency</span>
          </button>
        </div>
      </div>

      {/* 5 Real Firestore KPI Metric Tiles with Smooth Dynamic Value Animations */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* KPI 1: Active Expeditions */}
        <div
          onClick={() => onNavigateTab('exped')}
          className="bg-white dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm cursor-pointer hover:border-black dark:hover:border-[#a4c9ff] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 dark:text-[#c1c6d3]">
              Active Expeditions
            </span>
            <span className="material-symbols-outlined text-[18px] text-neutral-900 dark:text-[#a4c9ff] group-hover:scale-110 transition-transform">
              explore
            </span>
          </div>

          <div className="my-1.5">
            {kpiLoading.expeditions ? (
              <div className="h-8 flex items-center">
                <div className="w-16 h-6 bg-neutral-200 dark:bg-[#1a2b3d] animate-pulse rounded" />
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc]">
                  <AnimatedTelemetryValue
                    value={activeExpeditionsCount}
                    precision={0}
                    padZeros={2}
                    showDelta
                    pulseColor="blue"
                  />
                </span>
                <span className="text-[10px] font-bold text-neutral-500 dark:text-[#c1c6d3]">
                  TEAMS
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-[#c1c6d3] pt-1 border-t border-neutral-100 dark:border-[#1a2b3d]">
            <span className="truncate">
              {kpiLoading.expeditions ? 'Querying...' : `${expeditions.length} in Firestore`}
            </span>
            <span className="font-mono text-[9px] font-bold text-blue-600 dark:text-[#a4c9ff]">
              LIVE
            </span>
          </div>
        </div>

        {/* KPI 2: Assets in Operation */}
        <div
          onClick={() => onNavigateTab('cargo')}
          className="bg-white dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm cursor-pointer hover:border-black dark:hover:border-[#a4c9ff] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 dark:text-[#c1c6d3]">
              Assets in Operation
            </span>
            <span className="material-symbols-outlined text-[18px] text-neutral-900 dark:text-[#a4c9ff] group-hover:scale-110 transition-transform">
              commute
            </span>
          </div>

          <div className="my-1.5">
            {kpiLoading.assets ? (
              <div className="h-8 flex items-center">
                <div className="w-16 h-6 bg-neutral-200 dark:bg-[#1a2b3d] animate-pulse rounded" />
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc]">
                  <AnimatedTelemetryValue
                    value={assetsInOperationCount}
                    precision={0}
                    showDelta
                    pulseColor="emerald"
                  />
                </span>
                <span className="text-[10px] font-bold text-neutral-500 dark:text-[#c1c6d3]">
                  DEPLOYED
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-[#c1c6d3] pt-1 border-t border-neutral-100 dark:border-[#1a2b3d]">
            <span className="truncate">
              {kpiLoading.assets ? 'Querying...' : `${assets.length} registered`}
            </span>
            <span className="font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
              LIVE
            </span>
          </div>
        </div>

        {/* KPI 3: Cargo in Transit */}
        <div
          onClick={() => onNavigateTab('cargo')}
          className="bg-white dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm cursor-pointer hover:border-black dark:hover:border-[#a4c9ff] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 dark:text-[#c1c6d3]">
              Cargo in Transit
            </span>
            <span className="material-symbols-outlined text-[18px] text-neutral-900 dark:text-[#a4c9ff] group-hover:scale-110 transition-transform">
              local_shipping
            </span>
          </div>

          <div className="my-1.5">
            {kpiLoading.cargo ? (
              <div className="h-8 flex items-center">
                <div className="w-16 h-6 bg-neutral-200 dark:bg-[#1a2b3d] animate-pulse rounded" />
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc]">
                  <AnimatedTelemetryValue
                    value={cargoInTransitCount}
                    precision={0}
                    padZeros={2}
                    showDelta
                    pulseColor="red"
                  />
                </span>
                <span className="text-[10px] font-bold text-neutral-500 dark:text-[#c1c6d3]">
                  UNITS
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-[#c1c6d3] pt-1 border-t border-neutral-100 dark:border-[#1a2b3d]">
            <span className="truncate">
              {kpiLoading.cargo ? 'Querying...' : `${cargo.length} manifest(s)`}
            </span>
            <span className="font-mono text-[9px] font-bold text-amber-600 dark:text-amber-400">
              LIVE
            </span>
          </div>
        </div>

        {/* KPI 4: Personnel On Site */}
        <div
          onClick={() => onNavigateTab('personnel')}
          className="bg-white dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm cursor-pointer hover:border-black dark:hover:border-[#a4c9ff] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 dark:text-[#c1c6d3]">
              Personnel On Site
            </span>
            <span className="material-symbols-outlined text-[18px] text-neutral-900 dark:text-[#a4c9ff] group-hover:scale-110 transition-transform">
              groups
            </span>
          </div>

          <div className="my-1.5">
            {kpiLoading.personnel ? (
              <div className="h-8 flex items-center">
                <div className="w-16 h-6 bg-neutral-200 dark:bg-[#1a2b3d] animate-pulse rounded" />
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc]">
                  <AnimatedTelemetryValue
                    value={personnelOnSiteCount}
                    precision={0}
                    showDelta
                    pulseColor="blue"
                  />
                </span>
                <span className="text-[10px] font-bold text-neutral-500 dark:text-[#c1c6d3]">
                  CREW
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-[#c1c6d3] pt-1 border-t border-neutral-100 dark:border-[#1a2b3d]">
            <span className="truncate">
              {kpiLoading.personnel ? 'Querying...' : `${personnel.length} rostered`}
            </span>
            <span className="font-mono text-[9px] font-bold text-blue-600 dark:text-[#a4c9ff]">
              LIVE
            </span>
          </div>
        </div>

        {/* KPI 5: Critical Alerts */}
        <div
          onClick={() => onNavigateTab('sar')}
          className="bg-white dark:bg-[#0a1d2e] p-3 rounded-xl border-2 border-red-500/40 dark:border-red-600/50 flex flex-col justify-between shadow-sm cursor-pointer hover:border-red-600 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-red-600 dark:text-red-400">
              Critical Alerts
            </span>
            <span className="material-symbols-outlined text-[18px] text-red-600 animate-pulse group-hover:scale-110 transition-transform">
              crisis_alert
            </span>
          </div>

          <div className="my-1.5">
            {kpiLoading.alerts || kpiLoading.emergencies ? (
              <div className="h-8 flex items-center">
                <div className="w-16 h-6 bg-red-200 dark:bg-red-950/60 animate-pulse rounded" />
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
                  <AnimatedTelemetryValue
                    value={criticalAlertsCount}
                    precision={0}
                    padZeros={2}
                    showDelta
                    pulseColor="red"
                  />
                </span>
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                  URGENT
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-[#c1c6d3] pt-1 border-t border-neutral-100 dark:border-[#1a2b3d]">
            <span className="truncate">
              {kpiLoading.alerts ? 'Querying...' : `${criticalAlertsList.length} alert(s)`}
            </span>
            <span className="font-mono text-[9px] font-bold text-red-600 dark:text-red-400">
              LIVE
            </span>
          </div>
        </div>
      </div>

      {/* Critical Alerts Strip - Purely Real Firestore Data */}
      <div className="flex flex-col space-y-2.5" id="alertsSection">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-red-600 text-[20px] animate-pulse">
              crisis_alert
            </span>
            <h2 className="font-headline text-sm font-black text-neutral-900 dark:text-[#d2e4fc]">
              Critical Alerts ({criticalAlertsCount} Urgent)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-[#c1c6d3]">
              FIRESTORE ALERTS COLLECTION
            </span>
          </div>
        </div>

        {/* Loading State for Alerts */}
        {(kpiLoading.alerts || kpiLoading.emergencies) && (
          <div className="bg-white dark:bg-[#0a1d2e] rounded-xl border border-neutral-200 dark:border-[#253648] p-4 flex items-center justify-center gap-2 text-xs text-neutral-500">
            <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
            <span>Querying active critical alerts from Cloud Firestore...</span>
          </div>
        )}

        {/* Empty State: Zero Critical Alerts */}
        {!(kpiLoading.alerts || kpiLoading.emergencies) && criticalAlertsCount === 0 && (
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-300 dark:border-emerald-800/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2 text-xs font-headline">
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                verified_user
              </span>
              <span>
                <strong>Zero Active Critical Alerts</strong> — All polar station subsystems nominal and operating within safety margins.
              </span>
            </div>
            <button
              onClick={handleQuickCreateEmergency}
              className="text-[11px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shrink-0 shadow-sm"
            >
              <span className="material-symbols-outlined text-[13px]">add_alert</span>
              <span>Test Alert Flow</span>
            </button>
          </div>
        )}

        {/* Active Real Alerts Rendered from Firestore alerts collection */}
        {criticalAlertsList.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-[#0a1d2e] rounded-xl border-l-4 border-red-600 border border-neutral-200 dark:border-[#253648] p-3 space-y-2 shadow-sm animate-in fade-in"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-mono text-[9px] uppercase font-bold shrink-0 border border-red-300 dark:border-red-800">
                  {item.severity || 'CRITICAL'}
                </span>
                <div>
                  <p className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc] leading-tight">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-[#c1c6d3]">
                    {(item as any).stationId ? `${(item as any).stationId} • ` : ''}
                    {item.description}
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] text-neutral-500 dark:text-[#c1c6d3] shrink-0 font-bold">
                {item.timestamp || 'Live'}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleResolveAlert(item.id)}
                className="flex-1 bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white py-1.5 rounded-lg text-xs font-headline font-bold flex items-center justify-center gap-1 shadow-sm transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[14px]">task_alt</span>
                <span>Acknowledge & Resolve</span>
              </button>
              <button
                onClick={() => {
                  setSuppressedAlerts((prev) => ({ ...prev, [item.id]: true }));
                  onToast('ALERT MUTED', `Muted ${item.title} locally`, 'notifications_off', 'blue');
                }}
                className="bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] py-1.5 px-3 rounded-lg border border-neutral-300 dark:border-[#253648] text-neutral-800 dark:text-[#d2e4fc] text-xs font-headline font-bold transition-colors"
              >
                Mute
              </button>
            </div>
          </div>
        ))}

        {/* Active Unmirrored Emergencies Rendered from Firestore emergencies collection */}
        {unmirroredEmergencies.map((em) => (
          <div
            key={em.id}
            className="bg-white dark:bg-[#0a1d2e] rounded-xl border-l-4 border-red-600 border border-neutral-200 dark:border-[#253648] p-3 space-y-2 shadow-sm animate-in fade-in"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-mono text-[9px] uppercase font-bold shrink-0 border border-red-300 dark:border-red-800">
                  {em.severity || 'EMERGENCY'}
                </span>
                <div>
                  <p className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc] leading-tight">
                    {em.title}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-[#c1c6d3]">
                    {em.location ? `${em.location} • ` : ''}
                    {em.situation}
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] text-neutral-500 dark:text-[#c1c6d3] shrink-0 font-bold">
                {em.reportedTime || 'Active'}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onNavigateTab('sar')}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-1.5 rounded-lg text-xs font-headline font-bold flex items-center justify-center gap-1 shadow-sm transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[14px]">crisis_alert</span>
                <span>Open Emergency Command Center</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Map Mode Selector Ribbon (Leaflet GIS Map vs 2D Tactical Grid vs Offline Cache Vault) */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-neutral-100 dark:bg-[#071A2B] p-2 rounded-xl border border-neutral-200 dark:border-[#253648]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setMapViewMode('leaflet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-headline font-bold flex items-center gap-1.5 transition-all ${
              mapViewMode === 'leaflet'
                ? 'bg-black text-white dark:bg-[#0b5ea8] shadow-sm'
                : 'bg-white dark:bg-[#0f2132] text-neutral-700 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white border border-neutral-200 dark:border-[#253648]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">map</span>
            <span>Interactive Leaflet GIS Map</span>
          </button>

          <button
            onClick={() => setMapViewMode('tile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-headline font-bold flex items-center gap-1.5 transition-all ${
              mapViewMode === 'tile'
                ? 'bg-black text-white dark:bg-[#0b5ea8] shadow-sm'
                : 'bg-white dark:bg-[#0f2132] text-neutral-700 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white border border-neutral-200 dark:border-[#253648]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">grid_view</span>
            <span>Tactical 2D Grid</span>
          </button>

          <button
            onClick={() => setMapViewMode('offline_cache')}
            className={`px-3 py-1.5 rounded-lg text-xs font-headline font-bold flex items-center gap-1.5 transition-all ${
              mapViewMode === 'offline_cache'
                ? 'bg-black text-white dark:bg-[#0b5ea8] shadow-sm'
                : 'bg-white dark:bg-[#0f2132] text-neutral-700 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white border border-neutral-200 dark:border-[#253648]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">download_for_offline</span>
            <span>{kidMode ? 'Offline Map Bag 🎒' : 'Offline Map Cache'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9.5px] font-mono font-bold">
              OFFLINE READY
            </span>
          </button>
        </div>

        <span className="text-[10.5px] font-mono text-neutral-500 dark:text-[#c1c6d3] hidden sm:inline">
          {mapViewMode === 'leaflet'
            ? 'Live GPS routes & offline cached tile rendering'
            : mapViewMode === 'tile'
            ? 'Matrix sensor grid'
            : 'Pre-downloaded map sectors for satellite blackout'}
        </span>
      </div>

      {/* Render selected map view mode */}
      {mapViewMode === 'offline_cache' ? (
        <OfflineMapCache
          currentStation={effectiveStation}
          kidMode={kidMode}
          onToast={onToast}
          onClose={() => setMapViewMode('leaflet')}
        />
      ) : mapViewMode === 'tile' ? (
        <StationTileMap
          currentStation={effectiveStation}
          onSelectStation={onSelectStation}
          onToast={onToast}
        />
      ) : (
        <LeafletOperationsMap
          currentStation={effectiveStation}
          onSelectStation={onSelectStation}
          onToast={onToast}
          kidMode={kidMode}
        />
      )}

      {/* Surface Ops Visual Verification Imagery */}
      <div className="flex flex-col space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-neutral-500 dark:text-[#c1c6d3] uppercase font-bold tracking-wider">
            Surface Ops Visual Verification
          </span>
          <span className="font-mono text-xs text-neutral-900 dark:text-[#a4c9ff] font-bold">
            CAM-01 / SECTOR 4
          </span>
        </div>
        <div className="relative w-full h-36 rounded-xl overflow-hidden border border-neutral-200 dark:border-[#253648] shadow-sm">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLusVnniIg6lihHt83LC4rr-S6tNtRqkR4fs8ZLIu26nDnVeGOAvY_d980GZZ-mVZIycpwwyLxhr3LGJ28e0qJN8vS2NCl_a4wsVkDWsBgoejD_-PhMuJRQzGXaVZMKFNNkg2xk4oMYSqB8j9E2xkfNMI6QYC_6jaVwxqJXEqx0TkHqa8WeWVxXg77afuffez9dbf75U0sySn0bZX5QC-cHdu8Irymd9QliMki1enQoKhZBQLgb6pykg"
            alt="Bharati Research Base Antarctica"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
            <div>
              <p className="font-headline text-xs text-white font-bold">
                Bharati Main Module & Apron
              </p>
              <p className="text-[10px] text-neutral-300">
                Katabatic blizzard warning tier-2 active
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-white text-black font-mono font-bold text-[9px] uppercase">
              LIVE REFRESH
            </span>
          </div>
        </div>
      </div>

      {/* Inventory Health Matrix with Animated Values and Transition Bars */}
      <div
        onClick={() => onNavigateTab('stock')}
        className="bg-white dark:bg-[#0a1d2e] rounded-xl border border-neutral-200 dark:border-[#253648] p-3.5 space-y-3 shadow-sm cursor-pointer hover:border-black dark:hover:border-[#a4c9ff] transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-neutral-900 dark:text-[#a4c9ff] text-[18px]">
              inventory_2
            </span>
            <h3 className="font-headline text-sm font-black text-neutral-900 dark:text-[#d2e4fc]">
              Inventory Health Matrix
            </h3>
          </div>
          <span className="font-mono text-xs text-neutral-900 dark:text-[#a4c9ff] font-extrabold bg-neutral-100 dark:bg-[#0f2132] px-2 py-0.5 rounded border border-neutral-200 dark:border-[#253648]">
            AGGREGATE{' '}
            <AnimatedTelemetryValue
              value={Math.round(
                (telemetry.fuelPercent +
                  telemetry.foodPercent +
                  telemetry.medicalPercent +
                  telemetry.sparesPercent) /
                  4
              )}
              precision={0}
              suffix="%"
              pulseColor="blue"
            />
          </span>
        </div>

        <div className="space-y-2">
          {/* Fuel */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-neutral-900 dark:text-[#d2e4fc]">
                Polar Grade Diesel (Fuel)
              </span>
              <span className="font-mono font-bold">
                <AnimatedTelemetryValue
                  value={telemetry.fuelPercent}
                  precision={1}
                  suffix="%"
                  showDelta
                  pulseColor={telemetry.fuelPercent < 30 ? 'red' : 'emerald'}
                />{' '}
                [{telemetry.fuelPercent < 30 ? 'CRITICAL' : telemetry.fuelPercent < 50 ? 'LOW' : 'NORMAL'}]
              </span>
            </div>
            <AnimatedProgressBar
              value={telemetry.fuelPercent}
              colorClass={
                telemetry.fuelPercent < 30
                  ? 'bg-red-600 dark:bg-red-500'
                  : 'bg-black dark:bg-[#a4c9ff]'
              }
            />
          </div>

          {/* Food */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-neutral-900 dark:text-[#d2e4fc]">
                Hydroponics & Dry Rations (Food)
              </span>
              <span className="font-mono font-bold">
                <AnimatedTelemetryValue
                  value={telemetry.foodPercent}
                  precision={1}
                  suffix="%"
                  showDelta
                  pulseColor="blue"
                />{' '}
                [{telemetry.foodPercent < 40 ? 'LOW' : 'OPTIMAL'}]
              </span>
            </div>
            <AnimatedProgressBar
              value={telemetry.foodPercent}
              colorClass="bg-neutral-700 dark:bg-blue-400"
            />
          </div>

          {/* Medicines */}
          <div className="space-y-1">
            <div
              className={`flex justify-between text-xs ${
                telemetry.medicalPercent < 40
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-neutral-900 dark:text-[#d2e4fc]'
              }`}
            >
              <span className="font-bold">Critical Medical & Antibiotics</span>
              <span className="font-mono font-bold">
                <AnimatedTelemetryValue
                  value={telemetry.medicalPercent}
                  precision={1}
                  suffix="%"
                  showDelta
                  pulseColor="red"
                />{' '}
                [{telemetry.medicalPercent < 40 ? 'WARNING - DUE' : 'STABLE'}]
              </span>
            </div>
            <AnimatedProgressBar
              value={telemetry.medicalPercent}
              colorClass={
                telemetry.medicalPercent < 40
                  ? 'bg-red-600 dark:bg-red-400'
                  : 'bg-emerald-600 dark:bg-emerald-400'
              }
            />
          </div>

          {/* Spares */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-neutral-900 dark:text-[#d2e4fc]">
                Snow-Cat & Generator Spares
              </span>
              <span className="font-mono font-bold">
                <AnimatedTelemetryValue
                  value={telemetry.sparesPercent}
                  precision={1}
                  suffix="%"
                  showDelta
                  pulseColor="blue"
                />{' '}
                [{telemetry.sparesPercent < 40 ? 'DEPLETED' : 'ADEQUATE'}]
              </span>
            </div>
            <AnimatedProgressBar
              value={telemetry.sparesPercent}
              colorClass="bg-neutral-600 dark:bg-teal-400"
            />
          </div>
        </div>
      </div>

      {/* AI Tactical Recommendation Card */}
      <div className="bg-neutral-50 dark:bg-[#071A2B] rounded-xl border border-neutral-200 dark:border-[#253648] p-3.5 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[20px]">
              psychology
            </span>
            <span className="font-headline text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
              AI RECOMMENDATION
            </span>
          </div>
          <span className="bg-white dark:bg-[#0f2132] border border-neutral-200 dark:border-[#253648] text-neutral-800 dark:text-[#d2e4fc] px-2 py-0.5 rounded font-mono text-[9px] font-bold">
            CONFIDENCE 94%
          </span>
        </div>

        <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-[#d2e4fc] leading-relaxed">
          Fuel consumption has increased by{' '}
          <span className="text-red-600 dark:text-red-400 font-extrabold">+18%</span> over the last
          7 days due to sustained katabatic blizzard conditions. Estimated station threshold:{' '}
          <span className="text-red-600 dark:text-red-400 font-extrabold">
            <AnimatedTelemetryValue
              value={Math.max(3, Math.round((telemetry.fuelPercent / 100) * 16))}
              precision={0}
              suffix=" days"
              pulseColor="red"
            />
          </span>
          .
        </p>

        <div className="bg-white dark:bg-[#0a1d2e] border border-neutral-200 dark:border-[#253648] p-2.5 rounded-lg text-xs">
          <p className="text-neutral-800 dark:text-[#d2e4fc]">
            <strong className="text-neutral-900 dark:text-white uppercase text-[10px]">
              Recommended Action:
            </strong>{' '}
            Schedule prioritized resupply of 2,400 L via Sector 3 tracked snow convoy before incoming
            gale window.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onNavigateTab('ai')}
            className="flex-1 bg-white hover:bg-neutral-100 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc] py-2 rounded-lg font-headline text-xs font-bold flex items-center justify-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">analytics</span>
            <span>View Analysis</span>
          </button>
          <button
            onClick={() => {
              onAddQueueItem('CARGO', 'Resupply Plan #RP-2400 created: Snowcat #03 & #04 scheduled');
              setTelemetry((prev) => ({
                ...prev,
                cargoInRoute: prev.cargoInRoute + 2,
                fuelPercent: Math.min(100, +(prev.fuelPercent + 14.5).toFixed(1)),
              }));
              onToast('RESUPPLY PLAN DRAFTED', '2,400 L polar diesel dispatched to queue', 'task_alt', 'green');
            }}
            className="flex-1 bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white py-2 rounded-lg font-headline text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[15px]">add_task</span>
            <span>Create Resupply Plan</span>
          </button>
        </div>
      </div>

      {/* Tactical Bottom Action Triggers */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          onClick={() =>
            onOpenModal(
              'Generating SITREP Packet',
              <div className="space-y-2 text-xs">
                <p>Compiling encrypted PDF expedition package with live station telemetry...</p>
                <div className="p-2.5 rounded bg-neutral-100 dark:bg-[#0f2132] font-mono text-[11px]">
                  Document: NCPOR_POLARX_SITREP_2026.pdf<br />
                  Station: Bharati Base (-69.407°S, 76.191°E)<br />
                  Pending Queue: {effectiveQueue.length} Records included
                </div>
              </div>,
              'download'
            )
          }
          className="bg-white hover:bg-neutral-50 dark:bg-[#0a1d2e] dark:hover:bg-[#0f2132] border border-neutral-200 dark:border-[#253648] p-3 rounded-xl flex items-center gap-2 text-left shadow-sm transition-colors"
        >
          <span className="material-symbols-outlined text-neutral-900 dark:text-[#a4c9ff] text-[20px]">
            download
          </span>
          <div>
            <p className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc]">
              Export SITREP
            </p>
            <p className="text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
              Daily packet PDF
            </p>
          </div>
        </button>

        <button
          onClick={() =>
            onOpenModal(
              'NCPOR Direct Satellite Circuit',
              <div className="space-y-2 text-xs">
                <p>
                  Direct satellite uplink circuit open with National Centre for Polar and Ocean
                  Research, Goa, India.
                </p>
                <div className="p-2.5 rounded bg-neutral-100 dark:bg-[#0f2132] font-mono text-[11px]">
                  Carrier: INMARSAT-C FleetBroadband<br />
                  Frequency: 412.55 MHz<br />
                  Node: Goa Crisis Desk Primary
                </div>
              </div>,
              'satellite'
            )
          }
          className="bg-white hover:bg-neutral-50 dark:bg-[#0a1d2e] dark:hover:bg-[#0f2132] border border-neutral-200 dark:border-[#253648] p-3 rounded-xl flex items-center gap-2 text-left shadow-sm transition-colors"
        >
          <span className="material-symbols-outlined text-neutral-900 dark:text-[#a4c9ff] text-[20px]">
            satellite
          </span>
          <div>
            <p className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc]">
              NCPOR Direct COM
            </p>
            <p className="text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
              Goa HQ Relay #2
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
