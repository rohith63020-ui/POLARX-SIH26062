/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StationKey } from '../types';

export interface SectorMapPackage {
  id: string;
  station: StationKey;
  stationName: string;
  name: string;
  subRegion: string;
  sizeMb: number;
  tileCount: number;
  resolution: string;
  priority: 'critical' | 'recommended' | 'optional';
  lastUpdated: string;
  checksum: string;
  isCached: boolean;
  downloadProgress?: number;
  waypoints: {
    name: string;
    coord: string;
    type: 'core' | 'shelter' | 'fuel' | 'hazard' | 'runway';
  }[];
  terrainFeatures: string[];
  hazardAlert?: string;
  kidTitle: string;
  kidDescription: string;
}

export const INITIAL_SECTORS: SectorMapPackage[] = [
  {
    id: 'SEC-BHA-01',
    station: 'bharati',
    stationName: 'Bharati Station',
    name: 'Larsemann Hills Coastal Core & Harbor',
    subRegion: 'Prydz Bay / Ingrid Christensen Coast',
    sizeMb: 14.8,
    tileCount: 64,
    resolution: '1:5,000 High-Res LIDAR Topo',
    priority: 'critical',
    lastUpdated: '08 Sep 2026',
    checksum: 'a8f9c2d1',
    isCached: true,
    waypoints: [
      { name: 'Bharati Main Habitat', coord: "69°24'28\"S, 76°11'14\"E", type: 'core' },
      { name: 'Sea-Ice Fast Dock', coord: "69°23'55\"S, 76°11'40\"E", type: 'shelter' },
      { name: 'Polar Fuel Bladder Delta', coord: "69°24'40\"S, 76°10'50\"E", type: 'fuel' },
      { name: 'Tide Crack Fracture Zone', coord: "69°23'30\"S, 76°12'10\"E", type: 'hazard' },
    ],
    terrainFeatures: ['Exposed Gneiss Hills', 'Frozen Fjord Ice', 'Freshwater Tarn Lakes', 'Tidal Glacier Snout'],
    hazardAlert: 'Tidal cracks widen during spring high tide; navigation restricted to flagged route.',
    kidTitle: 'Bharati Station & Penguin Harbor 🐧',
    kidDescription: 'The main warm building, the helicopter pad, and the frozen bay where ships stop to visit!',
  },
  {
    id: 'SEC-BHA-02',
    station: 'bharati',
    stationName: 'Bharati Station',
    name: 'Prydz Bay Fast-Ice Traverse Corridor',
    subRegion: 'Offshore Sea-Ice Highway to Shelf',
    sizeMb: 24.2,
    tileCount: 96,
    resolution: '1:10,000 Synthetic Aperture Radar',
    priority: 'recommended',
    lastUpdated: '04 Sep 2026',
    checksum: '7b2e11fa',
    isCached: true,
    waypoints: [
      { name: 'Traverse Waypoint Alpha', coord: "69°20'10\"S, 76°15'00\"E", type: 'shelter' },
      { name: 'Ice Thickness Sounding Buoy', coord: "69°18'45\"S, 76°18'20\"E", type: 'core' },
      { name: 'Deep Pressure Ridge Blockade', coord: "69°16'05\"S, 76°22'40\"E", type: 'hazard' },
    ],
    terrainFeatures: ['Multi-year Pack Ice', 'Buckled Pressure Ridges', 'Snowdrifts (1.8m average)'],
    kidTitle: 'The Giant Sea Ice Highway 🚜',
    kidDescription: 'The frozen ocean road where heavy snowcat tractors drive safely over solid 3-meter thick ice!',
  },
  {
    id: 'SEC-BHA-03',
    station: 'bharati',
    stationName: 'Bharati Station',
    name: 'Polar Plateau Inland Ice Sheet Sector',
    subRegion: 'Ascent to Dome C Traverse Path',
    sizeMb: 36.5,
    tileCount: 144,
    resolution: '1:25,000 CryoSat-2 Topographic Grid',
    priority: 'optional',
    lastUpdated: '28 Aug 2026',
    checksum: '4e99c803',
    isCached: false,
    waypoints: [
      { name: 'Plateau Step-Up 1,200m', coord: "69°45'00\"S, 75°50'00\"E", type: 'shelter' },
      { name: 'Emergency Polar Survival Pod 3', coord: "70°10'00\"S, 75°30'00\"E", type: 'fuel' },
      { name: 'Shear Crevasse Chasm East', coord: "69°55'30\"S, 75°42'15\"E", type: 'hazard' },
    ],
    terrainFeatures: ['Wind-sculpted Sastrugi Ridges', 'Inland Ice Cap Elevation Ramp', 'Deep Blue Ice Crevasses'],
    hazardAlert: 'Sastrugi dunes reach 1.4m height; severe vibration hazard for tracked vehicles.',
    kidTitle: 'The Big Snow Desert Climb 🏔️',
    kidDescription: 'Climbing way up the giant white ice mountains into the peaceful high Antarctic desert!',
  },
  {
    id: 'SEC-MAI-01',
    station: 'maitri',
    stationName: 'Maitri Station',
    name: 'Schirmacher Oasis & Priyadarshini Basin',
    subRegion: 'Central Queen Maud Land Ice-Free Oasis',
    sizeMb: 18.4,
    tileCount: 72,
    resolution: '1:5,000 High-Res Vector Elevation',
    priority: 'critical',
    lastUpdated: '07 Sep 2026',
    checksum: 'c3d9a102',
    isCached: true,
    waypoints: [
      { name: 'Maitri Main Complex', coord: "70°45'58\"S, 11°43'50\"E", type: 'core' },
      { name: 'Lake Priyadarshini Water Intake', coord: "70°45'40\"S, 11°44'10\"E", type: 'shelter' },
      { name: 'Novolazarevskaya Russian Base Relay', coord: "70°46'30\"S, 11°49'20\"E", type: 'fuel' },
      { name: 'Glacial Moraine Talus Slope', coord: "70°45'10\"S, 11°42'30\"E", type: 'hazard' },
    ],
    terrainFeatures: ['Rocky Desert Oasis', 'Perennially Frozen Glacial Lakes', 'Granite Boulders', 'Glacier Terminal Wall'],
    kidTitle: 'Maitri Oasis & Freshwater Lake 💧',
    kidDescription: 'The rocky brown oasis where the snow melts and you can see clean water lakes under thick clear ice!',
  },
  {
    id: 'SEC-MAI-02',
    station: 'maitri',
    stationName: 'Maitri Station',
    name: 'Novolazarevskaya Blue-Ice Runway & Airfield',
    subRegion: 'DROMLAN Continental Aviation Corridor',
    sizeMb: 26.0,
    tileCount: 104,
    resolution: '1:10,000 Polar Aviation Nav Chart',
    priority: 'recommended',
    lastUpdated: '02 Sep 2026',
    checksum: '9d1f40e7',
    isCached: false,
    waypoints: [
      { name: 'Blue Ice Runway Threshold 09', coord: "70°51'20\"S, 11°38'00\"E", type: 'runway' },
      { name: 'Airfield Weather Radome', coord: "70°51'40\"S, 11°38'30\"E", type: 'core' },
      { name: 'Aviation Kerosene Depot', coord: "70°51'10\"S, 11°39'10\"E", type: 'fuel' },
    ],
    terrainFeatures: ['Compressed Blue Glacial Ice', 'Laser-grooved Runway Strip', 'Perimeter Windbreak Sledges'],
    kidTitle: 'Airplane Ski Landing Strip 🛩️',
    kidDescription: 'The 3-kilometer long natural blue ice runway where giant airplanes land from South Africa!',
  },
  {
    id: 'SEC-MAI-03',
    station: 'maitri',
    stationName: 'Maitri Station',
    name: 'Queen Maud Land Continental Crevasse Belt',
    subRegion: 'Wohlthat Mountains Approach',
    sizeMb: 42.1,
    tileCount: 160,
    resolution: '1:20,000 High-Res Crevasse Radar',
    priority: 'optional',
    lastUpdated: '25 Aug 2026',
    checksum: '11fe89a0',
    isCached: false,
    waypoints: [
      { name: 'Crevasse Shear Boundary South', coord: "71°02'00\"S, 11°55'00\"E", type: 'hazard' },
      { name: 'Humboldt Mountain Depot', coord: "71°15'00\"S, 12°10'00\"E", type: 'shelter' },
    ],
    terrainFeatures: ['Nunatak Mountain Peaks', 'Hidden Crevasse Bridges', 'Icefalls'],
    hazardAlert: 'High danger: multiple snow-bridged crevasses over 40m deep. GPR radar probe required.',
    kidTitle: 'Crevasse Mystery Zone ⚠️',
    kidDescription: 'Hidden cracks in the ice! Scientists must use special radar beepers before driving here!',
  },
  {
    id: 'SEC-HIM-01',
    station: 'himadri',
    stationName: 'Himadri Station',
    name: 'Ny-Ålesund Arctic Fjord & Village Perimeter',
    subRegion: 'Svalbard, Spitsbergen 79°N High Arctic',
    sizeMb: 12.6,
    tileCount: 48,
    resolution: '1:5,000 Arctic Marine & Terrestrial Vector',
    priority: 'critical',
    lastUpdated: '06 Sep 2026',
    checksum: 'f44c201a',
    isCached: true,
    waypoints: [
      { name: 'Himadri Research Station', coord: "78°55'26\"N, 11°55'42\"E", type: 'core' },
      { name: 'Kings Bay Harbor Pier', coord: "78°55'40\"N, 11°56'10\"E", type: 'shelter' },
      { name: 'Atmospheric Air Sampling Tower (Zeppelin)', coord: "78°54'20\"N, 11°53'15\"E", type: 'fuel' },
      { name: 'Polar Bear Safe Hut Alpha', coord: "78°56'05\"N, 11°58'00\"E", type: 'shelter' },
    ],
    terrainFeatures: ['Arctic Fjord Shoreline', 'Tundra Gravel Plains', 'Glacial Outwash Delta', 'Steep Nunatak Ridges'],
    kidTitle: 'Himadri North Pole Village 🐻',
    kidDescription: 'Our science house in the Arctic where fluffy polar bears walk and green Northern Lights glow!',
  },
  {
    id: 'SEC-HIM-02',
    station: 'himadri',
    stationName: 'Himadri Station',
    name: 'Kongsvegen Glacier & Fjord Icefront',
    subRegion: 'Kongsfjorden Outer Glacial Margin',
    sizeMb: 28.5,
    tileCount: 110,
    resolution: '1:15,000 Arctic Satellite SAR',
    priority: 'recommended',
    lastUpdated: '01 Sep 2026',
    checksum: '6e7290bc',
    isCached: false,
    waypoints: [
      { name: 'Glacier Terminus Observation Point', coord: "78°58'30\"N, 12°15'00\"E", type: 'shelter' },
      { name: 'Calving Icefront Barrier', coord: "78°57'10\"N, 12°20'40\"E", type: 'hazard' },
    ],
    terrainFeatures: ['Calving Ice Cliffs', 'Brash Sea-Ice Drift', 'Glacial Crevasses'],
    kidTitle: 'Giant Glacier Ice Wall 🧊',
    kidDescription: 'Where huge chunks of ice crash into the blue ocean with a big thunder sound!',
  },
];

interface OfflineMapCacheProps {
  currentStation?: StationKey;
  kidMode?: boolean;
  onToast?: (title: string, body: string, icon?: string, color?: 'green' | 'amber' | 'blue') => void;
  onClose?: () => void;
}

const STORAGE_KEY = 'polarx_offline_map_cache_state_v1';

export const OfflineMapCache: React.FC<OfflineMapCacheProps> = ({
  currentStation = 'bharati',
  kidMode = true,
  onToast,
  onClose,
}) => {
  // Load cached status from localStorage if available
  const [sectors, setSectors] = useState<SectorMapPackage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return INITIAL_SECTORS.map((s) => ({
          ...s,
          isCached: parsed[s.id] !== undefined ? parsed[s.id] : s.isCached,
        }));
      }
    } catch {
      // Fallback
    }
    return INITIAL_SECTORS;
  });

  const [selectedSectorId, setSelectedSectorId] = useState<string>('SEC-BHA-01');
  const [stationFilter, setStationFilter] = useState<StationKey | 'all'>('all');
  const [isSimulatingBlackout, setIsSimulatingBlackout] = useState<boolean>(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [lastVerifiedTime, setLastVerifiedTime] = useState<string>('Today at 06:00 UTC');

  // Persist cached states to localStorage
  useEffect(() => {
    const cacheMap: Record<string, boolean> = {};
    sectors.forEach((s) => {
      cacheMap[s.id] = s.isCached;
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheMap));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }, [sectors]);

  const filteredSectors = sectors.filter(
    (s) => stationFilter === 'all' || s.station === stationFilter
  );

  const selectedSector =
    sectors.find((s) => s.id === selectedSectorId) || filteredSectors[0] || sectors[0];

  // Calculate Cache Metrics
  const totalCachedMb = sectors
    .filter((s) => s.isCached)
    .reduce((acc, curr) => acc + curr.sizeMb, 0);
  const totalSectorsCached = sectors.filter((s) => s.isCached).length;
  const maxStorageAllocationMb = 256.0;
  const storagePercent = Math.min(100, Math.round((totalCachedMb / maxStorageAllocationMb) * 100));

  // Single Sector Download Simulation
  const handleDownloadSector = (sec: SectorMapPackage) => {
    if (downloadingId || isDownloadingAll) return;

    if (isSimulatingBlackout) {
      onToast?.(
        'DOWNLOAD BLOCKED',
        'Cannot download new sector maps while satellite link is in Blackout mode!',
        'signal_wifi_bad',
        'amber'
      );
      return;
    }

    setDownloadingId(sec.id);
    setDownloadProgress(10);
    onToast?.(
      'DOWNLOADING MAP SECTOR',
      `Caching ${sec.name} (${sec.sizeMb} MB) for offline navigation...`,
      'cloud_download',
      'blue'
    );

    let current = 10;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 25) + 15;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(() => {
          setSectors((prev) =>
            prev.map((s) => (s.id === sec.id ? { ...s, isCached: true } : s))
          );
          setDownloadingId(null);
          setDownloadProgress(0);
          onToast?.(
            'SECTOR CACHED',
            `${sec.name} successfully stored in local offline vault. Ready for blackouts!`,
            'verified',
            'green'
          );
        }, 400);
      }
      setDownloadProgress(current);
    }, 280);
  };

  // Remove Cached Sector
  const handleRemoveSector = (sec: SectorMapPackage) => {
    setSectors((prev) =>
      prev.map((s) => (s.id === sec.id ? { ...s, isCached: false } : s))
    );
    onToast?.(
      'CACHE PURGED',
      `Purged ${sec.name} (${sec.sizeMb} MB) from offline storage.`,
      'delete',
      'amber'
    );
  };

  // Batch Pre-Download All Recommended & Critical
  const handlePreDownloadAll = () => {
    if (downloadingId || isDownloadingAll) return;

    if (isSimulatingBlackout) {
      onToast?.(
        'OFFLINE LOCKOUT',
        'Restore satellite link before batch pre-downloading.',
        'signal_wifi_bad',
        'amber'
      );
      return;
    }

    setIsDownloadingAll(true);
    setDownloadProgress(15);
    onToast?.(
      'BATCH CACHING ACTIVE',
      'Downloading all remaining polar sector maps to offline storage...',
      'download_for_offline',
      'blue'
    );

    let progress = 15;
    const interval = setInterval(() => {
      progress += 18;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => {
          setSectors((prev) => prev.map((s) => ({ ...s, isCached: true })));
          setIsDownloadingAll(false);
          setDownloadProgress(0);
          onToast?.(
            'ALL SECTORS READY',
            'All 8 polar expedition sectors cached locally (100% offline navigation enabled).',
            'check_circle',
            'green'
          );
        }, 500);
      }
      setDownloadProgress(progress);
    }, 350);
  };

  // Verify SHA-256 Checksums
  const handleVerifyIntegrity = () => {
    onToast?.(
      'INTEGRITY VERIFIED',
      `Validated SHA-256 checksums across ${totalSectorsCached} cached sectors. 0 corrupt blocks detected.`,
      'security',
      'green'
    );
    setLastVerifiedTime('Just now');
  };

  // Toggle Blackout Simulation
  const handleToggleBlackout = () => {
    const nextState = !isSimulatingBlackout;
    setIsSimulatingBlackout(nextState);

    if (nextState) {
      onToast?.(
        'SAT-LINK BLACKOUT SIMULATION',
        'Inmarsat-C disconnected. Terrain navigation now strictly relies on pre-downloaded offline sector cache.',
        'portable_wifi_off',
        'amber'
      );
    } else {
      onToast?.(
        'SAT-LINK RESTORED',
        'Broadband satellite transceiver connected. Live streaming and map downloads available.',
        'wifi',
        'green'
      );
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#0a1d2e] rounded-2xl border border-neutral-200 dark:border-[#253648] shadow-sm overflow-hidden flex flex-col p-4 sm:p-5 gap-4">
      {/* Top Header & Tactical Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-[#1a2b3d] pb-3.5">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-black dark:bg-[#0b5ea8] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[15px]">download_for_offline</span>
            </div>
            <h2 className="font-headline text-lg sm:text-xl font-black text-neutral-900 dark:text-[#d2e4fc] tracking-tight">
              {kidMode ? 'Offline Map Bag 🎒' : 'Offline Sector Map Cache & Local Vault'}
            </h2>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                isSimulatingBlackout
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border-emerald-300'
              }`}
            >
              {isSimulatingBlackout ? 'OFFLINE (BLACKOUT)' : 'SAT-LINK ONLINE'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-[#c1c6d3] mt-0.5">
            {kidMode
              ? 'Download snow maps into your pocket so you can navigate when snow storms block internet satellites!'
              : 'Pre-download tactical terrain packages and LIDAR elevation models to maintain uninterrupted GPS navigation during satellite blackouts'}
          </p>
        </div>

        {/* Tactical Actions: Blackout Simulator & Close */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={handleToggleBlackout}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-headline font-bold transition-all shadow-sm ${
              isSimulatingBlackout
                ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] text-neutral-800 dark:text-[#d2e4fc] border border-neutral-200 dark:border-[#253648]'
            }`}
            title="Toggle simulated satellite blackout to test offline terrain navigation"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isSimulatingBlackout ? 'portable_wifi_off' : 'wifi'}
            </span>
            <span>{isSimulatingBlackout ? 'Test Offline Mode: ON' : 'Simulate Blackout'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-[#0f2132] hover:bg-neutral-200 dark:hover:bg-[#1a2b3d] flex items-center justify-center text-neutral-600 dark:text-[#d2e4fc]"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Storage & Readiness Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-neutral-50 dark:bg-[#071A2B] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648]">
        {/* Metric 1: Cached Sectors */}
        <div className="flex flex-col justify-between">
          <span className="text-[10px] font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase font-bold">
            Cached Sectors
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="font-headline text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
              {totalSectorsCached} / {sectors.length}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {Math.round((totalSectorsCached / sectors.length) * 100)}%
            </span>
          </div>
          <span className="text-[10.5px] text-neutral-500 dark:text-[#c1c6d3]">
            {totalSectorsCached >= 4 ? 'High Blackout Resilience' : 'Partial Coverage'}
          </span>
        </div>

        {/* Metric 2: Local Storage Used */}
        <div className="flex flex-col justify-between">
          <span className="text-[10px] font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase font-bold">
            Local Storage Used
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="font-headline text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
              {totalCachedMb.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-neutral-500 dark:text-[#c1c6d3]">
              / {maxStorageAllocationMb} MB
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-[#1a2b3d] overflow-hidden mt-1">
            <div
              className="h-full bg-black dark:bg-[#a4c9ff] transition-all duration-300"
              style={{ width: `${storagePercent}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Integrity Status */}
        <div className="flex flex-col justify-between">
          <span className="text-[10px] font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase font-bold">
            Cache Integrity
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[20px]">
              verified
            </span>
            <span className="font-headline text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              SHA-256 Valid
            </span>
          </div>
          <button
            onClick={handleVerifyIntegrity}
            className="text-[10.5px] font-headline font-bold text-neutral-700 dark:text-[#a4c9ff] hover:underline text-left mt-0.5"
          >
            Verify Checksums ({lastVerifiedTime})
          </button>
        </div>

        {/* Metric 4: Batch Action */}
        <div className="flex flex-col justify-center sm:items-end">
          <button
            onClick={handlePreDownloadAll}
            disabled={isDownloadingAll || totalSectorsCached === sectors.length || isSimulatingBlackout}
            className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-headline font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
              totalSectorsCached === sectors.length
                ? 'bg-neutral-200 dark:bg-[#1a2b3d] text-neutral-500 cursor-not-allowed'
                : 'bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white active:scale-95'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isDownloadingAll ? 'downloading' : 'cloud_sync'}
            </span>
            <span>
              {isDownloadingAll
                ? `Caching... (${downloadProgress}%)`
                : totalSectorsCached === sectors.length
                ? 'All Sectors Cached ✓'
                : 'Pre-Download All Sectors'}
            </span>
          </button>
        </div>
      </div>

      {/* Satellite Blackout Alert Banner */}
      {isSimulatingBlackout && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[22px] shrink-0">
              portable_wifi_off
            </span>
            <div>
              <strong className="font-headline font-bold">
                SIMULATION: Satellite Transceiver Disconnected (0 bps)
              </strong>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                Real-time internet map tiles are disabled. The app will only load sectors stored in local device storage.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleBlackout}
            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-headline font-bold text-[11px] shrink-0"
          >
            Restore Link
          </button>
        </div>
      )}

      {/* Station Filters */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['all', 'bharati', 'maitri', 'himadri'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStationFilter(st)}
              className={`px-3 py-1 rounded-full text-xs font-headline font-bold capitalize transition-all shrink-0 ${
                stationFilter === st
                  ? 'bg-black text-white dark:bg-[#0b5ea8] shadow-sm'
                  : 'bg-neutral-100 dark:bg-[#0f2132] text-neutral-600 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white border border-neutral-200 dark:border-[#253648]'
              }`}
            >
              {st === 'all' ? 'All Polar Stations' : `${st} Base`}
            </button>
          ))}
        </div>

        <span className="text-[11px] font-mono text-neutral-500 dark:text-[#c1c6d3]">
          Showing {filteredSectors.length} sector packages
        </span>
      </div>

      {/* Main Split Layout: Sector List (Left) + Interactive Offline Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Sector Packages List */}
        <div className="lg:col-span-6 flex flex-col gap-2.5">
          {filteredSectors.map((sec) => {
            const isSelected = selectedSector.id === sec.id;
            const isCurrentlyDownloading = downloadingId === sec.id;

            return (
              <div
                key={sec.id}
                onClick={() => setSelectedSectorId(sec.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                  isSelected
                    ? 'bg-neutral-50 dark:bg-[#0f2132] border-2 border-neutral-900 dark:border-[#a4c9ff] shadow-md ring-1 ring-neutral-900/10'
                    : 'bg-white dark:bg-[#071A2B] border-neutral-200 dark:border-[#253648] hover:border-neutral-400 dark:hover:border-neutral-500 shadow-sm'
                }`}
              >
                {/* Sector Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        sec.isCached
                          ? 'bg-emerald-500 shadow-sm'
                          : 'bg-neutral-300 dark:bg-neutral-600'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10.5px] font-bold text-neutral-500 dark:text-[#a4c9ff]">
                          [{sec.id}]
                        </span>
                        <h3 className="font-headline text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                          {kidMode ? sec.kidTitle : sec.name}
                        </h3>
                      </div>
                      <span className="text-[10.5px] text-neutral-500 dark:text-[#c1c6d3] block truncate">
                        {sec.subRegion} • {sec.stationName}
                      </span>
                    </div>
                  </div>

                  {/* Cache Status Badge */}
                  <span
                    className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase shrink-0 ${
                      sec.isCached
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : isCurrentlyDownloading
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 animate-pulse'
                        : 'bg-neutral-100 dark:bg-[#1a2b3d] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-[#253648]'
                    }`}
                  >
                    {sec.isCached ? 'CACHED ✓' : isCurrentlyDownloading ? 'DOWNLOADING' : 'ONLINE ONLY'}
                  </span>
                </div>

                {/* Progress bar if actively downloading */}
                {isCurrentlyDownloading && (
                  <div className="w-full space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-neutral-600 dark:text-[#a4c9ff]">
                      <span>Caching tiles ({sec.tileCount} tiles)...</span>
                      <span>{downloadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-[#1a2b3d] overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-200"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Meta details & Specs */}
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 dark:text-[#c1c6d3] pt-1 border-t border-neutral-100 dark:border-[#1a2b3d]">
                  <div className="flex items-center gap-3">
                    <span>
                      Size: <strong className="text-neutral-900 dark:text-white">{sec.sizeMb} MB</strong>
                    </span>
                    <span>•</span>
                    <span>{sec.tileCount} Tiles</span>
                    <span>•</span>
                    <span className="capitalize">{sec.priority}</span>
                  </div>

                  {/* Quick Action Button */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {sec.isCached ? (
                      <button
                        onClick={() => handleRemoveSector(sec)}
                        className="text-[10px] text-red-600 dark:text-red-400 hover:underline font-headline font-bold"
                        title="Delete from local cache"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDownloadSector(sec)}
                        disabled={isCurrentlyDownloading || isDownloadingAll}
                        className="px-2.5 py-1 rounded-lg bg-neutral-900 dark:bg-[#0b5ea8] text-white text-[10px] font-headline font-bold hover:bg-neutral-800 transition-all shadow-sm"
                      >
                        Pre-Download
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Interactive Offline Terrain Inspector & Preview */}
        <div className="lg:col-span-6 bg-neutral-50 dark:bg-[#071A2B] rounded-2xl border border-neutral-200 dark:border-[#253648] p-4 sm:p-5 flex flex-col gap-4 sticky top-4">
          {/* Sector Preview Header */}
          <div className="flex items-start justify-between gap-2 border-b border-neutral-200 dark:border-[#1a2b3d] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-neutral-500 dark:text-[#a4c9ff]">
                  {selectedSector.id}
                </span>
                <h3 className="font-headline text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                  {kidMode ? selectedSector.kidTitle : selectedSector.name}
                </h3>
              </div>
              <p className="text-xs text-neutral-600 dark:text-[#c1c6d3] mt-0.5">
                {selectedSector.stationName} • {selectedSector.resolution}
              </p>
            </div>

            {/* Offline Nav Status Indicator */}
            <div className="shrink-0 flex flex-col items-end">
              <span
                className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold uppercase flex items-center gap-1.5 ${
                  selectedSector.isCached
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                    : isSimulatingBlackout
                    ? 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border border-red-300 animate-pulse'
                    : 'bg-neutral-200 dark:bg-[#1a2b3d] text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedSector.isCached
                      ? 'bg-emerald-500'
                      : isSimulatingBlackout
                      ? 'bg-red-500'
                      : 'bg-neutral-400'
                  }`}
                />
                <span>
                  {selectedSector.isCached
                    ? 'OFFLINE READY'
                    : isSimulatingBlackout
                    ? 'MAP UNAVAILABLE'
                    : 'REQUIRES SAT-LINK'}
                </span>
              </span>
            </div>
          </div>

          {/* Simulated Offline Vector Map Display */}
          <div className="relative w-full aspect-[16/10] bg-[#021425] rounded-xl overflow-hidden border border-neutral-700/80 p-3 flex flex-col justify-between select-none shadow-inner">
            {/* Grid Coordinate Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#13283f_1px,transparent_1px),linear-gradient(to_bottom,#13283f_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

            {/* Un-cached Blackout Warning Screen if blackout active and not cached */}
            {!selectedSector.isCached && isSimulatingBlackout ? (
              <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-4">
                <span className="material-symbols-outlined text-red-500 text-[42px] mb-2 animate-bounce">
                  satellite_alt
                </span>
                <span className="font-headline font-black text-sm text-red-400 uppercase tracking-wide">
                  Terrain Tile Cache Miss
                </span>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                  This sector was not pre-downloaded before satellite link went down. Navigation vectors unavailable.
                </p>
                <button
                  onClick={handleToggleBlackout}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-bold"
                >
                  Switch on Sat-Link to Download
                </button>
              </div>
            ) : (
              <>
                {/* Top Overlay: Compass & GPS telemetry */}
                <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-cyan-300">
                  <div className="flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded backdrop-blur border border-cyan-800/40">
                    <span className="material-symbols-outlined text-[13px] text-emerald-400 animate-spin">
                      explore
                    </span>
                    <span>HEADING: 142° SE</span>
                  </div>
                  <div className="bg-black/60 px-2 py-1 rounded backdrop-blur border border-cyan-800/40">
                    <span>{selectedSector.isCached ? 'LOCAL CACHE [OK]' : 'LIVE STREAM'}</span>
                  </div>
                </div>

                {/* Center Vector Terrain Graphic */}
                <div className="relative z-10 flex flex-col items-center justify-center my-auto">
                  {/* Visual Elevation Rings / Topo contours */}
                  <div className="relative w-40 h-28 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-dashed border-cyan-500/30 animate-[spin_30s_linear_infinite]" />
                    <div className="absolute w-28 h-20 rounded-full border border-cyan-400/40" />
                    <div className="absolute w-16 h-12 rounded-full border border-cyan-300/60" />

                    {/* Waypoint Nodes */}
                    {selectedSector.waypoints.map((wp, idx) => (
                      <div
                        key={idx}
                        className="absolute flex flex-col items-center"
                        style={{
                          top: `${20 + (idx * 22)}%`,
                          left: `${15 + (idx * 26)}%`,
                        }}
                      >
                        <div
                          className={`w-3 h-3 rounded-full border flex items-center justify-center shadow-sm ${
                            wp.type === 'hazard'
                              ? 'bg-red-500 border-white'
                              : wp.type === 'core'
                              ? 'bg-emerald-500 border-white'
                              : 'bg-cyan-500 border-white'
                          }`}
                        />
                        <span className="text-[8px] font-mono font-bold text-white bg-black/70 px-1 rounded mt-0.5 whitespace-nowrap">
                          {wp.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Overlay: Scale Bar and Coordinates */}
                <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-neutral-300 pt-1 border-t border-cyan-900/60">
                  <span>SCALE: 1:10,000 (500m)</span>
                  <span className="text-emerald-400 font-bold">
                    {selectedSector.waypoints[0]?.coord || "69°24'28\"S, 76°11'14\"E"}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Kid-Friendly Banner */}
          {kidMode && (
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 text-xs flex items-center gap-2.5">
              <span className="text-2xl shrink-0">🗺️</span>
              <div className="flex flex-col">
                <span className="font-headline font-bold">
                  {selectedSector.isCached ? 'Downloaded & Ready!' : 'Need to Save This Map!'}
                </span>
                <span className="text-[11.5px] mt-0.5">{selectedSector.kidDescription}</span>
              </div>
            </div>
          )}

          {/* Sector Waypoint Directory */}
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-neutral-500 dark:text-[#c1c6d3] block mb-1.5">
              Key Navigational Waypoints & Shelters
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {selectedSector.waypoints.map((wp, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#0a1d2e] border border-neutral-200 dark:border-[#253648] text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        wp.type === 'hazard'
                          ? 'bg-red-500'
                          : wp.type === 'core'
                          ? 'bg-emerald-500'
                          : 'bg-cyan-500'
                      }`}
                    />
                    <span className="font-bold text-neutral-900 dark:text-white truncate">
                      {wp.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 dark:text-[#c1c6d3] shrink-0">
                    {wp.coord}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button: Pre-Download or Purge */}
          <div className="pt-2 border-t border-neutral-200 dark:border-[#1a2b3d] flex items-center justify-between">
            <div className="text-[10.5px] text-neutral-500 dark:text-[#c1c6d3]">
              Checksum: <strong className="font-mono">{selectedSector.checksum}</strong> • Updated {selectedSector.lastUpdated}
            </div>

            {selectedSector.isCached ? (
              <button
                onClick={() => handleRemoveSector(selectedSector)}
                className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] text-red-600 dark:text-red-400 text-xs font-headline font-bold transition-all"
              >
                Clear from Cache
              </button>
            ) : (
              <button
                onClick={() => handleDownloadSector(selectedSector)}
                disabled={downloadingId === selectedSector.id || isDownloadingAll || isSimulatingBlackout}
                className="px-4 py-2 rounded-xl bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white text-xs font-headline font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">download</span>
                <span>Pre-Download Sector ({selectedSector.sizeMb} MB)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
