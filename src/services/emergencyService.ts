/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POLARX Emergency & SAR Coordination Service
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as idb from '../db/indexedDB';
import { EmergencyIncident, EmergencyResource, AlertItem, SyncQueueRecord } from '../types';
import { logActivity } from './activityLogService';

export async function fetchEmergencies(): Promise<EmergencyIncident[]> {
  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('emergency_incidents')
        .select('*')
        .order('reported_at', { ascending: false });

      if (!error && data) {
        await idb.bulkUpsertStore('emergency_incidents', data);
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetchEmergencies error, using IDB:', err);
    }
  }
  return idb.getAllFromStore<EmergencyIncident>('emergency_incidents');
}

export async function createEmergencyIncident(
  data: Partial<EmergencyIncident>,
  resources: Partial<EmergencyResource>[] = []
): Promise<{ incident: EmergencyIncident; resources: EmergencyResource[] }> {
  const incidentId = data.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `emg-${Date.now()}`);
  const incidentCode = data.incident_code || `EMG-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const incident: EmergencyIncident = {
    id: incidentId,
    incident_code: incidentCode,
    expedition_id: data.expedition_id || null,
    incident_type: data.incident_type || 'CREVASSE_FALL',
    severity: data.severity || 'CRITICAL',
    title: data.title || 'Polar Distress Incident',
    description: data.description || 'Emergency declared in operational sector.',
    location_id: data.location_id || null,
    latitude: data.latitude || -69.4069,
    longitude: data.longitude || 76.1950,
    status: data.status || 'ACTIVE',
    reported_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  };

  await idb.putInStore('emergency_incidents', incident);

  const createdResources: EmergencyResource[] = [];
  for (const r of resources) {
    const resItem: EmergencyResource = {
      id: r.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `res-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`),
      incident_id: incidentId,
      resource_type: r.resource_type || 'PERSONNEL',
      resource_name: r.resource_name || 'Emergency SAR Responder',
      quantity: r.quantity || 1,
      assigned_to: r.assigned_to || 'SAR Lead Navigator',
      status: r.status || 'EN_ROUTE',
      created_at: new Date().toISOString(),
    };
    await idb.putInStore('emergency_resources', resItem);
    createdResources.push(resItem);
  }

  // Create Critical Alert
  const alertItem: AlertItem = {
    id: `alert-emg-${incidentId}`,
    alert_type: 'DEFCON_EMERGENCY_ESCALATION',
    severity: incident.severity,
    title: `EMERGENCY [${incidentCode}]: ${incident.title}`,
    message: incident.description,
    entity_type: 'emergency_incidents',
    entity_id: incidentId,
    expedition_id: incident.expedition_id,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  };
  await idb.putInStore('alerts', alertItem);

  await logActivity('DECLARE_EMERGENCY', 'emergency_incidents', incidentId, null, incident);

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      await supabase.from('emergency_incidents').insert([incident]);
      if (createdResources.length > 0) {
        await supabase.from('emergency_resources').insert(createdResources);
      }
      await supabase.from('alerts').insert([alertItem]);
    } catch (err) {
      console.warn('Supabase emergency insert error, queued for sync:', err);
      const syncItem: SyncQueueRecord = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}`,
        device_id: 'WEB_TERMINAL',
        operation: 'CREATE',
        entity_type: 'emergency_incidents',
        entity_id: incidentId,
        payload: { incident, resources: createdResources, alert: alertItem },
        created_at: new Date().toISOString(),
        sync_status: 'PENDING',
        retry_count: 0,
      };
      await idb.addSyncQueueRecord(syncItem);
    }
  } else {
    const syncItem: SyncQueueRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}`,
      device_id: 'WEB_TERMINAL',
      operation: 'CREATE',
      entity_type: 'emergency_incidents',
      entity_id: incidentId,
      payload: { incident, resources: createdResources, alert: alertItem },
      created_at: new Date().toISOString(),
      sync_status: 'PENDING',
      retry_count: 0,
    };
    await idb.addSyncQueueRecord(syncItem);
  }

  return { incident, resources: createdResources };
}

export async function updateEmergencyStatus(
  id: string,
  status: string,
  resolutionNote?: string
): Promise<EmergencyIncident | null> {
  const existing = await idb.getFromStore<EmergencyIncident>('emergency_incidents', id);
  if (!existing) return null;

  const updated: EmergencyIncident = {
    ...existing,
    status,
    resolved_at: status === 'RESOLVED' ? new Date().toISOString() : existing.resolved_at,
    updated_at: new Date().toISOString(),
    version: (existing.version || 1) + 1,
  };

  await idb.putInStore('emergency_incidents', updated);
  await logActivity('UPDATE_EMERGENCY_STATUS', 'emergency_incidents', id, existing, updated);

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      await supabase.from('emergency_incidents').update(updated).eq('id', id);
    } catch (err) {
      const syncItem: SyncQueueRecord = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}`,
        device_id: 'WEB_TERMINAL',
        operation: 'UPDATE',
        entity_type: 'emergency_incidents',
        entity_id: id,
        payload: updated,
        created_at: new Date().toISOString(),
        sync_status: 'PENDING',
        retry_count: 0,
      };
      await idb.addSyncQueueRecord(syncItem);
    }
  } else {
    const syncItem: SyncQueueRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}`,
      device_id: 'WEB_TERMINAL',
      operation: 'UPDATE',
      entity_type: 'emergency_incidents',
      entity_id: id,
      payload: updated,
      created_at: new Date().toISOString(),
      sync_status: 'PENDING',
      retry_count: 0,
    };
    await idb.addSyncQueueRecord(syncItem);
  }

  return updated;
}
