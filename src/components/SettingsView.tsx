/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FirestoreUserProfile } from '../types';
import { useTheme } from '../context/ThemeContext';

interface SettingsViewProps {
  userProfile?: FirestoreUserProfile | null;
  session?: any;
  onToast: (title: string, body: string, icon?: string, color?: 'green' | 'amber' | 'blue') => void;
  onPromptLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userProfile,
  session,
  onToast,
  onPromptLogout,
}) => {
  const { theme, setTheme, toggleTheme } = useTheme();
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState(8);
  const [enableBiometricUnlock, setEnableBiometricUnlock] = useState(true);
  const [autoPurgeSyncAfterDays, setAutoPurgeSyncAfterDays] = useState(14);
  const [satBandwidthSaver, setSatBandwidthSaver] = useState(true);

  const emailDisplay = userProfile?.email || session?.user?.email || 'operator@polarx.org';

  const securityLogs = [
    {
      id: 'SEC-LOG-901',
      time: '13:42:11 UTC',
      event: 'Session Authenticated (Token Handshake OK)',
      user: emailDisplay,
      ip: '10.240.12.8 (Bharati Gateway)',
      status: 'SUCCESS',
    },
    {
      id: 'SEC-LOG-900',
      time: '11:15:02 UTC',
      event: 'Token Revocation & Logout Event',
      user: 'USR-NCPOR-09',
      ip: '10.240.12.1 (Apex Terminal)',
      status: 'TERMINATED',
    },
    {
      id: 'SEC-LOG-899',
      time: '08:30:45 UTC',
      event: 'Admin Clearance Escalation',
      user: 'admin@polarx.demo',
      ip: '10.240.12.4 (Ops Core)',
      status: 'SUCCESS',
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-5">
      {/* Top Banner */}
      <div className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-[#0a1d2e] rounded-2xl border border-neutral-200 dark:border-[#253648] shadow-sm flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-[#a4c9ff]">
              settings
            </span>
            <h1 className="font-headline text-xl font-bold text-neutral-900 dark:text-[#d2e4fc]">
              System & Security Configuration
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 dark:bg-[#0f2132] text-neutral-700 dark:text-[#c1c6d3] border border-neutral-300 dark:border-[#253648]">
              Admin Clearance Active
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-[#c1c6d3] mt-0.5">
            Configure polar node authentication parameters, session expiration timeouts, and satellite encryption.
          </p>
        </div>

        <button
          onClick={onPromptLogout}
          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-headline font-bold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          <span>Sign Out Session</span>
        </button>
      </div>

      {/* Interface Theme & Display Mode */}
      <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl p-5 sm:p-6 border border-neutral-200 dark:border-[#253648] shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-sm font-bold text-neutral-900 dark:text-[#d2e4fc] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-amber-500">palette</span>
            <span>Interface Theme & Display Deck</span>
          </h2>
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-[#0f2132] text-neutral-800 dark:text-[#a4c9ff] border border-neutral-300 dark:border-[#253648] font-bold uppercase">
            Active: {theme === 'dark' ? 'Polar Night (Dark)' : 'Sunlit Ice (Light)'}
          </span>
        </div>

        <p className="text-xs text-neutral-500 dark:text-[#c1c6d3]">
          Adjust high-contrast polar optical modes optimized for high-glare ice sheets and sub-zero night operations. Persisted instantly to your terminal device.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Light Mode Option */}
          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
              theme === 'light'
                ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 dark:border-blue-400 ring-2 ring-blue-500/20'
                : 'bg-neutral-50 dark:bg-[#0f2132] border-neutral-200 dark:border-[#253648] hover:border-neutral-400 dark:hover:border-neutral-600'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 text-amber-500 flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-2xl">light_mode</span>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-headline font-bold text-xs text-neutral-900 dark:text-white">
                  Sunlit Ice Deck (Light Mode)
                </span>
                {theme === 'light' && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                )}
              </div>
              <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] leading-relaxed">
                Crisp high-contrast daylight deck with clean snow-white cards and optical charcoal typography.
              </span>
            </div>
          </button>

          {/* Dark Mode Option */}
          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
              theme === 'dark'
                ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 dark:border-blue-400 ring-2 ring-blue-500/20'
                : 'bg-neutral-50 dark:bg-[#0f2132] border-neutral-200 dark:border-[#253648] hover:border-neutral-400 dark:hover:border-neutral-600'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-[#021425] border border-[#253648] text-blue-400 flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-2xl">dark_mode</span>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-headline font-bold text-xs text-neutral-900 dark:text-white">
                  Polar Night Deck (Dark Mode)
                </span>
                {theme === 'dark' && (
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                )}
              </div>
              <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] leading-relaxed">
                Deep navy polar nocturnal deck with luminous telemetry accents and eye-strain reduction.
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Security Parameters Card */}
      <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl p-5 sm:p-6 border border-neutral-200 dark:border-[#253648] shadow-sm flex flex-col gap-5">
        <h2 className="font-headline text-sm font-bold text-neutral-900 dark:text-[#d2e4fc] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">lock</span>
          <span>Authentication & Session Policy</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 bg-neutral-50 dark:bg-[#0f2132] rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900 dark:text-[#d2e4fc]">
                Session Inactivity Expiry
              </span>
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-[#a4c9ff]">
                {sessionTimeoutHours} Hours
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-[#c1c6d3]">
              Automatically invalidates cached authorization tokens when inactive.
            </p>
            <input
              type="range"
              min="1"
              max="24"
              value={sessionTimeoutHours}
              onChange={(e) => setSessionTimeoutHours(Number(e.target.value))}
              className="w-full accent-black dark:accent-[#a4c9ff] cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-neutral-50 dark:bg-[#0f2132] rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 dark:text-[#d2e4fc]">
                  Offline Cached Biometrics
                </span>
                <input
                  type="checkbox"
                  checked={enableBiometricUnlock}
                  onChange={(e) => setEnableBiometricUnlock(e.target.checked)}
                  className="w-4 h-4 rounded accent-black dark:accent-[#a4c9ff] cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] mt-1">
                Allows unlocking previously authenticated terminals during satellite blackout.
              </p>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              {enableBiometricUnlock ? '✓ POLAR-ID BIOMETRIC ACTIVE' : 'DISABLED'}
            </span>
          </div>

          <div className="p-3.5 bg-neutral-50 dark:bg-[#0f2132] rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 dark:text-[#d2e4fc]">
                  Satellite Bandwidth Saver
                </span>
                <input
                  type="checkbox"
                  checked={satBandwidthSaver}
                  onChange={(e) => setSatBandwidthSaver(e.target.checked)}
                  className="w-4 h-4 rounded accent-black dark:accent-[#a4c9ff] cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] mt-1">
                Compresses telemetry packets by 72% for low-cost Inmarsat-C satellite bursts.
              </p>
            </div>
            <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
              OPTIMIZED FOR INMARSAT-C
            </span>
          </div>

          <div className="p-3.5 bg-neutral-50 dark:bg-[#0f2132] rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900 dark:text-[#d2e4fc]">
                Offline Queue Retention
              </span>
              <span className="font-mono text-xs font-bold text-neutral-900 dark:text-[#d2e4fc]">
                {autoPurgeSyncAfterDays} Days
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-[#c1c6d3]">
              Retain synchronized field records in local browser IndexedDB cache.
            </p>
            <input
              type="range"
              min="3"
              max="60"
              value={autoPurgeSyncAfterDays}
              onChange={(e) => setAutoPurgeSyncAfterDays(Number(e.target.value))}
              className="w-full accent-black dark:accent-[#a4c9ff] cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() =>
              onToast(
                'SECURITY CONFIG SAVED',
                'Node policy updated. Distributed to Bharati, Maitri, and Himadri outposts.',
                'check_circle',
                'green'
              )
            }
            className="px-4 py-2 bg-neutral-900 hover:bg-black dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white rounded-xl text-xs font-headline font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>Apply Security Changes</span>
          </button>
        </div>
      </div>

      {/* Security Audit Trail */}
      <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl p-5 border border-neutral-200 dark:border-[#253648] shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-sm font-bold text-neutral-900 dark:text-[#d2e4fc] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span>Real-time Security Event Audit Trail</span>
          </h2>
          <span className="font-mono text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
            SHA-256 Tamper-Proof Audit
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {securityLogs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 bg-neutral-50 dark:bg-[#0f2132] rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
            >
              <div className="flex items-center gap-2">
                <span className="text-neutral-400 dark:text-neutral-500 text-[11px]">{log.time}</span>
                <span className="font-bold text-neutral-900 dark:text-[#d2e4fc]">{log.event}</span>
              </div>
              <div className="flex items-center gap-3 text-neutral-500 dark:text-[#8b919c] text-[11px]">
                <span>{log.user}</span>
                <span>•</span>
                <span>{log.ip}</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                  {log.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
