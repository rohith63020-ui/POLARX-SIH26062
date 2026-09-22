/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppTab } from '../types';
import { UserRole } from '../auth/authStore';

interface BottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  pendingIncidentsCount?: number;
  queuedCount?: number;
  kidMode?: boolean;
  allowedRoutes?: string[];
  role?: UserRole;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  pendingIncidentsCount = 2,
  queuedCount,
  kidMode = true,
  allowedRoutes,
  role,
}) => {
  const allTabs: {
    id: AppTab;
    routeKey: string;
    label: string;
    kidLabel: string;
    icon: string;
    isDanger?: boolean;
  }[] = [
    { id: 'ops', routeKey: 'dashboard', label: 'Ops', kidLabel: 'Base 🏠', icon: 'space_dashboard' },
    { id: 'exped', routeKey: 'expeditions', label: 'Exped', kidLabel: 'Explore 🧭', icon: 'explore' },
    { id: 'cargo', routeKey: 'cargo', label: 'Cargo', kidLabel: 'Trucks 🚚', icon: 'local_shipping' },
    { id: 'stock', routeKey: 'inventory', label: 'Stock', kidLabel: 'Food 🥪', icon: 'inventory_2' },
    { id: 'gmail', routeKey: 'gmail', label: 'Gmail', kidLabel: 'Mail ✉️', icon: 'mail' },
    { id: 'personnel', routeKey: 'personnel', label: 'People', kidLabel: 'Crew 👥', icon: 'badge' },
    { id: 'ai', routeKey: 'ai-insights', label: 'AI Core', kidLabel: 'Robot 🤖', icon: 'smart_toy' },
    { id: 'sos', routeKey: 'emergency', label: 'SOS', kidLabel: 'Help 🚨', icon: 'emergency_home', isDanger: true },
    { id: 'reports', routeKey: 'reports', label: 'Reports', kidLabel: 'Logs 📋', icon: 'description' },
    { id: 'sim', routeKey: 'sim', label: 'Sim', kidLabel: 'Science 🧪', icon: 'science' },
  ];

  // Filter tabs strictly based on role's allowedRoutes if provided
  const visibleTabs = allTabs.filter((tab) => {
    if (!allowedRoutes) return true;
    return allowedRoutes.includes(tab.routeKey);
  });

  return (
    <nav className="fixed bottom-0 w-full z-40 pb-safe bg-white/95 dark:bg-[#021425]/95 backdrop-blur-xl border-t border-neutral-200 dark:border-[#253648] shadow-[0_-4px_24px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.5)] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-1 sm:px-4 h-15 flex items-center justify-between gap-0.5 sm:gap-1 w-full">
        {visibleTabs.map((tab) => {
          const isActive =
            activeTab === tab.id ||
            (tab.id === 'ops' && (activeTab === 'dashboard' || activeTab === 'ops')) ||
            (tab.id === 'exped' && (activeTab === 'expeditions' || activeTab === 'exped')) ||
            (tab.id === 'cargo' && (activeTab === 'cargo' || activeTab === 'assets')) ||
            (tab.id === 'stock' && (activeTab === 'stock' || activeTab === 'inventory')) ||
            (tab.id === 'gmail' && (activeTab === 'gmail' || activeTab === 'communications')) ||
            (tab.id === 'ai' && (activeTab === 'ai' || activeTab === 'ai-insights')) ||
            (tab.id === 'sos' && (activeTab === 'sos' || activeTab === 'emergency'));
          const isDanger = tab.isDanger;
          const displayLabel = kidMode ? tab.kidLabel : tab.label;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 min-w-0 h-13 min-h-[44px] flex flex-col items-center justify-center rounded-lg transition-all relative px-0.5 ${
                isActive
                  ? isDanger
                    ? 'text-red-600 dark:text-red-400 font-extrabold bg-red-50/80 dark:bg-red-950/40'
                    : 'text-neutral-900 dark:text-[#a4c9ff] font-extrabold bg-neutral-100 dark:bg-[#0b5ea8]/30'
                  : isDanger
                  ? 'text-red-500 hover:text-red-600 dark:text-red-400/80 dark:hover:text-red-400'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-[#c1c6d3] dark:hover:text-[#d2e4fc]'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[20px] sm:text-[22px] transition-transform group-hover:scale-110"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {tab.icon}
                </span>
                {isDanger && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600 animate-ping" />
                )}
              </div>
              <span className="font-headline text-[9.5px] sm:text-[11px] font-bold tracking-tight mt-0.5 truncate max-w-full text-center leading-none">
                {displayLabel}
              </span>
              {isActive && (
                <span
                  className={`absolute bottom-0.5 w-6 sm:w-8 h-0.5 rounded-full ${
                    isDanger ? 'bg-red-600 dark:bg-red-500' : 'bg-black dark:bg-[#a4c9ff]'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-Footer Identity Bar (Clean & Compact on Phones) */}
      <div className="px-3 sm:px-6 py-0.5 sm:py-1 bg-neutral-100 dark:bg-[#0a1d2e] border-t border-neutral-200 dark:border-[#253648] flex items-center justify-between text-neutral-600 dark:text-[#c1c6d3]">
        <span className="font-mono text-[8.5px] sm:text-[9px] uppercase tracking-wider font-bold truncate">
          {kidMode ? '🐧 Polar Kids Explorer Base • NCPOR' : 'POLARX DEMO AUTHENTICATION ACTIVE'}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 dark:bg-emerald-400" />
          </span>
          <span className="font-mono text-[8.5px] sm:text-[9px] text-neutral-800 dark:text-[#a4c9ff] uppercase font-bold">
            {kidMode ? 'Sensors Live 📡' : 'POLAR TELEMETRY ACTIVE'}
          </span>
        </div>
      </div>
    </nav>
  );
};
