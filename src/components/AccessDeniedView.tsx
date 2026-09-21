/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLE_DETAILS } from '../firebase/authService';
import { FirebaseUserRole, UserProfile } from '../types';

interface AccessDeniedViewProps {
  attemptedRoute: string;
  userRole?: string;
  currentUser?: UserProfile | null;
  session?: any;
  onNavigateHome?: () => void;
  onOpenProfile?: () => void;
  onPromptLogout?: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  attemptedRoute,
  userRole,
  currentUser,
  session,
  onNavigateHome,
  onOpenProfile,
  onPromptLogout,
}) => {
  const { userProfile, logout } = useAuth();

  const roleKey = (userRole || userProfile?.role || session?.user?.role || 'RESEARCHER') as FirebaseUserRole;
  const roleInfo = ROLE_DETAILS[roleKey] || ROLE_DETAILS.RESEARCHER;
  const userName = currentUser?.name || userProfile?.displayName || userProfile?.fullName || session?.user?.name || 'Polar Operator';
  const clearance = currentUser?.clearance || roleInfo.clearance;

  const getRequiredRoleInfo = (route: string) => {
    switch ((route || '').toLowerCase()) {
      case 'emergency':
      case 'sos':
        return {
          roles: ['EXPEDITION OFFICER', 'ADMIN'],
          clearance: 'LEVEL-3 FIELD TACTICAL or higher',
          reason: 'Emergency Distress Beacons and SAR command sorties require tactical clearance to prevent accidental continental callouts.',
        };
      case 'personnel':
        return {
          roles: ['EXPEDITION OFFICER', 'ADMIN'],
          clearance: 'LEVEL-3 FIELD TACTICAL or higher',
          reason: 'Personnel medical evaluations, duty assignments, and confidential field dossiers are restricted to station officers.',
        };
      case 'cargo':
      case 'assets':
        return {
          roles: ['LOGISTICS MANAGER', 'EXPEDITION OFFICER', 'ADMIN'],
          clearance: 'LEVEL-3 or higher',
          reason: 'Heavy asset dispatch, vessel offloading, and sea-ice convoy manifests require logistics authorization.',
        };
      case 'inventory':
      case 'stock':
        return {
          roles: ['LOGISTICS MANAGER', 'RESEARCHER', 'ADMIN'],
          clearance: 'LEVEL-2 or higher',
          reason: 'Station consumable allocations and scientific specimen inventory are managed by logistics and research teams.',
        };
      case 'ai-insights':
      case 'ai':
        return {
          roles: ['RESEARCHER', 'ADMIN'],
          clearance: 'LEVEL-2 or higher',
          reason: 'Deep paleoclimate neural models and station telemetry drift training are reserved for scientific and admin staff.',
        };
      case 'reports':
        return {
          roles: ['LOGISTICS MANAGER', 'RESEARCHER', 'ADMIN'],
          clearance: 'LEVEL-2 or higher',
          reason: 'Formal government SITREPs and scientific audit ledgers are restricted to authorized mission leads.',
        };
      case 'settings':
      case 'sim':
        return {
          roles: ['ADMIN'],
          clearance: 'LEVEL-5 FULL COMMAND',
          reason: 'System parameters, sat-link encryption keys, and emergency simulation protocols require Administrator clearance.',
        };
      default:
        return {
          roles: ['ADMIN'],
          clearance: 'Higher Security Clearance',
          reason: 'This module is protected under NCPOR Polar Station Security Directives.',
        };
    }
  };

  const reqInfo = getRequiredRoleInfo(attemptedRoute);

  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-4 flex flex-col items-center text-center">
      {/* Tactical Warning Box */}
      <div className="w-full bg-white dark:bg-[#0a1d2e] rounded-2xl p-6 sm:p-8 border-2 border-red-600 dark:border-red-500 shadow-xl flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-700 flex items-center justify-center text-red-600 dark:text-red-400">
          <span className="material-symbols-outlined text-4xl">gpp_bad</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-xs uppercase tracking-widest text-red-600 dark:text-red-400 font-bold">
            SEC-POLICY RESTRICTION • 403 FORBIDDEN
          </span>
          <h1 className="font-headline text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc]">
            Access Denied
          </h1>
          <p className="font-label text-xs sm:text-sm text-neutral-500 dark:text-[#c1c6d3]">
            Insufficient clearance to access route:{' '}
            <span className="font-mono font-bold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-[#0f2132] px-2 py-0.5 rounded border border-neutral-300 dark:border-[#253648]">
              /{attemptedRoute}
            </span>
          </p>
        </div>

        {/* Current Credentials vs Required Clearance */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="p-3 bg-neutral-50 dark:bg-[#0f2132] rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-[#c1c6d3]">
              Your Current Identity
            </span>
            <span className="font-headline font-bold text-xs text-neutral-900 dark:text-[#d2e4fc] truncate">
              {userName}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase border bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800">
                {roleInfo.label}
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 dark:text-[#8b919c] mt-1">
              Clearance: {clearance}
            </span>
          </div>

          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 dark:text-amber-300 font-bold">
              Required Clearance
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {reqInfo.roles.map((r) => (
                <span
                  key={r}
                  className="px-1.5 py-0.5 bg-white dark:bg-[#0a1d2e] rounded text-[10px] font-mono font-bold text-neutral-900 dark:text-[#d2e4fc] border border-amber-300 dark:border-amber-700"
                >
                  {r}
                </span>
              ))}
            </div>
            <span className="text-[10.5px] text-amber-900 dark:text-amber-200 font-medium mt-1">
              Minimum: {reqInfo.clearance}
            </span>
          </div>
        </div>

        {/* Reason Explanation */}
        <div className="w-full p-3.5 bg-neutral-50 dark:bg-[#0f2132] rounded-xl border border-neutral-200 dark:border-[#253648] text-xs text-left text-neutral-600 dark:text-[#c1c6d3]">
          <span className="font-bold text-neutral-900 dark:text-[#d2e4fc] block mb-1">
            Protocol Security Directive:
          </span>
          {reqInfo.reason}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-2 flex-wrap w-full pt-2">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-black dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white rounded-xl text-xs font-headline font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">space_dashboard</span>
              <span>Return to Dashboard</span>
            </button>
          )}

          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="px-4 py-2.5 bg-white dark:bg-[#0f2132] hover:bg-neutral-100 dark:hover:bg-[#1a2b3d] text-neutral-800 dark:text-[#d2e4fc] border border-neutral-300 dark:border-[#253648] rounded-xl text-xs font-headline font-bold flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">badge</span>
              <span>View My Credentials</span>
            </button>
          )}

          {onPromptLogout ? (
            <button
              onClick={onPromptLogout}
              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl text-xs font-headline font-bold flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">switch_account</span>
              <span>Switch Account</span>
            </button>
          ) : (
            <button
              onClick={() => logout()}
              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl text-xs font-headline font-bold flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
