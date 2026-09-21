import React, { useState, useMemo } from 'react';
import { StationKey } from '../types';
import { AnimatedTelemetryValue } from './AnimatedTelemetryValue';

interface StationTileMapProps {
  currentStation: StationKey;
  onSelectStation?: (station: StationKey) => void;
  onToast?: (title: string, body: string, icon?: string, color?: 'green' | 'amber' | 'blue') => void;
}

interface TileData {
  col: number;
  row: number;
  id: string;
  type:
    | 'ice-sheet'
    | 'coastal-water'
    | 'rock-ridge'
    | 'crevasse'
    | 'station-core'
    | 'runway'
    | 'comms-mast'
    | 'lake'
    | 'convoy'
    | 'tundra';
  name: string;
  elevation: number;
  lat: string;
  lng: string;
  hazardLevel: 'low' | 'moderate' | 'high';
  isStationCore?: boolean;
  poiLabel?: string;
  poiIcon?: string;
}

interface StationMetadata {
  name: string;
  hindiName: string;
  region: string;
  exactLat: string;
  exactLng: string;
  decimalLat: number;
  decimalLng: number;
  elevationMeters: number;
  sectorCode: string;
  datum: string;
  climate: string;
  description: string;
  gridOriginLat: number;
  gridOriginLng: number;
  latStep: number;
  lngStep: number;
  coreCol: number;
  coreRow: number;
}

const STATION_CONFIGS: Record<StationKey, StationMetadata> = {
  bharati: {
    name: 'Bharati Station',
    hindiName: 'भारती अनुसंधान केंद्र',
    region: 'Larsemann Hills, Princess Elizabeth Land',
    exactLat: "69°24'28\"S",
    exactLng: "76°11'14\"E",
    decimalLat: -69.4078,
    decimalLng: 76.1872,
    elevationMeters: 35,
    sectorCode: 'GRID-BHA-76',
    datum: 'WGS-84 (Antarctic Polar)',
    climate: 'Coastal Polar (-28°C / 42kt Wind)',
    description: '3rd Indian Antarctic Research Facility. 32 PAX capacity with sea-ice harbor access.',
    gridOriginLat: -69.38,
    gridOriginLng: 76.12,
    latStep: -0.007,
    lngStep: 0.015,
    coreCol: 6,
    coreRow: 3,
  },
  maitri: {
    name: 'Maitri Station',
    hindiName: 'मैत्री अनुसंधान केंद्र',
    region: 'Schirmacher Oasis, Queen Maud Land',
    exactLat: "70°45'57\"S",
    exactLng: "11°44'09\"E",
    decimalLat: -70.7658,
    decimalLng: 11.7358,
    elevationMeters: 117,
    sectorCode: 'GRID-MAI-11',
    datum: 'WGS-84 (Inland Oasis)',
    climate: 'Inland Continental (-34°C / Katabatic 58kt)',
    description: '2nd Indian Antarctic Facility. Inland ice-sheet oasis adjacent to Lake Priyadarshini.',
    gridOriginLat: -70.74,
    gridOriginLng: 11.68,
    latStep: -0.008,
    lngStep: 0.016,
    coreCol: 5,
    coreRow: 3,
  },
  himadri: {
    name: 'Himadri Station',
    hindiName: 'हिमाद्रि अनुसंधान केंद्र',
    region: 'Ny-Ålesund, Spitsbergen, Svalbard (Arctic)',
    exactLat: "78°55'30\"N",
    exactLng: "11°55'20\"E",
    decimalLat: 78.925,
    decimalLng: 11.9222,
    elevationMeters: 12,
    sectorCode: 'GRID-HIM-78',
    datum: 'WGS-84 (Arctic Svalbard)',
    climate: 'High Arctic Maritime (-14°C / 26kt NW)',
    description: "India's permanent Arctic research base in the world's northernmost functional community.",
    gridOriginLat: 78.94,
    gridOriginLng: 11.86,
    latStep: -0.005,
    lngStep: 0.018,
    coreCol: 5,
    coreRow: 4,
  },
};

const COLS = 11;
const ROWS = 7;
const TILE_W = 54;
const TILE_H = 40;
const GAP = 3;
const SVG_PADDING_X = 52;
const SVG_PADDING_Y = 36;
const MAP_WIDTH = SVG_PADDING_X * 2 + COLS * (TILE_W + GAP) - GAP;
const MAP_HEIGHT = SVG_PADDING_Y * 2 + ROWS * (TILE_H + GAP) - GAP;

export const StationTileMap: React.FC<StationTileMapProps> = ({
  currentStation,
  onSelectStation,
  onToast,
}) => {
  const [selectedTile, setSelectedTile] = useState<TileData | null>(null);
  const [activeLayer, setActiveLayer] = useState<'standard' | 'hazards' | 'elevation'>('standard');
  const [isCopied, setIsCopied] = useState(false);

  const meta = STATION_CONFIGS[currentStation] || STATION_CONFIGS.bharati;

  // Generate tile matrix tailored to the selected station
  const tiles: TileData[] = useMemo(() => {
    const list: TileData[] = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const id = `tile-${c}-${r}`;
        const isCore = c === meta.coreCol && r === meta.coreRow;

        const tileLatNum = meta.gridOriginLat + r * meta.latStep;
        const tileLngNum = meta.gridOriginLng + c * meta.lngStep;
        const latFormatted = `${Math.abs(tileLatNum).toFixed(4)}°${tileLatNum >= 0 ? 'N' : 'S'}`;
        const lngFormatted = `${Math.abs(tileLngNum).toFixed(4)}°${tileLngNum >= 0 ? 'E' : 'W'}`;

        let type: TileData['type'] = 'ice-sheet';
        let name = 'Glacial Ice Sheet';
        let elevation = meta.elevationMeters;
        let hazardLevel: TileData['hazardLevel'] = 'low';
        let poiLabel: string | undefined;
        let poiIcon: string | undefined;

        if (currentStation === 'bharati') {
          // Bharati station in Larsemann Hills (coast on top/right, rock oasis in center)
          if (r === 0 || (r === 1 && c >= 7) || (r <= 2 && c >= 9)) {
            type = 'coastal-water';
            name = 'Prydz Bay / Iceberg Alley';
            elevation = 0;
            hazardLevel = 'low';
          } else if (isCore) {
            type = 'station-core';
            name = 'Bharati Main Base Complex';
            elevation = 35;
            poiLabel = 'HQ';
            poiIcon = 'domain';
          } else if (c === meta.coreCol + 1 && r === meta.coreRow) {
            type = 'comms-mast';
            name = 'S-Band Satellite Radome';
            elevation = 42;
            poiLabel = 'SAT';
            poiIcon = 'satellite_alt';
          } else if (c === meta.coreCol - 2 && r === meta.coreRow) {
            type = 'runway';
            name = 'Sea-Ice Skiway (Twin Otter Strip)';
            elevation = 15;
            poiLabel = 'STRIP';
            poiIcon = 'flight_takeoff';
          } else if (c === meta.coreCol && r === meta.coreRow + 1) {
            type = 'rock-ridge';
            name = 'Gneiss Outcrop / Nunatak Ridge';
            elevation = 68;
          } else if (c === 2 && r === 4) {
            type = 'convoy';
            name = 'Snow-Cat Piston Bully Trajectory';
            elevation = 38;
            poiLabel = 'CONVOY';
            poiIcon = 'navigation';
          } else if (r >= 5 && c <= 3) {
            type = 'crevasse';
            name = 'Quilty Bay Tidal Shear Crevasse';
            elevation = 18;
            hazardLevel = 'high';
            poiLabel = 'CRV';
            poiIcon = 'warning';
          } else if ((c + r) % 3 === 0) {
            type = 'rock-ridge';
            name = 'Larsemann Exposed Bedrock';
            elevation = 50 + (c + r) * 3;
          } else {
            type = 'ice-sheet';
            elevation = 25 + r * 4;
          }
        } else if (currentStation === 'maitri') {
          // Maitri in Schirmacher Oasis with Lake Priyadarshini
          if (isCore) {
            type = 'station-core';
            name = 'Maitri Habitat Dome & Fuel Reserve';
            elevation = 117;
            poiLabel = 'HQ';
            poiIcon = 'domain';
          } else if (c === meta.coreCol - 1 && r === meta.coreRow) {
            type = 'lake';
            name = 'Priyadarshini Fresh Water Lake';
            elevation = 112;
            hazardLevel = 'low';
            poiLabel = 'LAKE';
            poiIcon = 'water_drop';
          } else if (c === meta.coreCol + 2 && r === meta.coreRow - 1) {
            type = 'comms-mast';
            name = 'ISRO Telemetry & Tracking Mast';
            elevation = 142;
            poiLabel = 'ISRO';
            poiIcon = 'cell_tower';
          } else if (c === meta.coreCol && r === meta.coreRow - 2) {
            type = 'convoy';
            name = 'Novo Runway Overland Sledge Route';
            elevation = 125;
            poiLabel = 'CONVOY';
            poiIcon = 'local_shipping';
          } else if (r >= 5) {
            type = 'crevasse';
            name = 'Wohlthat Mountains Icefall Crevasses';
            elevation = 340 + c * 15;
            hazardLevel = 'high';
            poiLabel = 'SHEAR';
            poiIcon = 'warning';
          } else if (r <= 1) {
            type = 'ice-sheet';
            name = 'Antarctic Continental Ice Sheet';
            elevation = 180;
          } else {
            type = 'rock-ridge';
            name = 'Schirmacher Schist / Gneiss Plateau';
            elevation = 130 + (c - r) * 6;
          }
        } else {
          // Himadri in Ny-Ålesund, Svalbard (Arctic fjord & tundra)
          if (r >= 5 || (r >= 4 && c <= 2)) {
            type = 'coastal-water';
            name = 'Kongsfjorden Fjord Waters';
            elevation = 0;
          } else if (isCore) {
            type = 'station-core';
            name = 'Himadri Arctic Research Base';
            elevation = 12;
            poiLabel = 'HQ';
            poiIcon = 'home_work';
          } else if (c === meta.coreCol + 2 && r === meta.coreRow) {
            type = 'comms-mast';
            name = 'Zeppelin Atmospheric Observatory';
            elevation = 472;
            poiLabel = 'ZEPP';
            poiIcon = 'wb_twilight';
          } else if (c === meta.coreCol - 1 && r === meta.coreRow) {
            type = 'runway';
            name = 'Ny-Ålesund Hamnerabben Airstrip';
            elevation = 18;
            poiLabel = 'STRIP';
            poiIcon = 'flight_takeoff';
          } else if (c <= 2 && r <= 2) {
            type = 'crevasse';
            name = 'Blomstrandbreen Glacier Icefront';
            elevation = 85;
            hazardLevel = 'high';
            poiLabel = 'GLACIER';
            poiIcon = 'ac_unit';
          } else {
            type = 'tundra';
            name = 'Permafrost Arctic Tundra & Moraine';
            elevation = 20 + r * 12;
          }
        }

        list.push({
          col: c,
          row: r,
          id,
          type,
          name,
          elevation,
          lat: latFormatted,
          lng: lngFormatted,
          hazardLevel,
          isStationCore: isCore,
          poiLabel,
          poiIcon,
        });
      }
    }
    return list;
  }, [currentStation, meta]);

  // Current active inspected tile (defaults to station core)
  const activeTile = useMemo(() => {
    if (selectedTile) return selectedTile;
    return tiles.find((t) => t.isStationCore) || tiles[0];
  }, [selectedTile, tiles]);

  // Coordinate copy handler
  const handleCopyCoords = () => {
    const text = `${meta.name}: ${meta.exactLat}, ${meta.exactLng} (${meta.decimalLat.toFixed(
      4
    )}, ${meta.decimalLng.toFixed(4)}) - Elevation ${meta.elevationMeters}m`;
    navigator.clipboard?.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    onToast?.('COORDINATES COPIED', `${meta.name} WGS-84 coordinate string copied.`, 'pin_drop', 'blue');
  };

  // Color styles based on tile type and layer
  const getTileFill = (tile: TileData) => {
    if (activeLayer === 'hazards') {
      if (tile.hazardLevel === 'high') return '#ef4444';
      if (tile.isStationCore) return '#2563eb';
      if (tile.type === 'coastal-water' || tile.type === 'lake') return '#0284c7';
      return '#334155';
    }

    if (activeLayer === 'elevation') {
      const norm = Math.min(Math.max(tile.elevation / 400, 0), 1);
      if (tile.elevation === 0) return '#0369a1';
      // Low to high elevation color gradient in neutral slates
      if (norm < 0.2) return '#38bdf8';
      if (norm < 0.4) return '#94a3b8';
      if (norm < 0.7) return '#64748b';
      return '#e2e8f0';
    }

    // Standard layer
    switch (tile.type) {
      case 'station-core':
        return '#0284c7'; // Vibrant Station Cyan/Blue
      case 'comms-mast':
        return '#475569';
      case 'runway':
        return '#64748b';
      case 'convoy':
        return '#eab308';
      case 'coastal-water':
        return '#0369a1';
      case 'lake':
        return '#0284c7';
      case 'rock-ridge':
        return '#475569';
      case 'crevasse':
        return '#b91c1c';
      case 'tundra':
        return '#334155';
      case 'ice-sheet':
      default:
        return '#1e293b';
    }
  };

  const getTileStroke = (tile: TileData, isSelected: boolean) => {
    if (isSelected) return '#f59e0b'; // Gold highlight
    if (tile.isStationCore) return '#38bdf8'; // Cyan reticle stroke
    if (tile.hazardLevel === 'high') return '#f87171';
    return '#334155';
  };

  return (
    <div
      id="station-tile-map-container"
      className="bg-white dark:bg-[#0a1d2e] rounded-xl border border-neutral-200 dark:border-[#253648] p-3.5 flex flex-col space-y-3 shadow-sm transition-colors"
    >
      {/* Top Header & Station Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-200 dark:border-[#253648] flex items-center justify-center text-neutral-800 dark:text-[#a4c9ff]">
            <span className="material-symbols-outlined text-[18px]">grid_4x4</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-headline text-sm font-black text-neutral-900 dark:text-[#d2e4fc] tracking-tight">
                {meta.name} Tactical Coordinate Grid
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-[#0f2132] text-neutral-700 dark:text-[#a4c9ff] border border-neutral-300 dark:border-[#253648] font-bold">
                {meta.sectorCode}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-[#c1c6d3]">
              {meta.region} • {meta.datum}
            </p>
          </div>
        </div>

        {/* Station Selection Tabs */}
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#071A2B] p-1 rounded-lg border border-neutral-200 dark:border-[#253648] self-stretch sm:self-auto">
          {(['bharati', 'maitri', 'himadri'] as StationKey[]).map((st) => {
            const isCurrent = currentStation === st;
            return (
              <button
                key={st}
                id={`map-select-${st}`}
                onClick={() => {
                  if (onSelectStation) {
                    onSelectStation(st);
                    setSelectedTile(null);
                    onToast?.(
                      'SECTOR GRID LOCKED',
                      `Switched map focus to ${STATION_CONFIGS[st].name} (${STATION_CONFIGS[st].exactLat}, ${STATION_CONFIGS[st].exactLng})`,
                      'pin_drop',
                      'blue'
                    );
                  }
                }}
                className={`flex-1 sm:flex-initial px-2.5 py-1 text-xs font-headline font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  isCurrent
                    ? 'bg-neutral-900 text-white dark:bg-[#0b5ea8] dark:text-white shadow-sm'
                    : 'text-neutral-600 dark:text-[#c1c6d3] hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    st === 'bharati'
                      ? 'bg-blue-400'
                      : st === 'maitri'
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                />
                <span className="capitalize">{st}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Tile Map Canvas */}
      <div className="relative w-full rounded-lg bg-neutral-950 dark:bg-[#020e1c] border border-neutral-300 dark:border-[#253648] overflow-hidden">
        {/* Top Control Overlay Toolbar */}
        <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-none gap-1">
          {/* Active Station GPS Reticle Tag */}
          <div className="pointer-events-auto flex items-center gap-1.5 px-2 py-1 rounded bg-black/80 backdrop-blur-md border border-neutral-700 text-white text-[10px] sm:text-[11px] font-mono shadow">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-[#a4c9ff]">{meta.name.toUpperCase()}</span>
            <span className="hidden sm:inline text-neutral-400">|</span>
            <span className="hidden sm:inline text-neutral-200">
              {meta.exactLat} · {meta.exactLng}
            </span>
          </div>

          {/* Layer Mode Filters */}
          <div className="pointer-events-auto flex items-center gap-0.5 sm:gap-1 bg-black/80 backdrop-blur-md p-0.5 rounded border border-neutral-700 text-[9px] sm:text-[10px] font-mono">
            <button
              onClick={() => setActiveLayer('standard')}
              className={`px-1.5 sm:px-2 py-0.5 rounded font-bold transition-all ${
                activeLayer === 'standard' ? 'bg-[#0b5ea8] text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              SURFACE
            </button>
            <button
              onClick={() => setActiveLayer('hazards')}
              className={`px-1.5 sm:px-2 py-0.5 rounded font-bold transition-all ${
                activeLayer === 'hazards' ? 'bg-red-900/80 text-red-200' : 'text-neutral-400 hover:text-white'
              }`}
            >
              HAZARDS
            </button>
            <button
              onClick={() => setActiveLayer('elevation')}
              className={`px-1.5 sm:px-2 py-0.5 rounded font-bold transition-all ${
                activeLayer === 'elevation' ? 'bg-sky-900/80 text-sky-200' : 'text-neutral-400 hover:text-white'
              }`}
            >
              ALTITUDE
            </button>
          </div>
        </div>

        {/* SVG Tile Map Canvas (Responsive for Phones) */}
        <div className="w-full flex justify-center py-2 px-1 overflow-x-hidden">
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className="w-full h-auto select-none font-mono block touch-manipulation max-h-[380px]"
          >
            <defs>
              {/* Pattern for Crevasse Hazard Hash */}
              <pattern
                id="hazard-hash"
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="2.5" strokeOpacity="0.75" />
              </pattern>

              {/* Station Core Pulse Gradient */}
              <radialGradient id="station-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#0284c7" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Background Graticule Grid Lines */}
            <rect
              x={SVG_PADDING_X - 10}
              y={SVG_PADDING_Y - 10}
              width={MAP_WIDTH - SVG_PADDING_X * 2 + 20}
              height={MAP_HEIGHT - SVG_PADDING_Y * 2 + 20}
              fill="#061320"
              stroke="#1e293b"
              strokeWidth="1"
              rx="6"
            />

            {/* Latitude Axis Marks (Left and Right) */}
            {Array.from({ length: ROWS }).map((_, r) => {
              const y = SVG_PADDING_Y + r * (TILE_H + GAP) + TILE_H / 2;
              const latVal = meta.gridOriginLat + r * meta.latStep;
              const latText = `${Math.abs(latVal).toFixed(3)}°${latVal >= 0 ? 'N' : 'S'}`;
              return (
                <g key={`lat-${r}`}>
                  <text
                    x={SVG_PADDING_X - 12}
                    y={y + 3}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {latText}
                  </text>
                  <line
                    x1={SVG_PADDING_X - 6}
                    y1={y}
                    x2={SVG_PADDING_X - 1}
                    y2={y}
                    stroke="#475569"
                    strokeWidth="1"
                  />
                  <line
                    x1={MAP_WIDTH - SVG_PADDING_X + 1}
                    y1={y}
                    x2={MAP_WIDTH - SVG_PADDING_X + 6}
                    y2={y}
                    stroke="#475569"
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {/* Longitude Axis Marks (Top and Bottom) */}
            {Array.from({ length: COLS }).map((_, c) => {
              const x = SVG_PADDING_X + c * (TILE_W + GAP) + TILE_W / 2;
              const lngVal = meta.gridOriginLng + c * meta.lngStep;
              const lngText = `${Math.abs(lngVal).toFixed(3)}°${lngVal >= 0 ? 'E' : 'W'}`;
              return (
                <g key={`lng-${c}`}>
                  <text
                    x={x}
                    y={SVG_PADDING_Y - 12}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {lngText}
                  </text>
                  <line
                    x1={x}
                    y1={SVG_PADDING_Y - 6}
                    x2={x}
                    y2={SVG_PADDING_Y - 1}
                    stroke="#475569"
                    strokeWidth="1"
                  />
                  <line
                    x1={x}
                    y1={MAP_HEIGHT - SVG_PADDING_Y + 1}
                    x2={x}
                    y2={MAP_HEIGHT - SVG_PADDING_Y + 6}
                    stroke="#475569"
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {/* Individual Tile Matrix */}
            {tiles.map((tile) => {
              const x = SVG_PADDING_X + tile.col * (TILE_W + GAP);
              const y = SVG_PADDING_Y + tile.row * (TILE_H + GAP);
              const isSelected = activeTile.col === tile.col && activeTile.row === tile.row;
              const isCore = tile.isStationCore;
              const fill = getTileFill(tile);
              const stroke = getTileStroke(tile, isSelected);

              return (
                <g
                  key={tile.id}
                  id={tile.id}
                  onClick={() => setSelectedTile(tile)}
                  className="cursor-pointer transition-transform hover:opacity-90"
                >
                  {/* Base Tile Box */}
                  <rect
                    x={x}
                    y={y}
                    width={TILE_W}
                    height={TILE_H}
                    rx="4"
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSelected ? '2' : isCore ? '1.5' : '1'}
                  />

                  {/* Hazard Stripe Overlay for High Danger Tiles */}
                  {tile.hazardLevel === 'high' && (
                    <rect
                      x={x + 1}
                      y={y + 1}
                      width={TILE_W - 2}
                      height={TILE_H - 2}
                      rx="3"
                      fill="url(#hazard-hash)"
                      pointerEvents="none"
                    />
                  )}

                  {/* Tile Grid Position Coordinates Code */}
                  <text
                    x={x + 4}
                    y={y + 10}
                    fontSize="7.5"
                    fill={isCore ? '#bae6fd' : '#94a3b8'}
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    C{tile.col}-R{tile.row}
                  </text>

                  {/* Tile Elevation Label */}
                  <text
                    x={x + TILE_W - 4}
                    y={y + 10}
                    textAnchor="end"
                    fontSize="7"
                    fill={isCore ? '#bae6fd' : '#64748b'}
                    pointerEvents="none"
                  >
                    {tile.elevation}m
                  </text>

                  {/* Tile Center POI / Icon / Label */}
                  {tile.poiLabel && (
                    <g pointerEvents="none">
                      <rect
                        x={x + TILE_W / 2 - 16}
                        y={y + TILE_H / 2 - 5}
                        width="32"
                        height="13"
                        rx="2.5"
                        fill={isCore ? '#0284c7' : '#0f172a'}
                        stroke={isCore ? '#38bdf8' : '#334155'}
                        strokeWidth="1"
                      />
                      <text
                        x={x + TILE_W / 2}
                        y={y + TILE_H / 2 + 4}
                        textAnchor="middle"
                        fontSize="8"
                        fontWeight="900"
                        fill="#ffffff"
                      >
                        {tile.poiLabel}
                      </text>
                    </g>
                  )}

                  {/* Station Core Pulse Reticle Highlight */}
                  {isCore && (
                    <g pointerEvents="none">
                      {/* Pulse Circle */}
                      <circle
                        cx={x + TILE_W / 2}
                        cy={y + TILE_H / 2}
                        r={TILE_W / 2 + 3}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        className="animate-pulse"
                      />
                      {/* Corner Tactical Tick Marks */}
                      <path
                        d={`M${x - 2},${y + 4} L${x - 2},${y - 2} L${x + 4},${y - 2}`}
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        fill="none"
                      />
                      <path
                        d={`M${x + TILE_W + 2},${y + 4} L${x + TILE_W + 2},${y - 2} L${x + TILE_W - 4},${y - 2}`}
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        fill="none"
                      />
                      <path
                        d={`M${x - 2},${y + TILE_H - 4} L${x - 2},${y + TILE_H + 2} L${x + 4},${y + TILE_H + 2}`}
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        fill="none"
                      />
                      <path
                        d={`M${x + TILE_W + 2},${y + TILE_H - 4} L${x + TILE_W + 2},${y + TILE_H + 2} L${x + TILE_W - 4},${y + TILE_H + 2}`}
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        fill="none"
                      />
                    </g>
                  )}

                  {/* User Selected Highlight Ring */}
                  {isSelected && (
                    <rect
                      x={x - 2}
                      y={y - 2}
                      width={TILE_W + 4}
                      height={TILE_H + 4}
                      rx="6"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })}

            {/* Convoy Route Dashed Line Indicator (if Bharati) */}
            {currentStation === 'bharati' && (
              <path
                d={`M${SVG_PADDING_X + 2 * (TILE_W + GAP) + TILE_W / 2},${
                  SVG_PADDING_Y + 4 * (TILE_H + GAP) + TILE_H / 2
                } Q${SVG_PADDING_X + 4 * (TILE_W + GAP)},${SVG_PADDING_Y + 3 * (TILE_H + GAP)} ${
                  SVG_PADDING_X + meta.coreCol * (TILE_W + GAP) + TILE_W / 2
                },${SVG_PADDING_Y + meta.coreRow * (TILE_H + GAP) + TILE_H / 2}`}
                fill="none"
                stroke="#eab308"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="animate-pulse"
                pointerEvents="none"
              />
            )}

            {/* Cardinal Compass Rose in Bottom Corner */}
            <g
              transform={`translate(${MAP_WIDTH - SVG_PADDING_X + 24}, ${
                MAP_HEIGHT - SVG_PADDING_Y + 16
              })`}
            >
              <circle r="12" fill="#0b1e32" stroke="#334155" strokeWidth="1" />
              <line x1="0" y1="-9" x2="0" y2="9" stroke="#94a3b8" strokeWidth="1" />
              <line x1="-9" y1="0" x2="9" y2="0" stroke="#94a3b8" strokeWidth="1" />
              <polygon points="0,-9 -3,-2 3,-2" fill="#38bdf8" />
              <text x="0" y="-12" textAnchor="middle" fontSize="7" fill="#38bdf8" fontWeight="bold">
                N
              </text>
            </g>
          </svg>
        </div>

        {/* Bottom Legend & Scale Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-neutral-900/90 dark:bg-[#041220]/90 border-t border-neutral-800 text-[10px] text-neutral-300 font-mono">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-neutral-400 font-bold">GRID LEGEND:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0284c7] border border-[#38bdf8]" />
              <span>Base HQ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0369a1]" />
              <span>Water / Bay</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#475569]" />
              <span>Rock / Nunatak</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#1e293b]" />
              <span>Ice Sheet</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#b91c1c] border border-red-400" />
              <span>Crevasse Zone</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-400">TILE SCALE:</span>
            <span className="font-bold text-white">1 TILE = 1.2 KM²</span>
          </div>
        </div>
      </div>

      {/* Selected Tile Telemetry Inspector HUD */}
      <div className="p-3 rounded-lg bg-neutral-50 dark:bg-[#071A2B] border border-neutral-200 dark:border-[#253648] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
              activeTile.isStationCore
                ? 'bg-blue-100 dark:bg-blue-950/60 border-blue-400 text-blue-600 dark:text-blue-300'
                : activeTile.hazardLevel === 'high'
                ? 'bg-red-100 dark:bg-red-950/60 border-red-400 text-red-600 dark:text-red-300'
                : 'bg-neutral-200 dark:bg-[#0f2132] border-neutral-300 dark:border-[#253648] text-neutral-800 dark:text-[#a4c9ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {activeTile.poiIcon || (activeTile.isStationCore ? 'domain' : 'pin_drop')}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-headline font-bold text-neutral-900 dark:text-white text-xs">
                {activeTile.name}
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-[#0f2132] text-neutral-700 dark:text-[#c1c6d3]">
                Sector [{activeTile.col}, {activeTile.row}]
              </span>
              {activeTile.isStationCore && (
                <span className="font-headline text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-600 text-white uppercase">
                  Current Station HQ
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 font-mono text-[11px] text-neutral-600 dark:text-[#c1c6d3] flex-wrap">
              <span>
                Coordinates: <strong className="text-neutral-900 dark:text-white">{activeTile.lat}, {activeTile.lng}</strong>
              </span>
              <span>•</span>
              <span>
                Elevation:{' '}
                <strong className="text-neutral-900 dark:text-white">
                  <AnimatedTelemetryValue
                    value={activeTile.elevation}
                    precision={0}
                    suffix="m ASL"
                    showDelta
                    pulseColor="blue"
                  />
                </strong>
              </span>
              <span>•</span>
              <span>
                Hazard:
                <strong
                  className={`ml-1 uppercase ${
                    activeTile.hazardLevel === 'high'
                      ? 'text-red-600 dark:text-red-400 font-black'
                      : activeTile.hazardLevel === 'moderate'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {activeTile.hazardLevel}
                </strong>
              </span>
            </div>

            {/* Kid-Friendly Explorer Translation */}
            <div className="mt-2 p-2 rounded-lg bg-blue-50/90 dark:bg-[#0b5ea8]/25 border border-blue-200 dark:border-blue-700/50 text-blue-950 dark:text-[#d2e4fc] text-[11px] sm:text-xs flex items-center gap-2">
              <span className="text-base shrink-0">🐧</span>
              <span className="font-medium leading-tight">
                {activeTile.isStationCore
                  ? 'Warm Base House! 32 scientists live here, eat hot soup, sleep in bunk beds, and call home!'
                  : activeTile.type === 'coastal-water'
                  ? 'Freezing Polar Ocean! Emperor penguins and Weddell seals dive here to catch silver fish!'
                  : activeTile.type === 'crevasse'
                  ? 'Deep Ice Crack! A giant crack in the glacier! Snowcat tractors steer safely around it!'
                  : activeTile.type === 'runway'
                  ? 'Blue Ice Ski Runway! Airplanes equipped with snow skis land right here on the ice!'
                  : activeTile.type === 'comms-mast'
                  ? 'Space Satellite Tower! Bouncing radio waves to satellites so the crew can video-call India!'
                  : activeTile.type === 'lake'
                  ? 'Priyadarshini Glacier Lake! Clean, melted freshwater providing fresh drinking water!'
                  : activeTile.type === 'convoy'
                  ? 'Snowcat Monster Trucks! Tracked trucks driving across the snow with hot food & supplies!'
                  : activeTile.type === 'rock-ridge'
                  ? 'Nunatak Mountain Peak! Ancient dark mountain rocks sticking out of miles of white glacier ice!'
                  : activeTile.type === 'tundra'
                  ? 'Arctic Moss Tundra! Tiny green moss and Arctic foxes running in summer sunlight!'
                  : 'Ancient Glacial Ice Sheet! Snow that fell thousands of years ago, pressed into blue ice!'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons for Tile HUD */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={() => setSelectedTile(tiles.find((t) => t.isStationCore) || null)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-200 hover:bg-neutral-300 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] text-neutral-800 dark:text-[#d2e4fc] text-[11px] font-bold font-headline transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">my_location</span>
            <span>Recenter HQ</span>
          </button>
          <button
            onClick={handleCopyCoords}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white text-[11px] font-bold font-headline shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">
              {isCopied ? 'check' : 'content_copy'}
            </span>
            <span>{isCopied ? 'Copied' : 'Copy GPS'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
