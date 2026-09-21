/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { INITIAL_SAR_INCIDENT } from '../data/initialData';
import { SarIncident, SitrepEvent, EmergencyResource, PersonnelMember } from '../types';
import { useData } from '../context/DataContext';

interface EmergencyCenterProps {
  onOpenModal: (title: string, body: React.ReactNode, icon?: string) => void;
  onToast: (title: string, body: string, icon?: string, color?: 'green' | 'amber' | 'blue') => void;
}

export const EmergencyCenter: React.FC<EmergencyCenterProps> = ({ onOpenModal, onToast }) => {
  const dataCtx = useData();
  const incidents = dataCtx.emergencyIncidents.length > 0 ? dataCtx.emergencyIncidents : [INITIAL_SAR_INCIDENT];
  const emergencyResources = dataCtx.emergencyResources;
  const sitrepLogs = dataCtx.activityLogs;
  const personnelList = dataCtx.personnel;
  const isLiveConnected = dataCtx.isOnline && !dataCtx.isSimulatedOffline;
  const isLoading = !dataCtx.isInitialized;

  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');

  // Modals
  const [isCreateIncidentOpen, setIsCreateIncidentOpen] = useState(false);
  const [isAssignResourceOpen, setIsAssignResourceOpen] = useState(false);
  const [isManagePersonnelOpen, setIsManagePersonnelOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isLogSitrepOpen, setIsLogSitrepOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rollCallCompleted, setRollCallCompleted] = useState(false);

  // Form States
  const [newIncident, setNewIncident] = useState({
    title: '',
    severity: 'CRITICAL' as 'CRITICAL' | 'WARNING' | 'INFO',
    location: "72°14'S, 14°32'E (Sector 7)",
    coordinates: "72°14'S, 14°32'E",
    incidentCommander: 'Maj. Arjun Rathore',
    distressCode: 'MAYDAY-406-HEX',
    situation: '',
    selectedPersonnel: [] as string[],
  });

  const [newResource, setNewResource] = useState({
    name: 'Snowcat SAR-01',
    type: 'VEHICLE',
    quantity: 1,
    status: 'DEPLOYED',
    location: 'Sector 7 Transit Route',
    assignedTeam: 'SAR Team Alpha',
  });

  const [resolveNotes, setResolveNotes] = useState(
    'All personnel successfully extricated, stabilized in medical bay, and hazard zone cordoned.'
  );

  const [sitrepEntry, setSitrepEntry] = useState({
    title: '',
    category: 'TACTICAL_OPS',
    details: '',
  });

  const activeIncident: SarIncident =
    incidents.find((i) => i.id === selectedIncidentId) ||
    incidents[0] ||
    INITIAL_SAR_INCIDENT;

  // Filter resources assigned to current active incident
  const assignedResources = emergencyResources.filter(
    (r) => r.emergencyId === activeIncident.id
  );

  // Stats calculation
  const activeIncidentsCount = incidents.filter((i) => i.status !== 'RESOLVED').length;
  const soulsAtRiskCount = incidents
    .filter((i) => i.status !== 'RESOLVED')
    .reduce((acc, inc) => {
      const pInvolved = inc.personnelInvolved?.length || inc.personnel?.length || 0;
      return acc + (pInvolved > 0 ? pInvolved : 2);
    }, 0);

  const handleSimulateOfflineEmergency = async () => {
    try {
      const incident = await dataCtx.simulateEmergencyScenario();
      setSelectedIncidentId(incident.id);
      setRollCallCompleted(false);
      onToast(
        'EMERGENCY SIMULATED (OFFLINE)',
        'Medical Emergency at Bharati Station. CRITICAL. 3 Personnel Affected. Saved in local IndexedDB.',
        'emergency_home',
        'amber'
      );
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to simulate emergency', 'error', 'amber');
    }
  };

  const handleInitiateRollCall = async () => {
    setRollCallCompleted(true);
    await dataCtx.updateEmergencyIncident(activeIncident.id, {
      situation: `${activeIncident.situation || activeIncident.description || ''} • [ROLL CALL EXECUTED: All 3 affected personnel accounted for & triaged]`,
    });
    await dataCtx.createActivityLog({
      id: 'SIT-ROLL-' + Date.now(),
      title: `Roll Call Completed: ${activeIncident.title}`,
      badge: 'ROLL CALL OK',
      badgeType: 'ops',
      category: 'ROLL_CALL',
      details: 'All affected station personnel accounted for and under active medical triage.',
      actor: activeIncident.incidentCommander || 'Duty Officer',
      emergencyId: activeIncident.id,
      timestamp: new Date().toISOString().substring(11, 16) + ' UTC',
      time: new Date().toISOString().substring(11, 16) + ' UTC',
    });
    onToast(
      'ROLL CALL VERIFIED',
      'Roll call completed: 3 personnel accounted for. Saved to IndexedDB.',
      'how_to_reg',
      'green'
    );
  };

  const handleQuickDeployResponseTeam = async () => {
    const resId = 'RES-' + Date.now().toString().slice(-4);
    await dataCtx.createEmergencyResource({
      id: resId,
      emergencyId: activeIncident.id,
      name: 'Bharati Medical Quick Reaction Team Alpha',
      type: 'PERSONNEL',
      quantity: 4,
      status: 'DEPLOYED',
      location: 'Bharati Station - Bio-Medical Module',
      assignedTeam: 'Medical Response Alpha',
    });
    onToast(
      'RESPONSE TEAM DEPLOYED',
      'Medical Response Alpha assigned to Bharati Station emergency. Stored locally.',
      'medical_services',
      'green'
    );
  };

  // Actions
  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncident.title || !newIncident.situation) {
      onToast('MISSING FIELDS', 'Please provide a title and incident situation details', 'warning', 'amber');
      return;
    }

    setIsSubmitting(true);
    try {
      const incidentId = 'SAR-' + Date.now().toString().slice(-4);
      const docData: SarIncident = {
        id: incidentId,
        title: newIncident.title,
        severity: newIncident.severity,
        status: 'ACTIVE',
        location: newIncident.location,
        coordinates: newIncident.coordinates,
        situation: newIncident.situation,
        description: newIncident.situation,
        incidentCommander: newIncident.incidentCommander,
        distressCode: newIncident.distressCode || `MAYDAY-${incidentId}`,
        reportedTime: new Date().toISOString().substring(11, 16) + ' UTC',
        personnelInvolved: newIncident.selectedPersonnel,
      };

      await dataCtx.createEmergencyIncident(docData);

      // Also post a SITREP event
      await dataCtx.createActivityLog({
        id: 'SIT-INC-' + Date.now(),
        title: `CRISIS DEPLOYMENT: ${newIncident.title}`,
        badge: 'MAYDAY ACTIVE',
        badgeType: 'distress',
        category: 'EMERGENCY_DECLARED',
        details: `${newIncident.situation} • Incident Commander: ${newIncident.incidentCommander}`,
        description: newIncident.situation,
        actor: newIncident.incidentCommander,
        emergencyId: incidentId,
        timestamp: new Date().toISOString().substring(11, 16) + ' UTC',
        time: new Date().toISOString().substring(11, 16) + ' UTC',
      });

      onToast('INCIDENT DECLARED', `Emergency incident ${incidentId} activated across base systems`, 'emergency_home', 'amber');
      setIsCreateIncidentOpen(false);
      setSelectedIncidentId(incidentId);
      setNewIncident({
        title: '',
        severity: 'CRITICAL',
        location: "72°14'S, 14°32'E (Sector 7)",
        coordinates: "72°14'S, 14°32'E",
        incidentCommander: 'Maj. Arjun Rathore',
        distressCode: 'MAYDAY-406-HEX',
        situation: '',
        selectedPersonnel: [],
      });
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to create emergency incident', 'error', 'amber');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (nextStatus: 'ACTIVE' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED') => {
    if (nextStatus === 'RESOLVED') {
      setIsResolveModalOpen(true);
      return;
    }

    try {
      await dataCtx.updateEmergencyIncident(activeIncident.id, { status: nextStatus });
      await dataCtx.createActivityLog({
        id: 'SIT-STAT-' + Date.now(),
        title: `Incident ${activeIncident.id} Status: ${nextStatus}`,
        badge: nextStatus,
        badgeType: 'ops',
        category: 'STATUS_UPDATE',
        details: `Tactical operational status updated to ${nextStatus}`,
        description: `Tactical operational status updated to ${nextStatus}`,
        emergencyId: activeIncident.id,
        actor: 'Incident Command Desk',
        timestamp: new Date().toISOString().substring(11, 16) + ' UTC',
        time: new Date().toISOString().substring(11, 16) + ' UTC',
      });

      onToast('STATUS UPDATED', `${activeIncident.title} status changed to ${nextStatus}`, 'published_with_changes', 'blue');
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to update incident status', 'error', 'amber');
    }
  };

  const handleResolveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await dataCtx.resolveEmergencyIncident(activeIncident.id, resolveNotes);
      onToast('INCIDENT RESOLVED', `${activeIncident.title} resolved and stored locally`, 'task_alt', 'green');
      setIsResolveModalOpen(false);
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to resolve emergency', 'error', 'amber');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResource.name) return;

    setIsSubmitting(true);
    try {
      const resId = 'RES-' + Date.now().toString().slice(-4);
      await dataCtx.createEmergencyResource({
        id: resId,
        emergencyId: activeIncident.id,
        name: newResource.name,
        type: newResource.type,
        quantity: newResource.quantity,
        status: newResource.status,
        location: newResource.location,
        assignedTeam: newResource.assignedTeam,
      });

      await dataCtx.createActivityLog({
        id: 'SIT-RES-' + Date.now(),
        title: `Resource Assigned: ${newResource.name}`,
        badge: 'RESOURCE DEPLOY',
        badgeType: 'deploy',
        category: 'RESOURCE_ALLOCATION',
        details: `${newResource.name} (${newResource.status}) deployed to support ${activeIncident.title}`,
        description: `${newResource.name} (${newResource.status}) deployed to support ${activeIncident.title}`,
        emergencyId: activeIncident.id,
        actor: 'Logistics & SAR Dispatch',
        timestamp: new Date().toISOString().substring(11, 16) + ' UTC',
        time: new Date().toISOString().substring(11, 16) + ' UTC',
      });

      onToast('RESOURCE DEPLOYED', `Assigned ${newResource.name} to ${activeIncident.title}`, 'local_shipping', 'green');
      setIsAssignResourceOpen(false);
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to assign resource', 'error', 'amber');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReleaseResource = async (resourceId: string, resourceName: string) => {
    try {
      await dataCtx.deleteEmergencyResource(resourceId);
      onToast('RESOURCE RELEASED', `Released ${resourceName} back to base pool`, 'check_circle', 'blue');
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to release resource', 'error', 'amber');
    }
  };

  const handleSavePersonnelInvolved = async (selectedNames: string[]) => {
    try {
      await dataCtx.updateEmergencyIncident(activeIncident.id, {
        personnelInvolved: selectedNames,
      });
      onToast('PERSONNEL UPDATED', `Updated affected personnel roster for ${activeIncident.title}`, 'group', 'green');
      setIsManagePersonnelOpen(false);
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to update affected personnel', 'error', 'amber');
    }
  };

  const handleAddSitrepLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sitrepEntry.title || !sitrepEntry.details) return;

    setIsSubmitting(true);
    try {
      await dataCtx.createActivityLog({
        id: 'SIT-' + Date.now(),
        title: sitrepEntry.title,
        badge: 'SITREP COMM',
        badgeType: 'ops',
        category: sitrepEntry.category,
        details: sitrepEntry.details,
        description: sitrepEntry.details,
        emergencyId: activeIncident.id,
        actor: 'Base Radio Telemetry Officer',
        timestamp: new Date().toISOString().substring(11, 16) + ' UTC',
        time: new Date().toISOString().substring(11, 16) + ' UTC',
      });

      onToast('SITREP LOGGED', 'Broadcasted operational update to SITREP timeline', 'cell_tower', 'green');
      setIsLogSitrepOpen(false);
      setSitrepEntry({ title: '', category: 'TACTICAL_OPS', details: '' });
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to post SITREP log', 'error', 'amber');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full space-y-4 pb-8">
      {/* Top Banner: DEFCON & COSPAS Status */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-5 h-5 rounded bg-red-600 border border-red-700 flex items-center justify-center p-0.5">
            <span className="material-symbols-outlined text-white text-[14px]">emergency_home</span>
          </div>
          <span className="font-mono text-[10px] sm:text-xs text-red-600 dark:text-red-400 uppercase tracking-widest font-bold">
            DEFCON TACTICAL DECK-01 • NCPOR CRISIS PROTOCOL
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
          <span className="text-[10px] sm:text-xs font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase">
            COSPAS-SARSAT 406 MHZ ACTIVE
          </span>
          {isLiveConnected && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              FIRESTORE LIVE
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-headline text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc] tracking-tight">
              Search & Rescue Operations
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-[#c1c6d3]">
              Real-time emergency incident coordination, resource dispatch, and casualty evacuation
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSimulateOfflineEmergency}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-headline text-xs font-bold uppercase tracking-wider shadow-md active:scale-95 transition-all border border-amber-500 cursor-pointer"
              title="Create Medical Emergency at Bharati Station (CRITICAL, 3 affected) in local IndexedDB"
            >
              <span className="material-symbols-outlined text-[18px]">crisis_alert</span>
              <span>Simulate Emergency (Offline Test)</span>
            </button>

            <button
              onClick={() => setIsCreateIncidentOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-headline text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 active:scale-95 transition-all border border-red-500 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_alert</span>
              <span>Create Incident</span>
            </button>

            <button
              onClick={() => setIsLogSitrepOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] text-neutral-900 dark:text-[#d2e4fc] font-headline text-xs font-bold border border-neutral-300 dark:border-[#253648] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">campaign</span>
              <span>Log SITREP</span>
            </button>
          </div>
        </div>
      </div>

      {/* Incident Switcher Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-mono font-bold text-neutral-500 uppercase shrink-0">
          Incidents:
        </span>
        {incidents.map((inc) => {
          const isSel = inc.id === activeIncident.id;
          const isResolved = inc.status === 'RESOLVED';

          return (
            <button
              key={inc.id}
              onClick={() => setSelectedIncidentId(inc.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-headline font-bold shrink-0 transition-all flex items-center gap-1.5 border ${
                isSel
                  ? isResolved
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/20'
                  : 'bg-white dark:bg-[#0a1d2e] text-neutral-700 dark:text-[#c1c6d3] border-neutral-300 dark:border-[#253648] hover:bg-neutral-50 dark:hover:bg-[#0f2132]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isResolved ? 'bg-emerald-300' : 'bg-red-300 animate-ping'
                }`}
              />
              <span className="truncate max-w-[140px] sm:max-w-xs">{inc.title}</span>
              <span className="text-[10px] font-mono opacity-80">({inc.status})</span>
            </button>
          );
        })}
      </div>

      {/* Tactical KPI Gauges (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-red-50 dark:bg-red-950/40 p-3.5 rounded-xl border-2 border-red-600 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-red-700 dark:text-red-300">
              Active Incidents
            </span>
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-red-600">
              {String(activeIncidentsCount).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-bold text-red-600 uppercase">
              {activeIncidentsCount > 0 ? 'DEFCON-1' : 'STABLE'}
            </span>
          </div>
          <span className="text-[11px] text-red-700 dark:text-red-300 truncate font-mono">
            {activeIncidentsCount > 0 ? 'Critical response underway' : 'All clear on station'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#0a1d2e] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3]">
            Personnel at Risk
          </span>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc]">
              {String(soulsAtRiskCount).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-bold text-red-600 uppercase">SOULS</span>
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] truncate font-mono">
            {activeIncident.location || 'Tactical Sector B'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#0a1d2e] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3]">
            Assigned Units
          </span>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc]">
              {String(assignedResources.length).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-bold text-emerald-600 uppercase">RESOURCES</span>
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] truncate font-mono">
            Active in current incident
          </span>
        </div>

        <div className="bg-white dark:bg-[#0a1d2e] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3]">
            Current Incident Status
          </span>
          <div className="my-1 flex items-baseline gap-1.5">
            <span
              className={`font-headline text-xl sm:text-2xl font-black ${
                activeIncident.status === 'RESOLVED'
                  ? 'text-emerald-600'
                  : 'text-red-600 animate-pulse'
              }`}
            >
              {activeIncident.status}
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] truncate font-mono">
            Commander: {activeIncident.incidentCommander || 'Apex Admin'}
          </span>
        </div>
      </div>

      {/* Primary Active Incident Card */}
      <div
        className={`bg-white dark:bg-[#0a1d2e] rounded-2xl border-2 shadow-xl p-4 sm:p-5 flex flex-col gap-4 ${
          activeIncident.status === 'RESOLVED'
            ? 'border-emerald-600/70'
            : 'border-red-600 dark:border-red-500'
        }`}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                activeIncident.status === 'RESOLVED'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 text-emerald-600'
                  : 'bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-600'
              }`}
            >
              <span className="material-symbols-outlined text-[24px]">
                {activeIncident.status === 'RESOLVED' ? 'verified' : 'medical_services'}
              </span>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-neutral-500 dark:text-[#c1c6d3]">
                  {activeIncident.id}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider text-white ${
                    activeIncident.status === 'RESOLVED'
                      ? 'bg-emerald-600'
                      : activeIncident.severity === 'CRITICAL'
                      ? 'bg-red-600'
                      : 'bg-amber-600'
                  }`}
                >
                  {activeIncident.status} • {activeIncident.severity || 'CRITICAL'}
                </span>
                {activeIncident.distressCode && (
                  <span className="font-mono text-[9px] text-neutral-400 bg-neutral-100 dark:bg-[#0f2132] px-1.5 py-0.5 rounded border border-neutral-300 dark:border-[#253648]">
                    {activeIncident.distressCode}
                  </span>
                )}
              </div>

              <h3 className="font-headline text-lg sm:text-xl font-black text-neutral-900 dark:text-[#d2e4fc] mt-0.5">
                {activeIncident.title}
              </h3>
              <span className="text-xs text-neutral-500 dark:text-[#c1c6d3]">
                Location: <span className="font-bold text-neutral-800 dark:text-[#d2e4fc]">{activeIncident.location}</span> • Coords: {activeIncident.coordinates || "-69.407°S, 76.191°E"} • Reported: {activeIncident.reportedTime || 'Recent'}
              </span>
            </div>
          </div>

          {/* Quick Status Control Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-neutral-400 uppercase">Status:</label>
            <select
              value={activeIncident.status}
              onChange={(e) =>
                handleStatusChange(e.target.value as 'ACTIVE' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED')
              }
              className="bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-1.5 text-xs font-headline font-bold text-neutral-900 dark:text-[#d2e4fc] focus:outline-none"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="CONTAINED">CONTAINED</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>

            {activeIncident.status !== 'RESOLVED' && (
              <button
                onClick={() => setIsResolveModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-headline font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                <span>Resolve</span>
              </button>
            )}
          </div>
        </div>

        {/* Narrative */}
        <p className="text-xs sm:text-sm text-neutral-700 dark:text-[#c1c6d3] leading-relaxed bg-neutral-50 dark:bg-[#0f2132] p-3 rounded-xl border border-neutral-200 dark:border-[#253648]">
          {activeIncident.situation ||
            activeIncident.description ||
            'Field rescue incident reported. Medical Stabilization and terrain extraction initiated.'}
        </p>

        {/* Affected Personnel Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-headline font-bold text-neutral-900 dark:text-[#d2e4fc] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-red-500 text-[16px]">personal_injury</span>
              Affected / Trapped Personnel ({activeIncident.personnelInvolved?.length || 3}):
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInitiateRollCall}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-headline font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">how_to_reg</span>
                <span>{rollCallCompleted ? 'Roll Call Confirmed ✓' : 'Initiate Roll Call'}</span>
              </button>
              <button
                onClick={() => setIsManagePersonnelOpen(true)}
                className="text-[11px] font-headline font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                <span>Manage Affected Personnel</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
            {(activeIncident.personnelInvolved && activeIncident.personnelInvolved.length > 0
              ? activeIncident.personnelInvolved
              : activeIncident.personnel
              ? activeIncident.personnel.map((p) => `${p.name} (${p.role} - ${p.status.toUpperCase()})`)
              : ['Dr. Maya Sen (Biochemist - Critical)', 'Eng. T. Chander (Station Systems - Frostbite)', 'Tech. A. Sen (Comms - Hypothermia)']
            ).map((p, idx) => (
              <div
                key={idx}
                className="bg-neutral-100 dark:bg-[#071A2B] p-2.5 rounded-lg border border-neutral-200 dark:border-[#253648] flex items-center justify-between"
              >
                <span className="font-bold text-neutral-900 dark:text-[#d2e4fc] truncate">{p}</span>
                <span className="text-[9px] text-red-600 dark:text-red-400 font-bold uppercase shrink-0">
                  {rollCallCompleted ? 'ACCOUNTED FOR' : 'CASUALTY / AT RISK'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Assigned Response Resources Section */}
        <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-[#253648]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-headline font-bold text-neutral-900 dark:text-[#d2e4fc] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-500 text-[16px]">local_shipping</span>
              Assigned Emergency Resources ({assignedResources.length}):
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleQuickDeployResponseTeam}
                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-headline font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">medical_services</span>
                <span>Assign Response Team</span>
              </button>
              <button
                onClick={() => setIsAssignResourceOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white text-[11px] font-headline font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                <span>Custom Resource</span>
              </button>
            </div>
          </div>

          {assignedResources.length === 0 ? (
            <p className="text-xs text-neutral-400 italic p-2 bg-neutral-50 dark:bg-[#0f2132] rounded-lg">
              No tactical units currently assigned in Firestore. Click 'Assign Resource' to deploy Snowcats, Trauma Kits, or Air Evac.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {assignedResources.map((res) => (
                <div
                  key={res.id}
                  className="p-3 bg-neutral-50 dark:bg-[#0f2132] rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between gap-2 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-headline font-bold text-neutral-900 dark:text-[#d2e4fc] block">
                        {res.name}
                      </span>
                      <span className="text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
                        {res.assignedTeam || res.type} • {res.location || 'En Route'}
                      </span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        res.status === 'DEPLOYED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {res.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono border-t border-neutral-200 dark:border-[#253648] pt-1.5">
                    <span className="text-neutral-500">Unit ID: {res.id}</span>
                    <button
                      onClick={() => handleReleaseResource(res.id, res.name)}
                      className="text-red-500 hover:text-red-700 font-bold"
                    >
                      Release Unit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Spatial Tactical Vector Map */}
      <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl border border-neutral-200 dark:border-[#253648] p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 text-[20px]">near_me</span>
            <span className="font-headline text-sm font-black text-neutral-900 dark:text-[#d2e4fc]">
              SAR Sector Incident Tactical Grid: {activeIncident.location}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-mono text-[9px] font-bold uppercase border border-red-300 dark:border-red-800">
              BEACON 406.025 MHz ACTIVE
            </span>
          </div>
        </div>

        {/* Vector Map Screen */}
        <div className="relative w-full h-72 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center">
          <div className="absolute w-60 h-60 rounded-full border border-neutral-800 pointer-events-none" />
          <div className="absolute w-40 h-40 rounded-full border border-neutral-800 pointer-events-none" />
          <div className="absolute w-20 h-20 rounded-full border border-neutral-800 pointer-events-none" />
          <div className="absolute w-full h-[1px] bg-neutral-800/80 pointer-events-none" />
          <div className="absolute h-full w-[1px] bg-neutral-800/80 pointer-events-none" />

          {/* SVG Tactical Elements */}
          <svg className="absolute inset-0 w-full h-full p-4 pointer-events-none" viewBox="0 0 300 240">
            <polygon
              points="140,110 160,110 165,130 135,130"
              fill="#0b5ea8"
              fillOpacity="0.4"
              stroke="#a4c9ff"
              strokeWidth="1.5"
            />
            <path
              d="M 150 120 Q 180 90 220 70"
              stroke="#22c55e"
              strokeWidth="2.5"
              strokeDasharray="4 3"
              fill="none"
              className="animate-pulse"
            />
          </svg>

          {/* Bharati Base Tag */}
          <div className="absolute top-[48%] left-[45%] z-20 flex flex-col items-center">
            <span className="w-3 h-3 rounded-full bg-blue-500 border border-white" />
            <span className="font-mono text-[8px] bg-black/80 text-white px-1 rounded mt-0.5">
              BHARATI MAIN
            </span>
          </div>

          {/* In-Transit Rescue Unit */}
          <div className="absolute top-[38%] left-[58%] z-20 flex items-center gap-1">
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">
              local_shipping
            </span>
            <span className="font-mono text-[8px] text-emerald-300 bg-black/80 px-1 rounded">
              MED-UNIT-02 (ETA 6M)
            </span>
          </div>

          {/* Priority 1 Distress Marker */}
          <div className="absolute top-[26%] right-[22%] z-20 flex flex-col items-center cursor-pointer">
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute w-8 h-8 rounded-full bg-red-600 opacity-75" />
              <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-lg">
                !
              </span>
            </div>
            <span className="font-headline text-[9px] font-bold text-white bg-red-900/90 px-2 py-0.5 rounded-full border border-red-500 mt-1 shadow">
              {activeIncident.title.slice(0, 20)}
            </span>
          </div>

          {/* Severe Weather Telemetry Bar on Bottom */}
          <div className="absolute bottom-2 left-2 right-2 bg-black/85 backdrop-blur-md p-2 rounded-lg border border-neutral-800 text-white text-[10px] font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <span className="font-bold text-red-400">SURFACE WHITEOUT</span>
            </div>
            <span className="text-neutral-300">TEMP: -31°C · GALE: 42kt · VIS: 300m</span>
          </div>
        </div>
      </div>

      {/* Live SITREP Event Timeline */}
      <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl border border-neutral-200 dark:border-[#253648] p-4 sm:p-5 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="font-headline text-sm font-bold text-neutral-900 dark:text-[#d2e4fc]">
              Live SITREP Operational Timeline ({sitrepLogs.length})
            </span>
            <p className="text-[10px] font-mono text-neutral-400">
              Synchronized event dispatch stream directly from Firestore
            </p>
          </div>
          <button
            onClick={() => setIsLogSitrepOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] text-neutral-900 dark:text-[#d2e4fc] text-xs font-bold border border-neutral-300 dark:border-[#253648] flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">edit_note</span>
            <span>Broadcast SITREP</span>
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {sitrepLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-neutral-50 dark:bg-[#0f2132] border border-neutral-200 dark:border-[#253648] flex items-start gap-3 text-xs"
            >
              <span className="font-mono text-[10px] font-bold text-neutral-500 dark:text-[#c1c6d3] shrink-0 mt-0.5">
                {log.time || log.timestamp}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span className="font-headline font-bold text-neutral-900 dark:text-[#d2e4fc]">
                    {log.title || log.badge || 'SITREP EVENT'}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                      log.badgeType === 'distress' || log.category === 'EMERGENCY_DECLARED'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                        : log.badgeType === 'deploy'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-neutral-200 dark:bg-[#253648] text-neutral-700 dark:text-[#c1c6d3]'
                    }`}
                  >
                    {log.category || log.badgeType || 'EVENT'}
                  </span>
                </div>
                <p className="text-neutral-600 dark:text-[#c1c6d3] mt-0.5">
                  {log.details || log.description}
                </p>
                <span className="text-[10px] font-mono text-neutral-400 mt-1 block">
                  Actor: {log.actor || 'NCPOR Autonomous Relay'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CREATE INCIDENT MODAL */}
      {isCreateIncidentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#0a1d2e] border border-neutral-300 dark:border-[#253648] rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-[#253648]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600 text-[22px]">add_alert</span>
                <h3 className="font-headline font-bold text-base text-neutral-900 dark:text-[#d2e4fc]">
                  Declare Emergency SAR Incident
                </h3>
              </div>
              <button
                onClick={() => setIsCreateIncidentOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                  Incident Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector 7 Crevasse Snowcat Collapse"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                    Severity Level
                  </label>
                  <select
                    value={newIncident.severity}
                    onChange={(e) =>
                      setNewIncident({
                        ...newIncident,
                        severity: e.target.value as 'CRITICAL' | 'WARNING' | 'INFO',
                      })
                    }
                    className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 dark:text-white outline-none focus:border-red-500"
                  >
                    <option value="CRITICAL">CRITICAL (Defcon-1)</option>
                    <option value="WARNING">WARNING (Priority 2)</option>
                    <option value="INFO">INFO / Monitored</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                    Incident Commander
                  </label>
                  <input
                    type="text"
                    value={newIncident.incidentCommander}
                    onChange={(e) =>
                      setNewIncident({ ...newIncident, incidentCommander: e.target.value })
                    }
                    className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                    Location Name
                  </label>
                  <input
                    type="text"
                    value={newIncident.location}
                    onChange={(e) => setNewIncident({ ...newIncident, location: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                    GPS Coordinates
                  </label>
                  <input
                    type="text"
                    value={newIncident.coordinates}
                    onChange={(e) => setNewIncident({ ...newIncident, coordinates: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                  Situation & Casualty Narrative *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the immediate threat, vehicle collapse, temperature hazards, and injuries..."
                  value={newIncident.situation}
                  onChange={(e) => setNewIncident({ ...newIncident, situation: e.target.value })}
                  className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-red-500"
                />
              </div>

              {/* Select Affected Personnel */}
              <div>
                <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                  Tag Affected Personnel at Risk
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl">
                  {personnelList.map((p) => {
                    const label = `${p.name} (${p.role})`;
                    const isChecked = newIncident.selectedPersonnel.includes(label);

                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 text-xs text-neutral-800 dark:text-[#d2e4fc] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewIncident({
                                ...newIncident,
                                selectedPersonnel: [...newIncident.selectedPersonnel, label],
                              });
                            } else {
                              setNewIncident({
                                ...newIncident,
                                selectedPersonnel: newIncident.selectedPersonnel.filter(
                                  (item) => item !== label
                                ),
                              });
                            }
                          }}
                          className="rounded text-red-600 focus:ring-red-500"
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateIncidentOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-headline font-bold text-neutral-600 dark:text-[#c1c6d3] hover:bg-neutral-100 dark:hover:bg-[#0f2132]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-headline font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition-all"
                >
                  {isSubmitting ? (
                    <span>Declaring Incident...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">warning</span>
                      <span>Broadcast Emergency</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN RESOURCE MODAL */}
      {isAssignResourceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#0a1d2e] border border-neutral-300 dark:border-[#253648] rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-[#253648]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[22px]">
                  local_shipping
                </span>
                <h3 className="font-headline font-bold text-base text-neutral-900 dark:text-[#d2e4fc]">
                  Assign Tactical Resource
                </h3>
              </div>
              <button
                onClick={() => setIsAssignResourceOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAssignResource} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                  Resource / Vehicle Callsign *
                </label>
                <input
                  type="text"
                  required
                  value={newResource.name}
                  onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                  placeholder="e.g. Snowcat SAR-01 or Air Evac Bell-412"
                  className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                    Resource Type
                  </label>
                  <select
                    value={newResource.type}
                    onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                  >
                    <option value="VEHICLE">VEHICLE</option>
                    <option value="MEDICAL">MEDICAL POD</option>
                    <option value="SQUAD">SEARCH SQUAD</option>
                    <option value="EQUIPMENT">WINCH / CRYO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                    Readiness Status
                  </label>
                  <select
                    value={newResource.status}
                    onChange={(e) => setNewResource({ ...newResource, status: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                  >
                    <option value="DEPLOYED">DEPLOYED</option>
                    <option value="EN ROUTE">EN ROUTE</option>
                    <option value="STANDBY">STANDBY</option>
                    <option value="STAGED">STAGED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                  Assigned Team / Operator
                </label>
                <input
                  type="text"
                  value={newResource.assignedTeam}
                  onChange={(e) => setNewResource({ ...newResource, assignedTeam: e.target.value })}
                  placeholder="e.g. Paramedic Team Alpha"
                  className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                  Location / Route
                </label>
                <input
                  type="text"
                  value={newResource.location}
                  onChange={(e) => setNewResource({ ...newResource, location: e.target.value })}
                  placeholder="e.g. Sector 7 Ice Ridge transit"
                  className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignResourceOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-headline font-bold text-neutral-600 dark:text-[#c1c6d3] hover:bg-neutral-100 dark:hover:bg-[#0f2132]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-headline font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition-all"
                >
                  {isSubmitting ? (
                    <span>Assigning...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>Deploy Resource</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE AFFECTED PERSONNEL MODAL */}
      {isManagePersonnelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#0a1d2e] border border-neutral-300 dark:border-[#253648] rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-[#253648]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600 text-[22px]">group</span>
                <h3 className="font-headline font-bold text-base text-neutral-900 dark:text-[#d2e4fc]">
                  Affected Personnel Roster
                </h3>
              </div>
              <button
                onClick={() => setIsManagePersonnelOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="text-xs text-neutral-600 dark:text-[#c1c6d3]">
              Check personnel involved in this incident ({activeIncident.title}):
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 p-3 bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl">
              {personnelList.map((p) => {
                const label = `${p.name} (${p.role})`;
                const currentList = activeIncident.personnelInvolved || [];
                const isSelected = currentList.some((item) => item.includes(p.name));

                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-2.5 text-xs text-neutral-800 dark:text-[#d2e4fc] cursor-pointer p-1 rounded hover:bg-neutral-200 dark:hover:bg-[#1a2b3d]"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        let updated: string[];
                        if (e.target.checked) {
                          updated = [...currentList, label];
                        } else {
                          updated = currentList.filter((item) => !item.includes(p.name));
                        }
                        handleSavePersonnelInvolved(updated);
                      }}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-neutral-900 dark:text-white truncate">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {p.role} • {p.station}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsManagePersonnelOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-headline font-bold text-white bg-blue-600 hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESOLVE INCIDENT MODAL */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#0a1d2e] border border-neutral-300 dark:border-[#253648] rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-[#253648]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[22px]">
                  task_alt
                </span>
                <h3 className="font-headline font-bold text-base text-neutral-900 dark:text-[#d2e4fc]">
                  Resolve & Close Incident
                </h3>
              </div>
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleResolveIncident} className="space-y-3.5">
              <p className="text-xs text-neutral-600 dark:text-[#c1c6d3]">
                Resolving incident <span className="font-bold text-neutral-900 dark:text-white">{activeIncident.title}</span> will set its status to RESOLVED, close any linked critical alerts, and log an official resolution entry in SITREP.
              </p>

              <div>
                <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                  Incident Resolution Summary
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-headline font-bold text-neutral-600 dark:text-[#c1c6d3] hover:bg-neutral-100 dark:hover:bg-[#0f2132]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-headline font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center gap-1.5 transition-all"
                >
                  {isSubmitting ? (
                    <span>Resolving in Firestore...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      <span>Confirm Resolution</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG SITREP MODAL */}
      {isLogSitrepOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#0a1d2e] border border-neutral-300 dark:border-[#253648] rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-[#253648]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-[22px]">
                  campaign
                </span>
                <h3 className="font-headline font-bold text-base text-neutral-900 dark:text-[#d2e4fc]">
                  Broadcast SITREP Telemetry
                </h3>
              </div>
              <button
                onClick={() => setIsLogSitrepOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddSitrepLog} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                  Event Headline *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paramedic Team extracted casualty to warm pod"
                  value={sitrepEntry.title}
                  onChange={(e) => setSitrepEntry({ ...sitrepEntry, title: e.target.value })}
                  className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                  Category
                </label>
                <select
                  value={sitrepEntry.category}
                  onChange={(e) => setSitrepEntry({ ...sitrepEntry, category: e.target.value })}
                  className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                >
                  <option value="TACTICAL_OPS">TACTICAL OPS</option>
                  <option value="MEDICAL_EVAC">MEDICAL EVAC</option>
                  <option value="WEATHER_ADVISORY">WEATHER ADVISORY</option>
                  <option value="COMMS_STATUS">COMMS STATUS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                  Operational Details *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter telemetry numbers, coordinates, or team status..."
                  value={sitrepEntry.details}
                  onChange={(e) => setSitrepEntry({ ...sitrepEntry, details: e.target.value })}
                  className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogSitrepOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-headline font-bold text-neutral-600 dark:text-[#c1c6d3] hover:bg-neutral-100 dark:hover:bg-[#0f2132]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-headline font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition-all"
                >
                  {isSubmitting ? (
                    <span>Broadcasting...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      <span>Broadcast Log</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
