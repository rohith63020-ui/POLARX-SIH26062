/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { INITIAL_CARGO_ASSETS } from '../data/initialData';
import { CargoAsset } from '../types';
import { PolarLogo } from './PolarLogo';
import { AddCargoAssetModal, EditCargoAssetModal } from './Modals';
import { useData } from '../context/DataContext';

interface CargoIntelligenceProps {
  cargoList?: CargoAsset[];
  selectedAssetIdProp?: string | null;
  onOpenScanModal?: () => void;
  onOpenScanner?: () => void;
  onOpenAddModal?: () => void;
  onOpenAddAsset?: () => void;
  onOpenManifestModal?: () => void;
  onOpenModal?: (title: string, body: React.ReactNode, icon?: string) => void;
  onToast: (title: string, body: string, icon?: string, color?: 'green' | 'amber' | 'blue') => void;
}

export const CargoIntelligence: React.FC<CargoIntelligenceProps> = ({
  cargoList: propCargoList,
  selectedAssetIdProp,
  onOpenScanModal,
  onOpenScanner,
  onOpenAddModal,
  onOpenAddAsset,
  onOpenManifestModal,
  onOpenModal,
  onToast,
}) => {
  const dataCtx = useData();
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(selectedAssetIdProp || null);
  const [editingAsset, setEditingAsset] = useState<CargoAsset | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [waybillOpen, setWaybillOpen] = useState(true);

  React.useEffect(() => {
    if (selectedAssetIdProp) {
      setSelectedAssetId(selectedAssetIdProp);
    }
  }, [selectedAssetIdProp]);

  const isLiveConnected = dataCtx.isOnline && !dataCtx.isSimulatedOffline;

  // Merge assets and cargo from dataCtx
  const assets: CargoAsset[] = (() => {
    const listA = dataCtx.assets;
    const listC = dataCtx.cargo;
    if (listA.length === 0 && listC.length === 0) {
      return propCargoList && propCargoList.length > 0 ? propCargoList : INITIAL_CARGO_ASSETS;
    }
    const mergedMap = new Map<string, CargoAsset>();
    listA.forEach((a) => mergedMap.set(a.id, a));
    listC.forEach((c) => {
      if (!mergedMap.has(c.id)) {
        mergedMap.set(c.id, c);
      }
    });
    return Array.from(mergedMap.values());
  })();

  const handleScan = onOpenScanModal || onOpenScanner || (() => {});
  const handleManifest =
    onOpenManifestModal ||
    (() => {
      if (onOpenModal) {
        onOpenModal(
          'Master Multi-Modal Manifest',
          <div className="space-y-2 text-xs font-mono">
            <p className="font-bold text-neutral-900 dark:text-white">Active Cargo Manifest #NCPOR-MM-2608</p>
            <p>Vessel: S.A. Agulhas II | Voyage: CAPETOWN → PRYDZ BAY</p>
            <p>Total Payload: 12 TEU Containers | 86.4 Metric Tonnes</p>
          </div>,
          'inventory_2'
        );
      }
    });

  const [filter, setFilter] = useState<
    'all' | 'in_transit' | 'at_station' | 'deployed' | 'maintenance' | 'critical'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedAsset =
    (selectedAssetId ? assets.find((a) => a.id === selectedAssetId) : null) ||
    assets[0] ||
    null;

  const counts = {
    all: assets.length,
    in_transit: assets.filter((a) => a.status === 'IN TRANSIT').length,
    at_station: assets.filter((a) => a.status === 'AT STATION').length,
    deployed: assets.filter((a) => a.status === 'DEPLOYED').length,
    maintenance: assets.filter((a) => a.status === 'MAINTENANCE').length,
    critical: assets.filter((a) => (a.healthPercent ?? a.integrity ?? 100) < 80 || a.status === 'MAINTENANCE').length,
  };

  const handleQuickStatusChange = async (assetId: string, newStatus: CargoAsset['status']) => {
    try {
      await dataCtx.updateAsset(assetId, { status: newStatus });
      try {
        await dataCtx.updateCargo(assetId, { status: newStatus });
      } catch (_) {}
      onToast('STATUS UPDATED', `${assetId} status changed to ${newStatus}`, 'sync', 'green');
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to update status', 'error', 'amber');
    }
  };

  const handleSaveAssetUpdates = async (assetId: string, updates: Partial<CargoAsset>) => {
    try {
      await dataCtx.updateAsset(assetId, updates);
      try {
        await dataCtx.updateCargo(assetId, updates);
      } catch (_) {}
      onToast('ASSET UPDATED', `${assetId} saved locally`, 'inventory_2', 'green');
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to update asset', 'error', 'amber');
    }
  };

  const handleCreateAsset = async (newAsset: CargoAsset) => {
    try {
      await dataCtx.createAsset(newAsset);
      try {
        await dataCtx.createCargo(newAsset);
      } catch (_) {}
      setSelectedAssetId(newAsset.id);
      onToast('ASSET REGISTERED', `${newAsset.name} (${newAsset.id}) registered`, 'inventory_2', 'green');
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to register asset', 'error', 'amber');
    }
  };

  const filteredAssets = assets.filter((asset) => {
    let matchesFilter = true;
    if (filter === 'in_transit') matchesFilter = asset.status === 'IN TRANSIT';
    if (filter === 'at_station') matchesFilter = asset.status === 'AT STATION';
    if (filter === 'deployed') matchesFilter = asset.status === 'DEPLOYED';
    if (filter === 'maintenance') matchesFilter = asset.status === 'MAINTENANCE';
    if (filter === 'critical')
      matchesFilter =
        (asset.healthPercent ?? asset.integrity ?? 100) < 80 ||
        asset.status === 'MAINTENANCE';

    const matchesSearch =
      asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col w-full space-y-4 pb-8">
      {/* Header & Command Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <PolarLogo size="xs" />
          <span className="font-mono text-[10px] sm:text-xs text-neutral-900 dark:text-[#a4c9ff] uppercase tracking-widest font-bold">
            Multi-Modal Cargo Tracking • NCPOR
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
          <span className="text-[10px] sm:text-xs font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase">
            DECK-04
          </span>
          {isLiveConnected && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              FIRESTORE LIVE
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-headline text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc] tracking-tight">
              Cargo & Asset Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-[#c1c6d3]">
              End-to-end telemetry from port staging to polar basecamps
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleScan}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-300 dark:border-[#253648] text-xs font-headline font-bold text-neutral-900 dark:text-[#d2e4fc] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
              <span>Scan QR</span>
            </button>
            <button
              onClick={() => {
                if (onOpenAddModal) onOpenAddModal();
                else if (onOpenAddAsset) onOpenAddAsset();
                else setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white text-xs font-headline font-bold shadow-md transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>+ Register Asset</span>
            </button>
            <button
              onClick={handleManifest}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-300 dark:border-[#253648] text-xs font-headline font-bold text-neutral-900 dark:text-[#d2e4fc] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">description</span>
              <span>Manifest</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Tactical Filters */}
      <div className="flex flex-col gap-2.5 bg-neutral-100 dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648]">
        <div className="relative flex items-center w-full">
          <span className="material-symbols-outlined absolute left-3 text-neutral-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Asset ID, Vessel, Description or Destination..."
            className="w-full bg-white dark:bg-[#0f2132] text-neutral-900 dark:text-[#d2e4fc] text-xs pl-9 pr-14 py-2 rounded-lg border border-neutral-200 dark:border-[#253648] outline-none focus:border-black dark:focus:border-[#a4c9ff] transition-colors"
          />
          <span className="absolute right-2 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-[#071A2B] text-[9px] font-mono text-neutral-500 dark:text-[#c1c6d3]">
            ⌘K
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'in_transit', label: 'In Transit', count: counts.in_transit },
            { id: 'at_station', label: 'At Station', count: counts.at_station },
            { id: 'deployed', label: 'Deployed', count: counts.deployed },
            { id: 'maintenance', label: 'Maintenance', count: counts.maintenance },
            { id: 'critical', label: 'Critical', count: counts.critical, isCrit: true },
          ].map((pill) => {
            const isActive = filter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setFilter(pill.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-label font-bold shrink-0 flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? pill.isCrit
                      ? 'bg-red-600 text-white'
                      : 'bg-black text-white dark:bg-[#0b5ea8]'
                    : pill.isCrit
                    ? 'bg-white dark:bg-[#0f2132] text-red-600 border border-red-300 dark:border-red-900/60'
                    : 'bg-white dark:bg-[#0f2132] text-neutral-600 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white border border-neutral-200 dark:border-[#253648]'
                }`}
              >
                <span>{pill.label}</span>
                <span className="opacity-80 text-[10px] font-mono">({pill.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured Spotlight Card */}
      {selectedAsset && (
        <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl border-2 border-neutral-900 dark:border-[#a4c9ff]/60 shadow-xl overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 flex flex-col gap-3.5 bg-gradient-to-r from-neutral-50 via-white to-neutral-50 dark:from-[#0a1d2e] dark:via-[#0f2132] dark:to-[#0a1d2e]">
            {/* Top Bar with QR Code & Tag */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {/* Visual Tactical QR Code Vector Box */}
                <div
                  onClick={() =>
                    onToast('QR VERIFIED', `Encrypted token hash for ${selectedAsset.id} signed by NCPOR`, 'qr_code_2', 'blue')
                  }
                  className="w-16 h-16 rounded-xl bg-white p-1.5 border-2 border-black dark:border-[#a4c9ff] shadow-sm flex flex-col items-center justify-center shrink-0 cursor-pointer group"
                  title="Click to verify QR cryptographic token"
                >
                  <svg className="w-full h-full text-black" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v2h-4v-2zm-4 0h2v4h-2v-4zm2 4h4v2h-4v-2zm2-2h2v2h-2v-2zM5 5h2v2H5V5zm12 0h2v2h-2V5zM5 17h2v2H5v-2z" />
                  </svg>
                  <span className="text-[7px] font-mono font-bold text-neutral-800 -mt-0.5 group-hover:underline">
                    VERIFIED
                  </span>
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm sm:text-base font-black text-neutral-900 dark:text-[#d2e4fc]">
                      {selectedAsset.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase border ${
                        selectedAsset.status === 'IN TRANSIT'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                          : selectedAsset.status === 'DEPLOYED'
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-400 border-purple-300 dark:border-purple-800'
                          : selectedAsset.status === 'AT STATION'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {selectedAsset.status}
                    </span>
                  </div>
                  <h3 className="font-headline text-base sm:text-lg font-black text-neutral-900 dark:text-[#d2e4fc] truncate">
                    {selectedAsset.name}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-[#c1c6d3]">
                    Location: <span className="font-bold text-neutral-800 dark:text-[#d2e4fc]">{selectedAsset.location}</span> • Destination: {selectedAsset.destination || selectedAsset.destStation}
                  </p>
                </div>
              </div>

              {/* Integrity Metric Ring & Edit Action */}
              <div className="flex flex-col items-end shrink-0 gap-2">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-mono text-neutral-400 uppercase">Core Integrity</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-telemetry-num text-xl sm:text-2xl font-black text-neutral-900 dark:text-[#d2e4fc]">
                      {selectedAsset.healthPercent ?? selectedAsset.integrity ?? 100}%
                    </span>
                  </div>
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold font-mono">
                    {(selectedAsset.healthPercent ?? selectedAsset.integrity ?? 100) < 85 ? 'MODERATE ANOMALY' : 'OPTIMAL INTEGRITY'}
                  </span>
                </div>

                <button
                  onClick={() => setEditingAsset(selectedAsset)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white text-[11px] font-bold shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                  <span>Edit Asset</span>
                </button>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="flex items-center gap-2 pt-1 border-t border-neutral-200 dark:border-[#253648] flex-wrap">
              <span className="text-[11px] font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase font-bold">
                Change Status:
              </span>
              {(['IN TRANSIT', 'AT STATION', 'DEPLOYED', 'MAINTENANCE'] as const).map((st) => {
                const isCur = selectedAsset.status === st;
                return (
                  <button
                    key={st}
                    onClick={() => handleQuickStatusChange(selectedAsset.id, st)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                      isCur
                        ? 'bg-neutral-900 text-white dark:bg-[#a4c9ff] dark:text-[#00315c] shadow-sm'
                        : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] text-neutral-700 dark:text-[#d2e4fc] border border-neutral-200 dark:border-[#253648]'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>

            {/* Key Metadata Rows */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-neutral-100/70 dark:bg-[#0f2132] p-2.5 rounded-lg border border-neutral-200 dark:border-[#253648]">
                <span className="text-[9px] font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase block">
                  Serial & Model
                </span>
                <span className="font-mono font-bold text-neutral-900 dark:text-[#d2e4fc]">
                  {selectedAsset.serialNumber || 'SN-77291'}
                </span>
              </div>
              <div className="bg-neutral-100/70 dark:bg-[#0f2132] p-2.5 rounded-lg border border-neutral-200 dark:border-[#253648]">
                <span className="text-[9px] font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase block">
                  Weight & Class
                </span>
                <span className="font-mono font-bold text-neutral-900 dark:text-[#d2e4fc]">
                  {selectedAsset.weightKg ? `${selectedAsset.weightKg} kg` : selectedAsset.mass || '500 kg'}
                </span>
              </div>
              <div className="bg-neutral-100/70 dark:bg-[#0f2132] p-2.5 rounded-lg border border-neutral-200 dark:border-[#253648]">
                <span className="text-[9px] font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase block">
                  Carrier Vessel
                </span>
                <span className="font-semibold text-neutral-900 dark:text-[#d2e4fc]">
                  {selectedAsset.carrier ?? selectedAsset.vessel ?? 'S.A. Agulhas II'}
                </span>
              </div>
              <div className="bg-neutral-100/70 dark:bg-[#0f2132] p-2.5 rounded-lg border border-neutral-200 dark:border-[#253648]">
                <span className="text-[9px] font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase block">
                  Estimated Arrival
                </span>
                <span className="font-semibold text-neutral-900 dark:text-[#d2e4fc]">
                  {selectedAsset.eta || 'Scheduled'}
                </span>
              </div>
            </div>

            {/* Waybill Toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-neutral-500 dark:text-[#c1c6d3]">
                Multi-Modal Transit Milestones & Digital Paperless Waybill
              </span>
              <button
                onClick={() => setWaybillOpen(!waybillOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white text-xs font-headline font-bold transition-all shadow-sm"
              >
                <span>{waybillOpen ? 'Close Waybill' : 'Open Waybill'}</span>
                <span
                  className={`material-symbols-outlined text-[15px] transition-transform ${
                    waybillOpen ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>
            </div>
          </div>

          {/* Expanded Waybill Drawer */}
          {waybillOpen && (
            <div className="bg-neutral-50 dark:bg-[#071A2B] p-4 sm:p-5 border-t border-neutral-200 dark:border-[#253648] flex flex-col gap-4 animate-in fade-in duration-200">
              {/* 4-Stage Multi-Modal Timeline */}
              <div className="space-y-2">
                <span className="font-headline text-xs uppercase font-bold text-neutral-500 dark:text-[#c1c6d3] tracking-wider block">
                  Transit Progression Leg
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="bg-white dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                        LEG 1 • COMPLETED ✓
                      </span>
                      <h4 className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc] mt-0.5">
                        Goa Central Warehouse
                      </h4>
                      <p className="text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
                        NCPOR HQ Staging & Cryo Prep
                      </p>
                    </div>
                    <span className="text-[9px] font-mono text-neutral-400 mt-2">15 Jun 2026</span>
                  </div>

                  <div className="bg-white dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                        LEG 2 • COMPLETED ✓
                      </span>
                      <h4 className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc] mt-0.5">
                        Cape Town Harbor
                      </h4>
                      <p className="text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
                        Berth 54 Cold-Loading
                      </p>
                    </div>
                    <span className="text-[9px] font-mono text-neutral-400 mt-2">12 Jul 2026</span>
                  </div>

                  <div className="bg-neutral-100 dark:bg-[#0f2132] p-3 rounded-xl border-2 border-black dark:border-[#a4c9ff] flex flex-col justify-between shadow-sm">
                    <div>
                      <span className="text-[9px] font-mono text-neutral-900 dark:text-[#a4c9ff] font-bold uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-[#a4c9ff] animate-ping" />
                        LEG 3 • ACTIVE NOW ({selectedAsset.status})
                      </span>
                      <h4 className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc] mt-0.5">
                        {selectedAsset.carrier || 'S.A. Agulhas II Vessel'}
                      </h4>
                      <p className="text-[10px] text-neutral-600 dark:text-[#c1c6d3]">
                        {selectedAsset.location}
                      </p>
                    </div>
                    <span className="text-[9px] font-mono text-neutral-900 dark:text-[#a4c9ff] mt-2 font-bold">
                      ETA: {selectedAsset.eta || 'In Transit'}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between opacity-80">
                    <div>
                      <span className="text-[9px] font-mono text-neutral-400 uppercase font-bold">
                        LEG 4 • DESTINATION
                      </span>
                      <h4 className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc] mt-0.5">
                        {selectedAsset.destination || selectedAsset.destStation || 'Bharati Ice Shelf Apron'}
                      </h4>
                      <p className="text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
                        Tracked Snowcat Offloading
                      </p>
                    </div>
                    <span className="text-[9px] font-mono text-neutral-400 mt-2">Scheduled</span>
                  </div>
                </div>
              </div>

              {/* Paperless Manifest Documents */}
              <div className="space-y-2">
                <span className="font-headline text-xs uppercase font-bold text-neutral-500 dark:text-[#c1c6d3] tracking-wider block">
                  Verified Paperless Manifests & Customs Certs
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-white dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-red-600 text-[20px]">
                        picture_as_pdf
                      </span>
                      <div>
                        <span className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc] block">
                          Dangerous Goods Declaration.pdf
                        </span>
                        <span className="text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
                          Signed by Port Marshal • SHA-256 Verified
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        onToast('MANIFEST DOWNLOADED', 'Dangerous Goods Declaration cached locally', 'download', 'green')
                      }
                      className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#1a2b3d] text-neutral-700 dark:text-[#d2e4fc]"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                    </button>
                  </div>

                  <div className="bg-white dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-red-600 text-[20px]">
                        picture_as_pdf
                      </span>
                      <div>
                        <span className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc] block">
                          Customs Clearance CapeTown.pdf
                        </span>
                        <span className="text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
                          Antarctic Treaty Spec • Permit #8841-A
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        onToast('CUSTOMS CACHED', 'Customs Clearance Cape Town available offline', 'download', 'green')
                      }
                      className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#1a2b3d] text-neutral-700 dark:text-[#d2e4fc]"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Mission Assets List */}
      <div className="flex flex-col gap-2.5 pt-2">
        <div className="flex items-center justify-between">
          <span className="font-headline text-sm sm:text-base font-bold text-neutral-900 dark:text-[#d2e4fc]">
            Active Mission Assets ({filteredAssets.length})
          </span>
          <span className="text-[10px] font-mono font-bold text-neutral-500 dark:text-[#c1c6d3] uppercase">
            Click any asset to inspect or edit
          </span>
        </div>

        {filteredAssets.map((asset) => {
          const isSelected = selectedAsset?.id === asset.id;
          return (
            <div
              key={asset.id}
              onClick={() => {
                setSelectedAssetId(asset.id);
                setWaybillOpen(true);
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isSelected
                  ? 'bg-neutral-100 dark:bg-[#0f2132] border-2 border-black dark:border-[#a4c9ff] shadow-md'
                  : 'bg-white hover:bg-neutral-50 dark:bg-[#0a1d2e] dark:hover:bg-[#0f2132] border-neutral-200 dark:border-[#253648] shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-200 dark:border-[#253648] flex items-center justify-center text-neutral-800 dark:text-[#a4c9ff] shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    {asset.status === 'IN TRANSIT'
                      ? 'local_shipping'
                      : asset.status === 'DEPLOYED'
                      ? 'precision_manufacturing'
                      : 'inventory_2'}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-neutral-900 dark:text-[#d2e4fc]">
                      {asset.id}
                    </span>
                    <span
                      className={`px-2 py-0.2 rounded-full font-mono text-[9px] font-bold uppercase ${
                        asset.status === 'IN TRANSIT'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                          : asset.status === 'DEPLOYED'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400'
                          : asset.status === 'AT STATION'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                      }`}
                    >
                      {asset.status}
                    </span>
                  </div>
                  <h4 className="font-headline text-xs sm:text-sm font-bold text-neutral-900 dark:text-[#d2e4fc] truncate">
                    {asset.name}
                  </h4>
                  <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] truncate">
                    Location: <strong className="text-neutral-700 dark:text-[#d2e4fc]">{asset.location}</strong> • Carrier: {asset.carrier ?? asset.vessel ?? 'NCPOR Logistics'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 text-xs font-mono shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-[#253648]">
                <div className="text-left sm:text-right">
                  <span className="text-[9px] text-neutral-400 block uppercase">Weight</span>
                  <span className="font-bold text-neutral-800 dark:text-[#d2e4fc]">
                    {asset.weightKg ? `${asset.weightKg} kg` : asset.mass || '500 kg'}
                  </span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[9px] text-neutral-400 block uppercase">Integrity</span>
                  <span
                    className={`font-bold ${
                      (asset.healthPercent ?? asset.integrity ?? 100) < 80
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {asset.healthPercent ?? asset.integrity ?? 100}%
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingAsset(asset);
                  }}
                  className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-[#1a2b3d] text-neutral-600 dark:text-[#d2e4fc]"
                  title="Edit asset details in Firestore"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Internal Add Asset Modal */}
      {isAddModalOpen && (
        <AddCargoAssetModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddAsset={handleCreateAsset}
        />
      )}

      {/* Edit Asset Modal */}
      {editingAsset && (
        <EditCargoAssetModal
          isOpen={!!editingAsset}
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          onSave={handleSaveAssetUpdates}
        />
      )}
    </div>
  );
};

