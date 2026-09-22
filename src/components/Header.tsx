/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StationKey, UserProfile } from '../types';
import { PolarLogo } from './PolarLogo';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { useData } from '../context/DataContext';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  user?: UserProfile;
  currentUser?: UserProfile;
  station?: StationKey;
  currentStation?: StationKey;
  onSelectStation: (st: StationKey) => void;
  connectionState?: 'ONLINE' | 'OFFLINE' | 'SYNCING';
  isOnline?: boolean;
  onToggleConnection?: () => void;
  onToggleOnline?: () => void;
  pendingCount?: number;
  queuedItemsCount?: number;
  isSyncing?: boolean;
  onManualSync?: () => void;
  onOpenQueue?: () => void;
  onOpenNotifications?: () => void;
  onPromptLogout?: () => void;
  isDarkMode?: boolean;
  theme?: 'light' | 'dark';
  onToggleDarkMode?: () => void;
  onToggleTheme?: () => void;
  onOpenProfileModal?: () => void;
  onOpenProfile?: () => void;
  onNavigateTab?: (tab: string) => void;
  kidMode?: boolean;
  onToggleKidMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user: propUser,
  currentUser,
  station: propStation,
  currentStation,
  onSelectStation,
  connectionState,
  isOnline = true,
  onToggleConnection,
  onToggleOnline,
  pendingCount,
  queuedItemsCount,
  isSyncing = false,
  onManualSync,
  onOpenQueue,
  onOpenNotifications = () => {},
  onPromptLogout = () => {},
  isDarkMode,
  theme,
  onToggleDarkMode,
  onToggleTheme,
  onOpenProfileModal,
  onOpenProfile,
  onNavigateTab = (_tab: string) => {},
  kidMode = true,
  onToggleKidMode,
}) => {
  const user = propUser || currentUser || {
    id: 'USR-NCPOR-09',
    name: 'Dr. Rajesh Sen',
    role: 'Chief Logistics Officer & Expedition Leader',
    station: 'Bharati Station (-69.407°S, 76.184°E)',
    clearance: 'LEVEL-4 TOP SECRET',
    email: 'r.sen@ncpor.res.in',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDLusVnniIg6lihHt83LC4rr-S6tNtRqkR4fs8ZLIu26nDnVeGOAvY_d980GZZ-mVZIycpwwyLxhr3LGJ28e0qJN8vS2NCl_a4wsVkDWsBgoejD_-PhMuJRQzGXaVZMKFNNkg2xk4oMYSqB8j9E2xkfNMI6QYC_6jaVwxqJXEqx0TkHqa8WeWVxXg77afuffez9dbf75U0sySn0bZX5QC-cHdu8Irymd9QliMki1enQoKhZBQLgb6pykg',
  };

  const themeCtx = useTheme();
  const { unreadCount } = useNotifications();
  const dataCtx = useData();
  const station = propStation || currentStation || 'bharati';
  const effectiveConnState = connectionState || dataCtx.connectionState;
  const count = pendingCount ?? dataCtx.pendingSyncCount ?? 0;
  const darkMode = isDarkMode ?? (theme ? theme === 'dark' : themeCtx.isDarkMode);
  const handleToggleTheme = onToggleDarkMode || onToggleTheme || themeCtx.toggleTheme;
  const handleToggleConn = () => {
    if (effectiveConnState === 'OFFLINE') {
      dataCtx.restoreConnectionAndSync();
    } else {
      dataCtx.toggleSimulatedOffline();
    }
    if (onToggleConnection) onToggleConnection();
    if (onToggleOnline) onToggleOnline();
  };
  const handleOpenProfile = onOpenProfileModal || onOpenProfile || (() => {});
  const handleOpenQueue = onOpenQueue || onManualSync || (() => dataCtx.restoreConnectionAndSync());

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [stationMenuOpen, setStationMenuOpen] = useState(false);

  const handleToggleNotifications = () => {
    setNotificationsOpen((prev) => !prev);
    if (onOpenNotifications) {
      onOpenNotifications();
    }
  };

  const stationLabels: Record<StationKey, { label: string; kidLabel: string; coords: string; kidNote: string }> = {
    bharati: {
      label: 'INPEX-2026 (Bharati)',
      kidLabel: '🐧 Bharati Base (Antarctica)',
      coords: '-69.407°S, 76.191°E',
      kidNote: 'South Pole • Penguin Land!',
    },
    maitri: {
      label: 'MAITRI-REP (Maitri)',
      kidLabel: '❄️ Maitri Base (Antarctica)',
      coords: '-70.766°S, 11.733°E',
      kidNote: 'South Pole • Fresh Lake Oasis',
    },
    himadri: {
      label: 'HIMADRI-XIV (Arctic)',
      kidLabel: '🐻 Himadri Base (Arctic / North Pole)',
      coords: '78.924°N, 11.928°E',
      kidNote: 'North Pole • Arctic Svalbard',
    },
  };

  const currentStationInfo = stationLabels[station] || stationLabels.bharati;

  return (
    <header className="fixed top-0 w-full z-40 pt-safe bg-white/95 dark:bg-[#021425]/95 backdrop-blur-xl border-b border-neutral-200 dark:border-[#253648] shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1.5 sm:py-2 flex flex-col gap-1.5 sm:gap-2">
        {/* Top Row: Brand, Cadet Mode Toggle, Tools, Profile */}
        <div className="flex items-center justify-between gap-2">
          {/* Brand Logo & Info */}
          <div className="flex items-center gap-2 min-w-0">
            <PolarLogo size="sm" />
            <div className="flex flex-col min-w-0 leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-headline font-black text-xs sm:text-base tracking-wider text-neutral-900 dark:text-[#d2e4fc] truncate">
                  {kidMode ? 'POLAR EXPLORER' : 'POLARX'}
                </span>
                <span className="px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded bg-neutral-100 dark:bg-[#0b5ea8]/40 border border-neutral-300 dark:border-[#a4c9ff]/30 text-neutral-800 dark:text-[#a4c9ff] text-[9px] sm:text-[10px] font-mono font-bold tracking-wider uppercase shrink-0">
                  NCPOR
                </span>
              </div>
              <span className="text-[9.5px] sm:text-[11px] font-label text-neutral-500 dark:text-[#c1c6d3] truncate">
                {kidMode ? 'Antarctica & Arctic Station Guide' : 'Polar Operations Intelligence • NCPOR'}
              </span>
            </div>
          </div>

          {/* Right Action Tools: Kid Mode Switch, Dark mode, Alerts, Profile */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Junior Explorer / Kids Mode Toggle Button */}
            {onToggleKidMode && (
              <button
                id="kidModeToggleBtn"
                onClick={onToggleKidMode}
                title={kidMode ? 'Click for Advanced Technical Ops View' : 'Click for Kid-Friendly Explorer Mode'}
                className={`h-8 sm:h-9 px-2 rounded-lg border text-[10.5px] sm:text-[11px] font-headline font-black flex items-center gap-1 transition-all active:scale-95 ${
                  kidMode
                    ? 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-200 shadow-sm'
                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border-neutral-300 dark:border-[#253648] text-neutral-700 dark:text-[#c1c6d3]'
                }`}
                aria-label="Toggle kid mode"
              >
                <span className="text-sm">🐧</span>
                <span className="font-extrabold tracking-tight">
                  {kidMode ? 'Kids: ON' : 'Kids View'}
                </span>
              </button>
            )}

            {/* Theme Switcher Button */}
            <button
              id="themeToggleBtn"
              onClick={handleToggleTheme}
              title={darkMode ? 'Switch to Sunlit Ice Light Deck' : 'Switch to Polar Night Dark Deck'}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-200 dark:border-[#253648] text-neutral-700 dark:text-[#d2e4fc] flex items-center justify-center transition-colors shadow-sm"
              aria-label="Toggle theme"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px]">
                {darkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Notification Alert Bell */}
            <div className="relative">
              <button
                id="alertNotificationsBtn"
                onClick={handleToggleNotifications}
                className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-200 dark:border-[#253648] text-neutral-700 dark:text-[#d2e4fc] flex items-center justify-center transition-colors shadow-sm"
                aria-label={`Alerts (${unreadCount} unread)`}
                title={unreadCount > 0 ? `${unreadCount} unread operational notifications` : 'No unread notifications'}
              >
                <span className="material-symbols-outlined text-[18px] sm:text-[19px]">notifications</span>
                {unreadCount > 0 && (
                  <span
                    id="headerNotificationBadge"
                    className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-red-600 text-white font-mono text-[9px] flex items-center justify-center font-bold shadow animate-pulse"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              <NotificationCenter
                isOpen={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
                onNavigateTab={onNavigateTab}
              />
            </div>

            {/* User Profile Trigger */}
            <div className="relative">
              <button
                id="userProfileTrigger"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#0f2132] transition-colors focus:outline-none border border-transparent hover:border-neutral-200 dark:hover:border-[#253648]"
              >
                <div className="relative shrink-0">
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-neutral-900 dark:ring-[#a4c9ff]"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ring-2 ring-white dark:ring-[#021425] ${
                      effectiveConnState === 'ONLINE' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </div>
                <div className="hidden md:flex flex-col text-left leading-tight pr-1">
                  <span className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc] truncate max-w-[120px]">
                    {user.name}
                  </span>
                  <span className="font-mono text-[9.5px] text-blue-600 dark:text-[#a4c9ff] truncate max-w-[120px]">
                    {user.role}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-neutral-400 hidden sm:block">
                  expand_more
                </span>
              </button>

              {/* Tactical Dropdown Menu */}
              {profileOpen && (
                <div
                  id="userProfileMenu"
                  className="absolute right-0 top-10 sm:top-11 w-64 bg-white dark:bg-[#0a1d2e] border-2 border-neutral-900 dark:border-[#a4c9ff] rounded-xl shadow-2xl z-50 p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-100"
                >
                  {/* User Identity Header */}
                  <div className="p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-200 dark:border-[#253648] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-[#c1c6d3]">
                        Session Active • 8h valid
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-black text-white dark:bg-[#0b5ea8] text-[9px] font-mono font-bold">
                        {user.clearance}
                      </span>
                    </div>
                    <div>
                      <p className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc]">
                        {user.name}
                      </p>
                      <p className="text-[11px] font-semibold text-blue-600 dark:text-[#a4c9ff]">
                        {user.role}
                      </p>
                      <p className="text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
                        {user.station}
                      </p>
                    </div>
                  </div>

                  {/* Navigation Actions */}
                  <div className="flex flex-col space-y-0.5 text-[11px] font-headline">
                    {/* Gmail Dispatch */}
                    <button
                      id="menuGmailLink"
                      onClick={() => {
                        setProfileOpen(false);
                        onNavigateTab('gmail');
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#1a2b3d] text-left text-neutral-800 dark:text-[#d2e4fc] transition-colors font-bold"
                    >
                      <span className="material-symbols-outlined text-[17px] text-red-500">
                        mail
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span>Gmail Workspace</span>
                        <span className="px-1 py-0.2 text-[9px] bg-red-500/20 text-red-400 font-mono rounded font-bold">
                          NEW
                        </span>
                      </span>
                    </button>

                    {/* Profile */}
                    <button
                      id="menuProfileLink"
                      onClick={() => {
                        setProfileOpen(false);
                        onNavigateTab('profile');
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#1a2b3d] text-left text-neutral-800 dark:text-[#d2e4fc] transition-colors font-bold"
                    >
                      <span className="material-symbols-outlined text-[17px] text-blue-600 dark:text-[#a4c9ff]">
                        person
                      </span>
                      <span>Profile</span>
                    </button>

                    {/* Settings */}
                    <button
                      id="menuSettingsLink"
                      onClick={() => {
                        setProfileOpen(false);
                        onNavigateTab('settings');
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#1a2b3d] text-left text-neutral-800 dark:text-[#d2e4fc] transition-colors font-bold"
                    >
                      <span className="material-symbols-outlined text-[17px] text-neutral-600 dark:text-[#c1c6d3]">
                        settings
                      </span>
                      <span>Settings</span>
                    </button>

                    {onToggleKidMode && (
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onToggleKidMode();
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#1a2b3d] text-left text-neutral-800 dark:text-[#d2e4fc] transition-colors"
                      >
                        <span>🐧</span>
                        <span>{kidMode ? 'Standard Ops Deck' : 'Kids Explorer Mode'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        handleToggleTheme();
                      }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#1a2b3d] text-left text-neutral-800 dark:text-[#d2e4fc] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {darkMode ? 'light_mode' : 'dark_mode'}
                      </span>
                      <span>
                        {darkMode ? 'Light Surface Deck' : 'Polar Night Dark Deck'}
                      </span>
                    </button>

                    <div className="h-px bg-neutral-200 dark:bg-[#253648] my-1" />

                    {/* Logout Button */}
                    <button
                      id="menuLogoutBtn"
                      onClick={() => {
                        setProfileOpen(false);
                        onPromptLogout();
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-left text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-800/40 transition-colors w-full"
                    >
                      <span className="material-symbols-outlined text-[17px]">logout</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Second Row: Station Selector & Network Status Bar (Mobile-Fit) */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5 border-t border-neutral-100 dark:border-[#1a2b3d]/60">
          {/* Station Selector Dropdown */}
          <div className="relative flex-1 min-w-0 max-w-[240px]">
            <button
              onClick={() => setStationMenuOpen(!stationMenuOpen)}
              className="w-full flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-200 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc] text-left transition-colors"
            >
              <div className="flex items-center gap-1 min-w-0 truncate">
                <span className="material-symbols-outlined text-neutral-800 dark:text-[#a4c9ff] text-[15px] shrink-0">
                  location_on
                </span>
                <span className="font-label text-[11px] sm:text-xs font-bold truncate">
                  {kidMode ? currentStationInfo.kidLabel : currentStationInfo.label}
                </span>
              </div>
              <span className="material-symbols-outlined text-neutral-500 dark:text-[#c1c6d3] text-[15px] shrink-0">
                expand_more
              </span>
            </button>

            {stationMenuOpen && (
              <div className="absolute left-0 top-8 sm:top-9 w-64 bg-white dark:bg-[#0a1d2e] border border-neutral-300 dark:border-[#253648] rounded-xl shadow-xl z-50 p-1 space-y-0.5">
                {(Object.keys(stationLabels) as StationKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      onSelectStation(key);
                      setStationMenuOpen(false);
                    }}
                    className={`w-full flex flex-col px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                      station === key
                        ? 'bg-neutral-900 text-white dark:bg-[#0b5ea8] dark:text-white font-bold'
                        : 'text-neutral-800 dark:text-[#d2e4fc] hover:bg-neutral-100 dark:hover:bg-[#1a2b3d]'
                    }`}
                  >
                    <span className="text-xs font-headline font-bold">
                      {kidMode ? stationLabels[key].kidLabel : stationLabels[key].label}
                    </span>
                    <span className="text-[10px] font-mono opacity-85">
                      {kidMode ? stationLabels[key].kidNote : stationLabels[key].coords}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Network Connection Controls & Sync Queue Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Online / Offline / Syncing Status Badge */}
            <div
              className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border text-[9.5px] sm:text-[10px] font-mono font-bold tracking-wider uppercase transition-colors ${
                effectiveConnState === 'ONLINE'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-400'
                  : effectiveConnState === 'SYNCING'
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-400'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-400'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {effectiveConnState === 'ONLINE' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    effectiveConnState === 'ONLINE'
                      ? 'bg-emerald-600'
                      : effectiveConnState === 'SYNCING'
                      ? 'bg-blue-600 animate-pulse'
                      : 'bg-amber-600'
                  }`}
                />
              </span>
              <span>
                {effectiveConnState === 'ONLINE'
                  ? '● ONLINE'
                  : effectiveConnState === 'SYNCING'
                  ? `↻ SYNCING ${dataCtx.syncProgress.current}/${dataCtx.syncProgress.total || 1}`
                  : '● OFFLINE'}
              </span>
            </div>

            {/* Offline Simulation Toggle Button */}
            <button
              onClick={handleToggleConn}
              title={effectiveConnState === 'ONLINE' ? 'Cut simulated link and test offline local-first mode' : 'Reconnect to network and burst synchronize queued changes'}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9.5px] sm:text-[10px] font-label font-bold flex items-center gap-1 border transition-all active:scale-95 ${
                effectiveConnState === 'ONLINE'
                  ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 border-emerald-700'
              }`}
            >
              <span className="material-symbols-outlined text-[12px] sm:text-[13px]">
                {effectiveConnState === 'ONLINE' ? 'wifi_off' : 'sync'}
              </span>
              <span className="hidden sm:inline">
                {effectiveConnState === 'ONLINE' ? 'SIMULATE OFFLINE' : 'RESTORE CONNECTION'}
              </span>
            </button>

            {/* Pending Offline Queue Drawer Trigger */}
            <button
              onClick={handleOpenQueue}
              title={count > 0 ? `${count} pending operations in local queue. Click to synchronize.` : 'Local queue empty'}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9.5px] sm:text-[10px] font-label font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-300 dark:border-[#253648] text-neutral-800 dark:text-[#d2e4fc] flex items-center gap-1 shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[12px] sm:text-[13px]">cloud_sync</span>
              <span className="uppercase">QUEUE</span>
              <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold ${
                count > 0 ? 'bg-amber-600 text-white' : 'bg-black dark:bg-[#a4c9ff] text-white dark:text-[#00315d]'
              }`}>
                {count}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Offline Status & Progress Banner (Requirement 15) */}
      {effectiveConnState === 'OFFLINE' && (
        <div className="bg-amber-500/15 dark:bg-amber-950/50 border-t border-amber-500/30 px-3 py-1 flex items-center justify-between gap-2 text-xs font-mono text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="font-bold uppercase tracking-wider shrink-0">OFFLINE MODE</span>
            <span className="truncate hidden sm:inline">&ldquo;Your changes are being saved locally.&rdquo;</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-950 dark:text-amber-100 font-bold">
              Pending changes: {count}
            </span>
            <button
              onClick={dataCtx.restoreConnectionAndSync}
              className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] tracking-wide uppercase transition-colors"
            >
              Sync Now
            </button>
          </div>
        </div>
      )}

      {effectiveConnState === 'SYNCING' && (
        <div className="bg-blue-500/15 dark:bg-blue-950/50 border-t border-blue-500/30 px-3 py-1 flex items-center justify-between gap-2 text-xs font-mono text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] animate-spin text-blue-600 dark:text-blue-400">sync</span>
            <span className="font-bold">SYNCING {dataCtx.syncProgress.current}/{dataCtx.syncProgress.total || 1}</span>
            <span className="hidden sm:inline text-[11px] text-blue-700 dark:text-blue-300">
              {dataCtx.syncProgress.lastProcessedItem || 'Transmitting queued operations to Cloud Firestore...'}
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300">
            Processing Queue
          </span>
        </div>
      )}

      {effectiveConnState === 'ONLINE' && dataCtx.syncProgress.status === 'SUCCESS' && count === 0 && (
        <div className="bg-emerald-500/10 dark:bg-emerald-950/30 border-t border-emerald-500/20 px-3 py-0.5 flex items-center justify-center gap-1.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
          <span className="material-symbols-outlined text-[13px] text-emerald-600 dark:text-emerald-400">check_circle</span>
          <span className="font-bold uppercase tracking-wider">ALL CHANGES SYNCHRONIZED</span>
        </div>
      )}
    </header>
  );
};
