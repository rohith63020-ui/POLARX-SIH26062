/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POLARX Location Service
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as idb from '../db/indexedDB';
import { Location } from '../types';

export async function fetchLocations(): Promise<Location[]> {
  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      const { data, error } = await supabase.from('locations').select('*');
      if (!error && data) {
        await idb.bulkUpsertStore('locations', data);
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetchLocations error, fallback to IDB:', err);
    }
  }
  return idb.getAllFromStore<Location>('locations');
}

export async function getLocationById(id: string): Promise<Location | null> {
  const local = await idb.getFromStore<Location>('locations', id);
  if (local) return local;

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      const { data } = await supabase.from('locations').select('*').eq('id', id).single();
      if (data) {
        await idb.putInStore('locations', data);
        return data;
      }
    } catch {}
  }
  return null;
}
