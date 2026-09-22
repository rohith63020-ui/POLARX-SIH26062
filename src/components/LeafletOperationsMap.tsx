/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { StationKey, CargoAsset, Expedition } from '../types';
import { useData } from '../context/DataContext';

interface LeafletOperationsMapProps {
  currentStation: StationKey;
  onSelectStation?: (station: StationKey) => void;
  onToast?: (title: string, body: string, icon?: string, color?: 'green' | 'amber' | 'blue') => void;
  kidMode?: boolean;
}

interface StationGeoConfig {
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  region: string;
  description: string;
}

const STATION_MAP_CONFIGS: Record<StationKey, StationGeoConfig> = {
  bharati: {
    name: 'Bharati Base',
    lat: -69.4078,
    lng: 76.1872,
    zoom: 12,
    region: 'Larsemann Hills, Princess Elizabeth Land',
    description: '3rd Indian Antarctic Research Facility. Coastal fjord & fast-ice sea access.',
  },
  maitri: {
    name: 'Maitri Base',
    lat: -70.7658,
    lng: 11.7358,
    zoom: 12,
    region: 'Schirmacher Oasis, Queen Maud Land',
    description: '2nd Indian Antarctic Base. Rock oasis near Lake Priyadarshini & blue-ice airfield.',
  },
  himadri: {
    name: 'Himadri Base',
    lat: 78.925,
    lng: 11.9222,
    zoom: 12,
    region: 'Ny-Ålesund, Spitsbergen, Svalbard (Arctic)',
    description: 'Northernmost permanent research station. Kongsfjorden marine & atmospheric monitoring.',
  },
};

// Preset Expedition Routes with Waypoint Arrays
const PRESET_EXPEDITION_ROUTES = [
  {
    id: 'EXP-BHA-2026-01',
    station: 'bharati',
    name: 'Larsemann Coast Deep Ice Core Traverse',
    color: '#0b5ea8', // Dark Blue
    waypoints: [
      { name: 'Bharati Base Station', lat: -69.4078, lng: 76.1872 },
      { name: 'Prydz Bay Sea-Ice Fast Dock', lat: -69.395, lng: 76.195 },
      { name: 'Polar Fuel Bladder Delta', lat: -69.42, lng: 76.16 },
      { name: 'Plateau Step-Up Camp 1', lat: -69.445, lng: 76.12 },
      { name: 'Deep Glacial Ice Drilling site', lat: -69.47, lng: 76.08 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'EXP-MAI-2026-02',
    station: 'maitri',
    name: 'Schirmacher Oasis Hydrology & Blue-Ice Survey',
    color: '#d97706', // Amber
    waypoints: [
      { name: 'Maitri Main Complex', lat: -70.7658, lng: 11.7358 },
      { name: 'Lake Priyadarshini Station', lat: -70.76, lng: 11.745 },
      { name: 'Novolazarevskaya Runway Threshold', lat: -70.785, lng: 11.78 },
      { name: 'Glacial Moraine Field Camp', lat: -70.81, lng: 11.82 },
    ],
    status: 'IN_PROGRESS',
  },
  {
    id: 'EXP-HIM-2026-03',
    station: 'himadri',
    name: 'Kongsfjorden Glacier Marine Patrol',
    color: '#059669', // Emerald
    waypoints: [
      { name: 'Himadri Base Ny-Ålesund', lat: 78.925, lng: 11.9222 },
      { name: 'Bayelva Hydrostation Delta', lat: 78.932, lng: 11.85 },
      { name: 'Kongsfjorden Marine Research Buoy', lat: 78.945, lng: 11.98 },
      { name: 'Blomstrandhalvøya Marine Observatory', lat: 78.97, lng: 12.05 },
    ],
    status: 'ACTIVE',
  },
];

// Offline Tile Cache Database Name
const TILE_CACHE_NAME = 'polarx_leaflet_map_tiles_v1';

export const LeafletOperationsMap: React.FC<LeafletOperationsMapProps> = ({
  currentStation,
  onSelectStation,
  onToast,
  kidMode = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeLayer, setActiveLayer] = useState<'sat' | 'topo' | 'hazard'>('sat');
  const [cachedTilesCount, setCachedTilesCount] = useState<number>(0);
  const [isCaching, setIsCaching] = useState<boolean>(false);
  const [cacheProgress, setCacheProgress] = useState<number>(0);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(!navigator.onLine);

  const dataCtx = useData();
  const stationConfig = STATION_MAP_CONFIGS[currentStation] || STATION_MAP_CONFIGS.bharati;

  // Check cached tiles count in browser Cache Storage
  useEffect(() => {
    const updateCacheCount = async () => {
      try {
        if ('caches' in window) {
          const cache = await caches.open(TILE_CACHE_NAME);
          const keys = await cache.keys();
          setCachedTilesCount(keys.length);
        }
      } catch (e) {
        console.warn('[POLARX Map] Cache inspection warning:', e);
      }
    };

    updateCacheCount();

    const handleOnlineStatus = () => setIsOfflineMode(!navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if any
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    // Create new Leaflet Map instance
    const map = L.map(mapContainerRef.current, {
      center: [stationConfig.lat, stationConfig.lng],
      zoom: stationConfig.zoom,
      zoomControl: false,
      attributionControl: false,
    });

    leafletMapRef.current = map;

    // Add Zoom Control to Top-Right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Tile Layer Setup (Esri World Imagery or OpenStreetMap Topo)
    let tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    if (activeLayer === 'topo') {
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 18,
      minZoom: 3,
      subdomains: ['a', 'b', 'c'],
    });

    tileLayer.addTo(map);

    // Create Markers Layer Group
    const layerGroup = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = layerGroup;

    // Force map size recalculation for container sizing
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [currentStation, activeLayer]);

  // Update Markers, Expedition Routes, and Hazard Zones whenever data changes
  useEffect(() => {
    const map = leafletMapRef.current;
    const layerGroup = markersLayerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Plot Base Station Core Marker
    const stationIcon = L.divIcon({
      className: 'custom-station-pin',
      html: `
        <div style="background-color: #0b5ea8; color: white; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4); border-radius: 8px; padding: 4px 8px; font-weight: bold; font-size: 11px; font-family: monospace; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #38bdf8;"></span>
          <span>${stationConfig.name.toUpperCase()}</span>
        </div>
      `,
      iconSize: [140, 30],
      iconAnchor: [70, 15],
    });

    const stationMarker = L.marker([stationConfig.lat, stationConfig.lng], {
      icon: stationIcon,
    });
    stationMarker.bindPopup(`
      <div style="font-family: sans-serif; padding: 4px; min-width: 180px;">
        <h4 style="margin:0 0 4px 0; color:#0f172a; font-size: 14px; font-weight: bold;">${stationConfig.name}</h4>
        <p style="margin:0 0 6px 0; color:#475569; font-size: 11px;">${stationConfig.region}</p>
        <div style="font-family: monospace; font-size: 10px; background-color: #f1f5f9; padding: 4px 6px; border-radius: 4px;">
          Lat: ${stationConfig.lat.toFixed(4)}° | Lng: ${stationConfig.lng.toFixed(4)}°
        </div>
      </div>
    `);
    layerGroup.addLayer(stationMarker);

    // Station Radius Pulse Circle
    const stationCircle = L.circle([stationConfig.lat, stationConfig.lng], {
      color: '#38bdf8',
      fillColor: '#0b5ea8',
      fillOpacity: 0.15,
      radius: 4500, // 4.5km base radar radius
    });
    layerGroup.addLayer(stationCircle);

    // 2. Plot Real & Simulated Assets for Current Station
    const currentAssets = dataCtx.assets || [];
    currentAssets.forEach((asset, idx) => {
      // Calculate realistic latitude/longitude offset near station if not explicitly stored
      const latOffset = (idx % 2 === 0 ? 1 : -1) * (0.008 + (idx * 0.005) % 0.03);
      const lngOffset = (idx % 3 === 0 ? 1 : -1) * (0.012 + (idx * 0.007) % 0.04);
      const assetLat = stationConfig.lat + latOffset;
      const assetLng = stationConfig.lng + lngOffset;

      const health = asset.healthPercent ?? asset.integrity ?? 95;
      const isOperational = health > 60;
      const badgeBg = isOperational ? '#059669' : '#d97706';

      const assetIcon = L.divIcon({
        className: 'custom-asset-pin',
        html: `
          <div style="background-color: #0f172a; color: #a4c9ff; border: 1.5px solid ${badgeBg}; box-shadow: 0 2px 8px rgba(0,0,0,0.5); border-radius: 6px; padding: 3px 6px; font-size: 10px; font-family: monospace; font-weight: bold; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
            <span style="color: white; font-size: 9px; background-color: ${badgeBg}; padding: 1px 3px; border-radius: 3px;">${asset.id}</span>
            <span>${asset.name.length > 14 ? asset.name.substring(0, 14) + '…' : asset.name}</span>
          </div>
        `,
        iconSize: [130, 24],
        iconAnchor: [65, 12],
      });

      const assetMarker = L.marker([assetLat, assetLng], { icon: assetIcon });
      assetMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; min-width: 200px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-family:monospace; font-weight:bold; font-size:11px; color:#0b5ea8;">${asset.id}</span>
            <span style="background-color:${badgeBg}; color:white; font-size:9px; padding:2px 6px; border-radius:4px; font-weight:bold;">${asset.status || 'OPERATIONAL'}</span>
          </div>
          <h4 style="margin:0 0 4px 0; font-size:13px; font-weight:bold; color:#0f172a;">${asset.name}</h4>
          <p style="margin:0 0 6px 0; font-size:11px; color:#64748b;">Health: <strong>${health}%</strong> | Loc: ${asset.location || stationConfig.name}</p>
          <div style="font-family:monospace; font-size:10px; color:#334155; background-color:#f8fafc; padding:4px; border-radius:4px; border:1px solid #e2e8f0;">
            GPS: ${assetLat.toFixed(4)}°, ${assetLng.toFixed(4)}°
          </div>
        </div>
      `);
      layerGroup.addLayer(assetMarker);
    });

    // 3. Plot Expedition Routes & Waypoint Polylines
    const matchingRoutes = PRESET_EXPEDITION_ROUTES.filter((r) => r.station === currentStation);
    matchingRoutes.forEach((route) => {
      const latLngs = route.waypoints.map((wp) => [wp.lat, wp.lng] as [number, number]);

      // Route Polyline
      const polyline = L.polyline(latLngs, {
        color: route.color,
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
      });
      polyline.bindPopup(`
        <div style="font-family: sans-serif; padding:4px;">
          <strong style="color:${route.color}; font-size:12px;">${route.id}</strong>
          <p style="margin:2px 0; font-size:11px; font-weight:bold;">${route.name}</p>
          <p style="margin:0; font-size:10px; color:#64748b;">Waypoints: ${route.waypoints.length} sites</p>
        </div>
      `);
      layerGroup.addLayer(polyline);

      // Waypoint Dots along the route
      route.waypoints.forEach((wp, wpIdx) => {
        const wpMarker = L.circleMarker([wp.lat, wp.lng], {
          radius: wpIdx === 0 ? 6 : 4,
          color: route.color,
          fillColor: '#ffffff',
          fillOpacity: 1,
          weight: 2,
        });
        wpMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size:11px;">
            <strong>${wp.name}</strong>
            <br />
            <span style="font-family:monospace; color:#64748b;">${wp.lat.toFixed(4)}°, ${wp.lng.toFixed(4)}°</span>
          </div>
        `);
        layerGroup.addLayer(wpMarker);
      });
    });

    // 4. Hazard & Crevasse Overlay layer if active
    if (activeLayer === 'hazard') {
      const hazardCircle = L.circle([stationConfig.lat - 0.02, stationConfig.lng + 0.03], {
        color: '#ef4444',
        fillColor: '#dc2626',
        fillOpacity: 0.25,
        radius: 3200,
      });
      hazardCircle.bindPopup(`
        <div style="font-family: sans-serif; padding:4px;">
          <strong style="color:#dc2626; font-size:12px;">⚠️ CREVASSE SHEAR ZONE</strong>
          <p style="margin:2px 0 0 0; font-size:11px;">Active tidal crack expansion. Traverse restricted to flagged radar track.</p>
        </div>
      `);
      layerGroup.addLayer(hazardCircle);
    }
  }, [currentStation, activeLayer, dataCtx.assets, stationConfig]);

  // Pre-fetch and cache map tiles for offline usage
  const handleCacheMapSector = async () => {
    if (!('caches' in window)) {
      onToast?.('NOT SUPPORTED', 'Browser Cache Storage API not available.', 'error', 'amber');
      return;
    }

    setIsCaching(true);
    setCacheProgress(10);

    try {
      const cache = await caches.open(TILE_CACHE_NAME);
      const tilesToCache: string[] = [];

      // Generate tile URLs around station center for zooms 11, 12, 13
      const zoomLevels = [11, 12, 13];
      zoomLevels.forEach((z) => {
        const xCenter = Math.floor(((stationConfig.lng + 180) / 360) * Math.pow(2, z));
        const latRad = (stationConfig.lat * Math.PI) / 180;
        const yCenter = Math.floor(
          ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, z)
        );

        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            const tileX = xCenter + dx;
            const tileY = yCenter + dy;
            const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${tileY}/${tileX}`;
            tilesToCache.push(url);
          }
        }
      });

      let fetchedCount = 0;
      for (const url of tilesToCache) {
        try {
          const match = await cache.match(url);
          if (!match) {
            const resp = await fetch(url, { mode: 'cors' });
            if (resp.ok) {
              await cache.put(url, resp);
            }
          }
        } catch (e) {
          // Ignore individual tile fetch error in offline/CORS mode
        }
        fetchedCount++;
        setCacheProgress(Math.round((fetchedCount / tilesToCache.length) * 100));
      }

      const keys = await cache.keys();
      setCachedTilesCount(keys.length);

      onToast?.(
        'MAP SECTOR CACHED',
        `Successfully saved high-resolution map tiles for ${stationConfig.name} offline navigation.`,
        'download_for_offline',
        'green'
      );
    } catch (err: any) {
      console.error('Failed to cache map tiles:', err);
      onToast?.('CACHE ERROR', 'Partial tiles cached locally.', 'warning', 'amber');
    } finally {
      setIsCaching(false);
      setCacheProgress(100);
    }
  };

  return (
    <div className="flex flex-col w-full bg-white dark:bg-[#0a1d2e] rounded-xl border border-neutral-200 dark:border-[#253648] overflow-hidden shadow-sm">
      {/* Map Header & Station Switcher */}
      <div className="p-3 bg-neutral-100 dark:bg-[#071A2B] border-b border-neutral-200 dark:border-[#253648] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600 dark:text-[#a4c9ff] text-[20px]">
            map
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-headline text-sm font-black text-neutral-900 dark:text-[#d2e4fc] tracking-tight uppercase">
                {stationConfig.name} Interactive GIS Map
              </h3>
              {isOfflineMode ? (
                <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono text-[9px] font-bold border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  OFFLINE CACHED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono text-[9px] font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  SATELLITE LIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-[#c1c6d3]">
              {stationConfig.region} • {stationConfig.lat.toFixed(4)}°, {stationConfig.lng.toFixed(4)}°
            </p>
          </div>
        </div>

        {/* Station Selectors */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['bharati', 'maitri', 'himadri'] as StationKey[]).map((stKey) => {
            const isActive = currentStation === stKey;
            return (
              <button
                key={stKey}
                onClick={() => onSelectStation?.(stKey)}
                className={`px-2.5 py-1 rounded-lg text-xs font-headline font-bold capitalize transition-all shrink-0 ${
                  isActive
                    ? 'bg-black text-white dark:bg-[#0b5ea8] shadow-sm'
                    : 'bg-white dark:bg-[#0f2132] text-neutral-700 dark:text-[#c1c6d3] border border-neutral-300 dark:border-[#253648] hover:text-black dark:hover:text-white'
                }`}
              >
                {stKey}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Control Bar (Layers & Offline Cache Status) */}
      <div className="px-3 py-2 bg-neutral-50 dark:bg-[#0f2132]/60 border-b border-neutral-200 dark:border-[#253648] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-400 font-bold uppercase">Layer:</span>
          <button
            onClick={() => setActiveLayer('sat')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              activeLayer === 'sat'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-200 dark:bg-[#1a2b3d] text-neutral-700 dark:text-[#c1c6d3]'
            }`}
          >
            Satellite Imagery
          </button>
          <button
            onClick={() => setActiveLayer('topo')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              activeLayer === 'topo'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-200 dark:bg-[#1a2b3d] text-neutral-700 dark:text-[#c1c6d3]'
            }`}
          >
            Topographic Grid
          </button>
          <button
            onClick={() => setActiveLayer(activeLayer === 'hazard' ? 'sat' : 'hazard')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              activeLayer === 'hazard'
                ? 'bg-red-600 text-white'
                : 'bg-neutral-200 dark:bg-[#1a2b3d] text-neutral-700 dark:text-[#c1c6d3]'
            }`}
          >
            Hazard Zones ⚠️
          </button>
        </div>

        {/* Offline Cache Button */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
            Offline Tiles: <strong className="text-neutral-900 dark:text-white">{cachedTilesCount}</strong>
          </span>
          <button
            onClick={handleCacheMapSector}
            disabled={isCaching}
            className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-black dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white text-[10.5px] font-headline font-bold flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[13px] ${isCaching ? 'animate-spin' : ''}`}>
              download_for_offline
            </span>
            <span>{isCaching ? `Caching ${cacheProgress}%` : 'Cache Sector Map'}</span>
          </button>
        </div>
      </div>

      {/* Leaflet Map Canvas Container */}
      <div className="relative w-full h-[380px] sm:h-[460px] bg-neutral-900">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Map Legend Overlay */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-neutral-900/90 dark:bg-[#071828]/95 backdrop-blur-md border border-neutral-700/60 rounded-xl p-2.5 text-white shadow-xl max-w-[220px]">
          <div className="text-[10px] font-headline font-black uppercase tracking-wider text-blue-300 mb-1.5">
            {kidMode ? 'Map Explorer Keys 🧭' : 'GIS Map Legend'}
          </div>
          <div className="space-y-1 text-[10px] font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-blue-500 border border-white shrink-0" />
              <span>Base Station Core</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 border border-white shrink-0" />
              <span>Operational Assets</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-blue-400 border-dashed border-b border-blue-200 shrink-0" />
              <span>Expedition Route</span>
            </div>
            {activeLayer === 'hazard' && (
              <div className="flex items-center gap-2 text-red-400">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 opacity-80 shrink-0" />
                <span>Crevasse Shear Zone</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
