/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POLARX Central Authentication & Role-Based Access Control (RBAC) Service
 * Supports Supabase Auth, PostgreSQL profiles, and seamless offline-first local access.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as idb from '../db/indexedDB';
import { Profile, UserRole, UserProfile } from '../types';
import { logActivity } from './activityLogService';

export const ROLE_PERMISSIONS: Record<
  UserRole,
  {
    canManageExpeditions: boolean;
    canManageAssets: boolean;
    canManageCargo: boolean;
    canUpdateInventory: boolean;
    canDeclareEmergency: boolean;
    canAcknowledgeAlerts: boolean;
    canEditSystemSettings: boolean;
    isReadOnly: boolean;
  }
> = {
  admin: {
    canManageExpeditions: true,
    canManageAssets: true,
    canManageCargo: true,
    canUpdateInventory: true,
    canDeclareEmergency: true,
    canAcknowledgeAlerts: true,
    canEditSystemSettings: true,
    isReadOnly: false,
  },
  expedition_manager: {
    canManageExpeditions: true,
    canManageAssets: true,
    canManageCargo: true,
    canUpdateInventory: true,
    canDeclareEmergency: true,
    canAcknowledgeAlerts: true,
    canEditSystemSettings: false,
    isReadOnly: false,
  },
  logistics_manager: {
    canManageExpeditions: false,
    canManageAssets: true,
    canManageCargo: true,
    canUpdateInventory: true,
    canDeclareEmergency: true,
    canAcknowledgeAlerts: true,
    canEditSystemSettings: false,
    isReadOnly: false,
  },
  researcher: {
    canManageExpeditions: false,
    canManageAssets: false,
    canManageCargo: false,
    canUpdateInventory: true,
    canDeclareEmergency: true,
    canAcknowledgeAlerts: true,
    canEditSystemSettings: false,
    isReadOnly: false,
  },
  field_operator: {
    canManageExpeditions: false,
    canManageAssets: true,
    canManageCargo: true,
    canUpdateInventory: true,
    canDeclareEmergency: true,
    canAcknowledgeAlerts: true,
    canEditSystemSettings: false,
    isReadOnly: false,
  },
  emergency_operator: {
    canManageExpeditions: false,
    canManageAssets: false,
    canManageCargo: false,
    canUpdateInventory: false,
    canDeclareEmergency: true,
    canAcknowledgeAlerts: true,
    canEditSystemSettings: false,
    isReadOnly: false,
  },
  viewer: {
    canManageExpeditions: false,
    canManageAssets: false,
    canManageCargo: false,
    canUpdateInventory: false,
    canDeclareEmergency: false,
    canAcknowledgeAlerts: false,
    canEditSystemSettings: false,
    isReadOnly: true,
  },
};

export const DEFAULT_PROFILES: Record<UserRole, Profile> = {
  admin: {
    id: '11111111-aaaa-1111-aaaa-111111111111',
    full_name: 'Dr. Vikramaditya Sen',
    email: 'admin@polarx.ncpor.gov.in',
    phone: '+91-98200-11221',
    role: 'admin',
    organization: 'NCPOR Goa Headquarters',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  expedition_manager: {
    id: '22222222-aaaa-2222-aaaa-222222222222',
    full_name: 'Lt. Col. Rajesh Nair',
    email: 'expedition@polarx.ncpor.gov.in',
    phone: '+91-98200-33441',
    role: 'expedition_manager',
    organization: 'Bharati Polar Station',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  logistics_manager: {
    id: '33333333-aaaa-3333-aaaa-333333333333',
    full_name: 'Sgt. Major Balwinder Singh',
    email: 'logistics@polarx.ncpor.gov.in',
    phone: '+91-98200-55661',
    role: 'logistics_manager',
    organization: 'Cape Town Port Hub',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  researcher: {
    id: '44444444-aaaa-4444-aaaa-444444444444',
    full_name: 'Dr. Ananya Sharma',
    email: 'researcher@polarx.ncpor.gov.in',
    phone: '+91-98200-44551',
    role: 'researcher',
    organization: 'Himadri Arctic Station',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  field_operator: {
    id: '55555555-aaaa-5555-aaaa-555555555555',
    full_name: 'Tsering Dorjee',
    email: 'operator@polarx.ncpor.gov.in',
    phone: '+91-98200-99001',
    role: 'field_operator',
    organization: 'Larsemann Traverse Team',
    avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  emergency_operator: {
    id: '66666666-aaaa-6666-aaaa-666666666666',
    full_name: 'Dr. Meera Nambiar',
    email: 'sar@polarx.ncpor.gov.in',
    phone: '+91-98200-77881',
    role: 'emergency_operator',
    organization: 'Maitri SAR Coordination Center',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  viewer: {
    id: '77777777-aaaa-7777-aaaa-777777777777',
    full_name: 'Ministry Polar Observer',
    email: 'viewer@polarx.ncpor.gov.in',
    phone: '+91-11-24600000',
    role: 'viewer',
    organization: 'Ministry of Earth Sciences (MoES)',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
};

export async function loginWithEmail(email: string, roleInput?: UserRole): Promise<Profile> {
  const normalizedEmail = email.toLowerCase().trim();
  let selectedRole: UserRole = roleInput || 'researcher';

  if (normalizedEmail.includes('admin')) selectedRole = 'admin';
  else if (normalizedEmail.includes('expedition') || normalizedEmail.includes('commander')) selectedRole = 'expedition_manager';
  else if (normalizedEmail.includes('logistics') || normalizedEmail.includes('cargo')) selectedRole = 'logistics_manager';
  else if (normalizedEmail.includes('field') || normalizedEmail.includes('operator')) selectedRole = 'field_operator';
  else if (normalizedEmail.includes('sar') || normalizedEmail.includes('emergency')) selectedRole = 'emergency_operator';
  else if (normalizedEmail.includes('viewer') || normalizedEmail.includes('guest')) selectedRole = 'viewer';

  let profile: Profile = DEFAULT_PROFILES[selectedRole];
  profile = {
    ...profile,
    email: normalizedEmail || profile.email,
  };

  // If Supabase is online and configured
  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (userProfile) {
        profile = userProfile;
      } else {
        // Create user in profiles table
        await supabase.from('profiles').upsert([profile]);
      }
    } catch (err) {
      console.warn('Supabase auth fallback to local IndexedDB session:', err);
    }
  }

  // Persist in local storage & IndexedDB
  await idb.putInStore('profiles', profile);
  localStorage.setItem('polarx_active_user', JSON.stringify(profile));

  await logActivity('USER_LOGIN', 'profiles', profile.id, null, { email: profile.email, role: profile.role });
  return profile;
}

export async function getActiveProfile(): Promise<Profile | null> {
  try {
    const saved = localStorage.getItem('polarx_active_user');
    if (saved) {
      const parsed: Profile = JSON.parse(saved);
      return parsed;
    }
  } catch {}
  return DEFAULT_PROFILES.admin;
}

export async function logoutUser(): Promise<void> {
  const current = await getActiveProfile();
  if (current) {
    await logActivity('USER_LOGOUT', 'profiles', current.id, null, { email: current.email });
  }
  localStorage.removeItem('polarx_active_user');
  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      await supabase.auth.signOut();
    } catch {}
  }
}
