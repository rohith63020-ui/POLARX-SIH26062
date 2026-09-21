/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { FirestoreUserProfile } from '../types';
import { PolarLogo } from './PolarLogo';
import { ROLE_DETAILS } from '../firebase/authService';
import { ROLE_PERMISSIONS } from '../context/AuthContext';

interface ProfileViewProps {
  profile: FirestoreUserProfile;
  currentUser: FirebaseUser | null;
  onPromptLogout: () => void;
  onNavigateTab: (tab: string) => void;
  onToast: (title: string, body: string, icon?: string, color?: 'green' | 'amber' | 'blue') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  currentUser,
  onPromptLogout,
  onNavigateTab,
  onToast,
}) => {
  const roleInfo = ROLE_DETAILS[profile.role] || {
    label: profile.role,
    clearance: 'OPERATIONAL CLEARANCE',
    defaultStation: 'Bharati Station',
  };

  const getRoleColors = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          bg: 'bg-red-100 dark:bg-red-950/60',
          text: 'text-red-700 dark:text-red-300',
          border: 'border-red-300 dark:border-red-800',
        };
      case 'LOGISTICS_MANAGER':
        return {
          bg: 'bg-blue-100 dark:bg-blue-950/60',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-blue-300 dark:border-blue-800',
        };
      case 'EXPEDITION_OFFICER':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-950/60',
          text: 'text-emerald-700 dark:text-emerald-300',
          border: 'border-emerald-300 dark:border-emerald-800',
        };
      case 'RESEARCHER':
        return {
          bg: 'bg-purple-100 dark:bg-purple-950/60',
          text: 'text-purple-700 dark:text-purple-300',
          border: 'border-purple-300 dark:border-purple-800',
        };
      default:
        return {
          bg: 'bg-neutral-100 dark:bg-neutral-800',
          text: 'text-neutral-700 dark:text-neutral-300',
          border: 'border-neutral-300 dark:border-neutral-700',
        };
    }
  };

  const roleColors = getRoleColors(profile.role);
  const permissions = ROLE_PERMISSIONS[profile.role] || [];

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Not recorded';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      }) + ' UTC';
    } catch {
      return isoString;
    }
  };

  return (
    <div id="polarx-profile-view" className="w-full max-w-4xl mx-auto flex flex-col gap-5">
      {/* Top Banner with Real Firebase Verification Notice */}
      <div className="flex items-center justify-between gap-3 p-3 bg-neutral-100 dark:bg-[#071A2B] rounded-xl border border-neutral-200 dark:border-[#253648] flex-wrap">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[20px]">
            verified_user
          </span>
          <div>
            <div className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc]">
              POLARX Real Firebase Authentication Session
            </div>
            <div className="text-[11px] font-mono text-neutral-500 dark:text-[#c1c6d3]">
              Cloud Firestore Profile Synchronized • UID Keyed Document
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AUTH: ACTIVE
          </span>
          <button
            onClick={() => onNavigateTab('dashboard')}
            className="px-3 py-1 bg-white dark:bg-[#0f2132] hover:bg-neutral-100 text-neutral-800 dark:text-[#d2e4fc] border border-neutral-300 dark:border-[#253648] rounded-lg text-xs font-bold transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Main Profile Identity Card */}
      <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl p-6 border-2 border-neutral-900 dark:border-[#253648] shadow-md flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-[#253648]">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={
                  profile.photoURL ||
                  profile.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                }
                alt={profile.displayName || profile.fullName}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-neutral-900 dark:border-[#a4c9ff] shadow-md"
              />
              <span className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black uppercase bg-black dark:bg-[#0b5ea8] text-white border border-white dark:border-[#021425]">
                POL-ID
              </span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-headline text-2xl font-black text-neutral-900 dark:text-[#d2e4fc]">
                  {profile.displayName || profile.fullName}
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold uppercase border ${roleColors.bg} ${roleColors.text} ${roleColors.border}`}
                >
                  {profile.role}
                </span>
              </div>
              <p className="font-mono text-xs text-neutral-500 dark:text-[#c1c6d3] mt-0.5">
                {profile.email}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs font-medium text-neutral-600 dark:text-[#8b919c]">
                <span className="material-symbols-outlined text-[15px]">location_on</span>
                <span>{profile.station || roleInfo.defaultStation}</span>
                <span>•</span>
                <span>{profile.organization}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2.5 w-full sm:w-auto">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-[#071A2B] border border-neutral-200 dark:border-[#253648]">
              <PolarLogo size="xs" />
              <span className="font-mono text-[10px] font-bold text-neutral-700 dark:text-[#a4c9ff]">
                NCPOR POLAR CREDENTIAL
              </span>
            </div>
            <button
              id="profile-signout-btn"
              onClick={onPromptLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-headline font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out of POLARX</span>
            </button>
            <span className="text-[10px] font-mono text-neutral-500 dark:text-[#c1c6d3]">
              Terminates Firebase Auth Session
            </span>
          </div>
        </div>

        {/* Tactical Key Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-3.5 bg-neutral-50 dark:bg-[#0f2132] rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 dark:text-[#c1c6d3]">
              Firebase Auth UID
            </span>
            <span className="font-mono text-xs font-bold text-neutral-900 dark:text-[#d2e4fc] truncate">
              {profile.uid}
            </span>
            <span className="text-[10.5px] text-neutral-600 dark:text-[#8b919c]">
              Firestore users/{profile.uid}
            </span>
          </div>

          <div className="p-3.5 bg-neutral-50 dark:bg-[#0f2132] rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 dark:text-[#c1c6d3]">
              Clearance Level
            </span>
            <span className="font-mono text-sm font-bold text-neutral-900 dark:text-[#d2e4fc]">
              {roleInfo.clearance}
            </span>
            <span className="text-[10.5px] text-neutral-600 dark:text-[#8b919c]">
              {roleInfo.label}
            </span>
          </div>

          <div className="p-3.5 bg-neutral-50 dark:bg-[#0f2132] rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 dark:text-[#c1c6d3]">
              Organization
            </span>
            <span className="font-mono text-xs font-bold text-neutral-900 dark:text-[#d2e4fc] truncate">
              {profile.organization}
            </span>
            <span className="text-[10.5px] text-neutral-600 dark:text-[#8b919c]">
              National Polar Directorate
            </span>
          </div>

          <div className="p-3.5 bg-neutral-50 dark:bg-[#0f2132] rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 dark:text-[#c1c6d3]">
              Account Created
            </span>
            <span className="font-mono text-xs font-bold text-neutral-900 dark:text-[#d2e4fc]">
              {formatDate(profile.createdAt)}
            </span>
            <span className="text-[10.5px] text-neutral-600 dark:text-[#8b919c]">
              Registered via Firebase Auth
            </span>
          </div>

          <div className="p-3.5 bg-neutral-50 dark:bg-[#0f2132] rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 dark:text-[#c1c6d3]">
              Last Login
            </span>
            <span className="font-mono text-xs font-bold text-neutral-900 dark:text-[#d2e4fc]">
              {formatDate(profile.lastLogin)}
            </span>
            <span className="text-[10.5px] text-neutral-600 dark:text-[#8b919c]">
              Firestore Timestamp Sync
            </span>
          </div>

          <div className="p-3.5 bg-neutral-50 dark:bg-[#0f2132] rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 dark:text-[#c1c6d3]">
              Auth Provider
            </span>
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {profile.provider === 'google'
                ? 'Google Identity (OAuth)'
                : 'Email / Password (Firebase)'}
            </span>
            <span className="text-[10.5px] text-neutral-600 dark:text-[#8b919c]">
              {profile.provider === 'google'
                ? 'Authenticated via Google Identity Provider'
                : 'Passwords hashed & salted by Google'}
            </span>
          </div>
        </div>

        {/* Role-Based Access Privileges Matrix */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-[#d2e4fc] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-blue-600 dark:text-[#a4c9ff]">
                lock_open
              </span>
              <span>Role Permissions Matrix ({profile.role})</span>
            </h3>
            <span className="text-[11px] font-mono text-neutral-500 dark:text-[#c1c6d3]">
              Enforced by Firestore Security Rules & Router
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {[
              { route: 'dashboard', label: 'Dashboard (Ops)', icon: 'dashboard' },
              { route: 'expeditions', label: 'Expeditions', icon: 'explore' },
              { route: 'cargo', label: 'Cargo Logistics', icon: 'local_shipping' },
              { route: 'assets', label: 'Asset Keystore', icon: 'inventory_2' },
              { route: 'inventory', label: 'Stock Buffer', icon: 'warehouse' },
              { route: 'personnel', label: 'Field Personnel', icon: 'badge' },
              { route: 'ai-insights', label: 'AI Intelligence', icon: 'auto_awesome' },
              { route: 'emergency', label: 'SAR Emergency', icon: 'emergency' },
              { route: 'reports', label: 'Tactical Reports', icon: 'description' },
              { route: 'settings', label: 'System Settings', icon: 'settings' },
            ].map((item) => {
              const isAllowed = permissions.includes(item.route);
              return (
                <div
                  key={item.route}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    isAllowed
                      ? 'bg-emerald-50/50 dark:bg-[#072418] border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-300'
                      : 'bg-neutral-50 dark:bg-[#091522] border-neutral-200 dark:border-[#253648] text-neutral-400 dark:text-[#6a7280] opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-[16px]">
                      {item.icon}
                    </span>
                    <span className="font-headline text-xs font-bold truncate">
                      {item.label}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[16px]">
                    {isAllowed ? 'check_circle' : 'block'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
