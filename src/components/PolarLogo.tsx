/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useId } from 'react';

export interface PolarLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  variant?: 'icon' | 'badge' | 'full';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  animated?: boolean;
  showCoordinates?: boolean;
}

export const PolarLogo: React.FC<PolarLogoProps> = ({
  size = 'md',
  variant = 'icon',
  theme = 'auto',
  className = '',
  animated = false,
  showCoordinates = false,
}) => {
  const rawId = useId().replace(/:/g, '');

  // Size mappings in pixels
  const sizePx = typeof size === 'number'
    ? size
    : size === 'xs'
    ? 20
    : size === 'sm'
    ? 28
    : size === 'md'
    ? 36
    : size === 'lg'
    ? 56
    : 76;

  // Gradients and filter IDs
  const gradPolarGlow = `polarGlow_${rawId}`;
  const gradIceFacet = `iceFacet_${rawId}`;
  const gradAuroraRim = `auroraRim_${rawId}`;
  const gradBackdrop = `polarBackdrop_${rawId}`;
  const filterGlow = `iceGlow_${rawId}`;

  const iconSvg = (
    <svg
      viewBox="0 0 100 100"
      width={sizePx}
      height={sizePx}
      className={`shrink-0 select-none ${animated ? 'animate-pulse' : ''}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="POLARX Emblem"
      role="img"
    >
      <defs>
        {/* Arctic Cyan & Electric Blue Gradient */}
        <linearGradient id={gradPolarGlow} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f0ff" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Ice Facet Reflection */}
        <linearGradient id={gradIceFacet} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#bae6fd" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
        </linearGradient>

        {/* Aurora Borealis & Australis Rim */}
        <linearGradient id={gradAuroraRim} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="35%" stopColor="#06b6d4" />
          <stop offset="70%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>

        {/* Polar Deep Ocean Radial Backdrop */}
        <radialGradient id={gradBackdrop} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0a2540" />
          <stop offset="75%" stopColor="#031525" />
          <stop offset="100%" stopColor="#010c17" />
        </radialGradient>

        {/* Glow filter */}
        <filter id={filterGlow} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Hexagonal Polar Station Shield Foundation */}
      <polygon
        points="50,4 91,27 91,73 50,96 9,73 9,27"
        fill={`url(#${gradBackdrop})`}
        stroke={`url(#${gradAuroraRim})`}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* Concentric Polar Range Rings (60°S - 90°S) */}
      <circle
        cx="50"
        cy="50"
        r="38"
        stroke="#38bdf8"
        strokeWidth="0.75"
        strokeDasharray="2,3"
        opacity="0.4"
      />
      <circle
        cx="50"
        cy="50"
        r="27"
        stroke="#a4c9ff"
        strokeWidth="0.75"
        opacity="0.6"
      />
      <circle
        cx="50"
        cy="50"
        r="15"
        stroke="#00f0ff"
        strokeWidth="0.6"
        strokeDasharray="1.5,2.5"
        opacity="0.5"
      />

      {/* Cardinal Bearing Compass Ticks */}
      <line x1="50" y1="12" x2="50" y2="18" stroke="#00f0ff" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="50" y1="82" x2="50" y2="88" stroke="#00f0ff" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="14" y1="50" x2="20" y2="50" stroke="#00f0ff" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="80" y1="50" x2="86" y2="50" stroke="#00f0ff" strokeWidth="1.6" strokeLinecap="round" />

      {/* Diagonal Compass Guides */}
      <line x1="26" y1="26" x2="31" y2="31" stroke="#38bdf8" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      <line x1="74" y1="26" x2="69" y2="31" stroke="#38bdf8" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      <line x1="26" y1="74" x2="31" y2="69" stroke="#38bdf8" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      <line x1="74" y1="74" x2="69" y2="69" stroke="#38bdf8" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />

      {/* True North Celestial Star Pointer */}
      <polygon
        points="50,14 52.5,37 50,41 47.5,37"
        fill="#ffffff"
        filter={`url(#${filterGlow})`}
      />
      {/* South Pole Traverse Pointer */}
      <polygon points="50,86 52.5,63 50,59 47.5,63" fill="#38bdf8" />
      <polygon points="14,50 37,47.5 41,50 37,52.5" fill="#38bdf8" opacity="0.8" />
      <polygon points="86,50 63,47.5 59,50 63,52.5" fill="#38bdf8" opacity="0.8" />

      {/* Ice Crystal Six-Fold Lattice Axes */}
      <line x1="50" y1="50" x2="24" y2="35" stroke="#a4c9ff" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
      <line x1="50" y1="50" x2="76" y2="35" stroke="#a4c9ff" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
      <line x1="50" y1="50" x2="24" y2="65" stroke="#a4c9ff" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
      <line x1="50" y1="50" x2="76" y2="65" stroke="#a4c9ff" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />

      {/* The Iconic 'X' - Faceted Polar Glacial Chevrons */}
      {/* Arm 1: NW to SE */}
      <polygon points="31,27 38,25 69,73 62,75" fill={`url(#${gradPolarGlow})`} />
      <polygon points="38,25 43,28 69,73 64,75" fill={`url(#${gradIceFacet})`} />

      {/* Arm 2: NE to SW */}
      <polygon points="69,27 62,25 31,73 38,75" fill={`url(#${gradPolarGlow})`} />
      <polygon points="62,25 57,28 31,73 36,75" fill={`url(#${gradIceFacet})`} />

      {/* Center Navigational Hex-Diamond Core */}
      <polygon
        points="50,43 56,47 56,53 50,57 44,53 44,47"
        fill="#ffffff"
        stroke="#00f0ff"
        strokeWidth="1.2"
        filter={`url(#${filterGlow})`}
      />
      <circle cx="50" cy="50" r="2.5" fill="#00f0ff" />

      {/* North Expedition Beacon Indicator */}
      <circle cx="50" cy="7" r="2.2" fill="#00f0ff" />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-xl bg-slate-900/90 dark:bg-[#071A2B] border border-neutral-700/60 dark:border-[#a4c9ff]/40 shadow-sm p-1 transition-all ${className}`}
        style={{ width: sizePx + 8, height: sizePx + 8 }}
      >
        {iconSvg}
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        <div
          className="inline-flex items-center justify-center rounded-xl bg-slate-900/90 dark:bg-[#071A2B] border border-neutral-700/60 dark:border-[#a4c9ff]/40 shadow-sm p-1"
          style={{ width: sizePx + 8, height: sizePx + 8 }}
        >
          {iconSvg}
        </div>
        <div className="flex flex-col text-left min-w-0 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="font-headline font-black tracking-wider text-neutral-900 dark:text-[#d2e4fc] text-sm sm:text-base">
              POLARX
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-[#0b5ea8]/50 border border-blue-300 dark:border-[#a4c9ff]/30 text-blue-800 dark:text-[#a4c9ff] text-[9px] font-mono font-bold tracking-widest uppercase">
              NCPOR
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-label text-neutral-500 dark:text-[#c1c6d3] truncate">
            Polar Operations Intelligence
          </span>
        </div>
      </div>
    );
  }

  // 'full' variant
  return (
    <div className={`flex flex-col items-center text-center gap-2 ${className}`}>
      <div
        className="relative inline-flex items-center justify-center rounded-2xl bg-slate-900 dark:bg-[#071A2B] border border-neutral-700 dark:border-[#a4c9ff]/40 p-2 shadow-xl"
        style={{ width: sizePx + 16, height: sizePx + 16 }}
      >
        {iconSvg}
        <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-md">
          NCPOR
        </span>
      </div>

      <div className="flex flex-col items-center">
        <h1 className="font-headline text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-[#d2e4fc] flex items-center gap-2">
          <span>POLARX</span>
          <span className="text-xs px-2 py-0.5 rounded bg-neutral-200 dark:bg-[#0b5ea8]/40 border border-neutral-300 dark:border-[#a4c9ff]/30 text-neutral-800 dark:text-[#a4c9ff] font-mono font-bold uppercase tracking-wider">
            MISSION CORE
          </span>
        </h1>
        <p className="font-label text-xs sm:text-sm uppercase tracking-wider text-neutral-700 dark:text-[#c1c6d3] font-bold mt-0.5 max-w-sm">
          Integrated Polar Expedition Logistics & Asset Management System
        </p>
        {showCoordinates && (
          <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-neutral-500 dark:text-[#a4c9ff]/70">
            <span>BHARATI: -69.407°S, 76.191°E</span>
            <span>•</span>
            <span>MAITRI: -70.766°S, 11.733°E</span>
            <span>•</span>
            <span>HIMADRI: 78.924°N, 11.928°E</span>
          </div>
        )}
      </div>
    </div>
  );
};
