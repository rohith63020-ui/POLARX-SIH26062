/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { INITIAL_EXPEDITIONS } from '../data/initialData';
import { Expedition, StationKey, PersonnelMember, CargoAsset, AlertItem } from '../types';
import { ExpeditionTimeline } from './ExpeditionTimeline';
import { PolarLogo } from './PolarLogo';
import { useData } from '../context/DataContext';

interface ExpeditionManagementProps {
  onOpenCreateModal?: () => void;
  onOpenModal?: (title: string, body: React.ReactNode, icon?: string) => void;
  onToast: (title: string, body: string, icon?: string, color?: 'green' | 'amber' | 'blue') => void;
  currentStation?: StationKey;
  kidMode?: boolean;
}

export const ExpeditionManagement: React.FC<ExpeditionManagementProps> = ({
  onOpenCreateModal,
  onOpenModal,
  onToast,
  currentStation = 'bharati',
  kidMode = true,
}) => {
  const dataCtx = useData();
  const expeditions = dataCtx.expeditions.length > 0 ? dataCtx.expeditions : INITIAL_EXPEDITIONS;
  const personnelList = dataCtx.personnel;
  const assetsList = dataCtx.assets;
  const cargoList = dataCtx.cargo;
  const alertsList = dataCtx.alerts;
  const isLiveConnected = dataCtx.isOnline && !dataCtx.isSimulatedOffline;
  const isLoading = !dataCtx.isInitialized;

  const [filter, setFilter] = useState<'all' | 'active' | 'planning' | 'delayed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dossierOpen, setDossierOpen] = useState(true);
  const [activeDossierTab, setActiveDossierTab] = useState<
    'overview' | 'timeline' | 'personnel' | 'cargo' | 'assets' | 'alerts'
  >('overview');

  const [selectedExpeditionId, setSelectedExpeditionId] = useState<string>('INPEX-2026');

  // Edit Expedition State
  const [editingExpedition, setEditingExpedition] = useState<Expedition | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Assign Personnel to Expedition State
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');

  // New Expedition Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newExpName, setNewExpName] = useState('');
  const [newExpDiscipline, setNewExpDiscipline] = useState('Cryospheric Ice Sheet Dynamics');
  const [newExpStation, setNewExpStation] = useState('Bharati Station');
  const [newExpObjective, setNewExpObjective] = useState('');
  const [isSubmittingExp, setIsSubmittingExp] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = (newExpName.trim() || `EXP-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase().replace(/\s+/g, '-');
    setIsSubmittingExp(true);
    try {
      const newExp: Expedition = {
        id,
        name: newExpName.trim() || id,
        status: 'active',
        location: `${newExpStation}, East Antarctica`,
        coordinates: newExpStation.includes('Maitri') ? '-70.766°S, 11.739°E' : '-69.407°S, 76.191°E',
        discipline: newExpDiscipline,
        objective: newExpObjective.trim() || 'Sub-ice radar traverse and atmospheric aerosol sampling.',
        startDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        endDate: '30 Oct 2026',
        durationDays: 45,
        currentDay: 1,
        progressPercent: 5,
        commander: {
          name: 'Maj. S. Rawat',
          role: 'Expedition Commander',
          subordinatesCount: 16,
        },
        manifestSummary: '16 Personnel • 8 Cargo Units • 20 Heavy Assets',
      };
      await dataCtx.createExpedition(newExp);
      onToast('EXPEDITION REGISTERED', `Expedition ${newExp.name} registered. Stored locally.`, 'explore', 'green');
      setIsCreateOpen(false);
      setNewExpName('');
      setNewExpObjective('');
    } catch (err: any) {
      console.error('Error creating expedition:', err);
      onToast('CREATION ERROR', err?.message || 'Failed to create expedition', 'error', 'amber');
    } finally {
      setIsSubmittingExp(false);
    }
  };

  const activeExpeditionsCount = expeditions.filter((e) => e.status === 'active').length;
  const planningExpeditionsCount = expeditions.filter((e) => e.status === 'planning').length;
  const delayedExpeditionsCount = expeditions.filter((e) => e.status === 'delayed').length;
  const totalExpeditionsCount = expeditions.length;

  const primaryExpedition =
    expeditions.find((e) => e.id === selectedExpeditionId) ||
    expeditions[0] ||
    INITIAL_EXPEDITIONS[0];
  const secondaryExpeditions = expeditions.filter((e) => e.id !== primaryExpedition.id);

  const filteredSecondary = secondaryExpeditions.filter((exp) => {
    const matchesFilter = filter === 'all' || exp.status === filter;
    const matchesSearch =
      exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.discipline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleUpdateStatus = async (expId: string, status: Expedition['status']) => {
    try {
      await dataCtx.updateExpedition(expId, { status });
      onToast('EXPEDITION STATUS UPDATED', `Set status to ${status.toUpperCase()} locally`, 'check_circle', 'green');
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to update expedition status', 'error', 'amber');
    }
  };

  const handleAssignMember = async (personId: string) => {
    if (!personId) return;
    try {
      await dataCtx.updatePersonnel(personId, {
        expedition: primaryExpedition.id,
        expeditionId: primaryExpedition.id,
      });
      onToast('MEMBER ASSIGNED', `Assigned personnel to ${primaryExpedition.name}`, 'person_add', 'green');
      setIsAssignOpen(false);
      setSelectedPersonId('');
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to assign personnel', 'error', 'amber');
    }
  };

  const handleUnassignMember = async (personId: string) => {
    try {
      await dataCtx.updatePersonnel(personId, {
        expedition: '',
        expeditionId: '',
      });
      onToast('MEMBER UNASSIGNED', `Returned personnel to general station pool`, 'person_remove', 'blue');
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to unassign personnel', 'error', 'amber');
    }
  };

  const handleSaveExpedition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpedition) return;
    setIsUpdating(true);
    try {
      await dataCtx.updateExpedition(editingExpedition.id, {
        name: editingExpedition.name,
        objective: editingExpedition.objective,
        discipline: editingExpedition.discipline,
        durationDays: editingExpedition.durationDays,
        progressPercent: editingExpedition.progressPercent,
        status: editingExpedition.status,
      });
      onToast('EXPEDITION SAVED', `Updated ${editingExpedition.name}`, 'task_alt', 'green');
      setEditingExpedition(null);
    } catch (err: any) {
      onToast('UPDATE ERROR', err?.message || 'Failed to update expedition', 'error', 'amber');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col w-full space-y-4 pb-8">
      {/* Header & Title */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <PolarLogo size="xs" />
          <span className="font-mono text-[10px] sm:text-xs text-neutral-900 dark:text-[#a4c9ff] uppercase tracking-widest font-bold">
            Expeditions & Field Operations • NCPOR
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
          <span className="text-[10px] sm:text-xs font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase">
            DECK-03
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
              Expedition Management
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-[#c1c6d3]">
              Active polar deployments, transit routes, and station rotations
            </p>
          </div>
          <button
            onClick={() => {
              if (onOpenCreateModal) {
                onOpenCreateModal();
              } else {
                setIsCreateOpen(true);
              }
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white font-headline text-xs font-bold shadow-md active:scale-95 transition-all shrink-0 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>+ Create Expedition</span>
          </button>
        </div>
      </div>

      {/* Search & Tactical Filter Pills */}
      <div className="flex flex-col gap-2.5 bg-neutral-100 dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648]">
        <div className="relative flex items-center w-full">
          <span className="material-symbols-outlined absolute left-3 text-neutral-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Expedition ID, Vessel or Station coordinates..."
            className="w-full bg-white dark:bg-[#0f2132] text-neutral-900 dark:text-[#d2e4fc] text-xs pl-9 pr-14 py-2 rounded-lg border border-neutral-200 dark:border-[#253648] outline-none focus:border-black dark:focus:border-[#a4c9ff] transition-colors"
          />
          <span className="absolute right-2 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-[#071A2B] text-[9px] font-mono text-neutral-500 dark:text-[#c1c6d3]">
            ⌘K
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-label font-bold shrink-0 flex items-center gap-1.5 transition-colors ${
              filter === 'all'
                ? 'bg-black text-white dark:bg-[#0b5ea8] shadow-sm'
                : 'bg-white dark:bg-[#0f2132] text-neutral-600 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white border border-neutral-200 dark:border-[#253648]'
            }`}
          >
            <span>All</span>
            <span className="px-1.5 py-0.2 rounded-full bg-neutral-700 dark:bg-black/40 text-white text-[10px]">
              {expeditions.length}
            </span>
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1 rounded-full text-xs font-label font-bold shrink-0 flex items-center gap-1.5 transition-colors ${
              filter === 'active'
                ? 'bg-black text-white dark:bg-[#0b5ea8] shadow-sm'
                : 'bg-white dark:bg-[#0f2132] text-neutral-600 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white border border-neutral-200 dark:border-[#253648]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Active</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">
              {expeditions.filter((e) => e.status === 'active').length}
            </span>
          </button>
          <button
            onClick={() => setFilter('planning')}
            className={`px-3 py-1 rounded-full text-xs font-label font-bold shrink-0 flex items-center gap-1.5 transition-colors ${
              filter === 'planning'
                ? 'bg-black text-white dark:bg-[#0b5ea8] shadow-sm'
                : 'bg-white dark:bg-[#0f2132] text-neutral-600 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white border border-neutral-200 dark:border-[#253648]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Planning</span>
            <span className="text-blue-600 dark:text-blue-400 text-[10px]">
              {expeditions.filter((e) => e.status === 'planning').length}
            </span>
          </button>
          <button
            onClick={() => setFilter('delayed')}
            className={`px-3 py-1 rounded-full text-xs font-label font-bold shrink-0 flex items-center gap-1.5 transition-colors ${
              filter === 'delayed'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#0f2132] text-neutral-600 dark:text-[#c1c6d3] hover:text-red-600 border border-neutral-200 dark:border-[#253648]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
            <span>Delayed</span>
            <span className="text-red-600 text-[10px]">
              {expeditions.filter((e) => e.status === 'delayed').length}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Telemetry Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0a1d2e] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3]">
              Active Expeditions
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc]">
              {String(activeExpeditionsCount).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
              ACTIVE
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] truncate font-mono">
            {expeditions.filter((e) => e.status === 'active').map((e) => e.name).join(', ') || 'None active'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#0a1d2e] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3]">
              Planning Phase
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc]">
              {String(planningExpeditionsCount).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
              QUEUED
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] truncate font-mono">
            {expeditions.filter((e) => e.status === 'planning').map((e) => e.name).join(', ') || 'None queued'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#0a1d2e] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3]">
              Total Expeditions
            </span>
            <span className="material-symbols-outlined text-[14px] text-neutral-400">history</span>
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc]">
              {String(totalExpeditionsCount).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-bold text-neutral-600 dark:text-[#c1c6d3] uppercase">
              MISSIONS
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] truncate font-mono">
            Firestore Database Synchronized
          </span>
        </div>

        <div className="bg-white dark:bg-[#0a1d2e] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3]">
              Weather Delayed
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
            </span>
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-red-600">
              {String(delayedExpeditionsCount).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-bold text-red-600 uppercase">DELAYED</span>
          </div>
          <span className="text-[11px] text-red-600 truncate font-mono">
            {expeditions.filter((e) => e.status === 'delayed').map((e) => e.name).join(', ') || 'Nominal clearance'}
          </span>
        </div>
      </div>

      {/* Horizontal Scrollable Expedition & Resupply Timeline */}
      <ExpeditionTimeline
        currentStation={currentStation}
        kidMode={kidMode}
        onToast={onToast}
      />

      {/* Primary Expedition Highlight Card */}
      <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl border-2 border-neutral-900 dark:border-[#a4c9ff]/60 shadow-lg overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 flex flex-col gap-3 bg-gradient-to-r from-neutral-50 via-white to-neutral-50 dark:from-[#0a1d2e] dark:via-[#0f2132] dark:to-[#0a1d2e]">
          {/* Top Badges & Meta */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-headline text-lg sm:text-xl font-black text-neutral-900 dark:text-[#d2e4fc] tracking-wide">
                {primaryExpedition.name}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 font-bold uppercase">Status:</span>
                <select
                  value={primaryExpedition.status}
                  onChange={(e) => handleUpdateStatus(primaryExpedition.id, e.target.value as any)}
                  className="px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-[11px] font-mono font-bold text-neutral-900 dark:text-[#a4c9ff] outline-none cursor-pointer"
                >
                  <option value="active">ACTIVE</option>
                  <option value="planning">PLANNING</option>
                  <option value="delayed">DELAYED</option>
                  <option value="completed">COMPLETED</option>
                </select>
              </div>
              <button
                onClick={() => setEditingExpedition(primaryExpedition)}
                className="px-2 py-0.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-300 dark:border-[#253648] text-[11px] font-medium text-neutral-800 dark:text-[#d2e4fc] flex items-center gap-1 transition-colors"
                title="Edit Expedition Details"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                <span>Edit</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-[#071A2B] px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-[#253648]">
              <span className="material-symbols-outlined text-[14px] text-neutral-800 dark:text-[#a4c9ff]">
                pin_drop
              </span>
              <span className="font-mono text-[10px] text-neutral-700 dark:text-[#c1c6d3]">
                {primaryExpedition.location}
              </span>
            </div>
          </div>

          {/* Details Snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="flex items-center gap-3 bg-neutral-100/70 dark:bg-[#0f2132]/70 p-3 rounded-xl border border-neutral-200 dark:border-[#253648]">
              <img
                src={primaryExpedition.commander.avatarUrl}
                alt={primaryExpedition.commander.name}
                className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-neutral-900 dark:ring-[#a4c9ff]"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-mono uppercase font-bold text-neutral-500 dark:text-[#c1c6d3]">
                  Lead Commander
                </span>
                <span className="font-headline text-xs sm:text-sm font-bold text-neutral-900 dark:text-[#d2e4fc] truncate">
                  {primaryExpedition.commander.name}
                </span>
                <span className="text-[11px] text-neutral-600 dark:text-[#a4c9ff] font-medium">
                  {primaryExpedition.commander.subordinatesCount} Station Personnel
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-center bg-neutral-100/70 dark:bg-[#0f2132]/70 p-3 rounded-xl border border-neutral-200 dark:border-[#253648]">
              <span className="text-[10px] font-mono uppercase font-bold text-neutral-500 dark:text-[#c1c6d3]">
                Expedition Window
              </span>
              <span className="font-headline text-xs sm:text-sm font-bold text-neutral-900 dark:text-[#d2e4fc]">
                {primaryExpedition.startDate} → {primaryExpedition.endDate}
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
                {primaryExpedition.durationDays} Days Total Duration (Day{' '}
                {primaryExpedition.currentDay})
              </span>
            </div>

            <div className="flex flex-col justify-center bg-neutral-100/70 dark:bg-[#0f2132]/70 p-3 rounded-xl border border-neutral-200 dark:border-[#253648]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase font-bold text-neutral-500 dark:text-[#c1c6d3]">
                  Deployment Phase
                </span>
                <span className="font-mono text-xs font-bold text-neutral-900 dark:text-[#a4c9ff]">
                  {primaryExpedition.progressPercent}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-[#253648] overflow-hidden">
                <div
                  className="h-full bg-black dark:bg-[#a4c9ff] rounded-full transition-all duration-500"
                  style={{ width: `${primaryExpedition.progressPercent}%` }}
                />
              </div>
              <span className="text-[9px] text-neutral-500 dark:text-[#c1c6d3] mt-1 font-mono">
                Telemetry Sync: 14s ago • S.A. Agulhas II Link
              </span>
            </div>
          </div>

          {/* Toggle Dossier Button */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-neutral-500 dark:text-[#c1c6d3]">
              Click to expand mission logs, real-time metrics & crew manifest
            </span>
            <button
              onClick={() => setDossierOpen(!dossierOpen)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white font-headline text-xs font-bold transition-all shadow-sm"
            >
              <span>{dossierOpen ? 'Collapse Dossier' : 'Open Expedition Dossier'}</span>
              <span
                className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${
                  dossierOpen ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
          </div>
        </div>

        {/* Detailed Expedition Dossier Tabs & Panels */}
        {dossierOpen && (
          <div className="bg-neutral-50 dark:bg-[#071A2B] p-4 sm:p-5 border-t border-neutral-200 dark:border-[#253648] flex flex-col gap-4">
            {/* Dossier Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-white dark:bg-[#0a1d2e] p-1 rounded-xl border border-neutral-200 dark:border-[#253648]">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'timeline', label: 'Timeline' },
                { id: 'personnel', label: 'Personnel (32)' },
                { id: 'cargo', label: 'Cargo (12)' },
                { id: 'assets', label: 'Assets (48)' },
                { id: 'alerts', label: 'Alerts', hasPing: true },
              ].map((tab) => {
                const isActive = activeDossierTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDossierTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg font-headline text-xs uppercase tracking-wider shrink-0 transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-black text-white dark:bg-[#0b5ea8] font-bold shadow-sm'
                        : 'text-neutral-600 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.hasPing && <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />}
                  </button>
                );
              })}
            </div>

            {/* Tab Panel 1: Overview */}
            {activeDossierTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-200">
                {/* Mission Objectives */}
                <div className="bg-white dark:bg-[#0a1d2e] p-4 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-neutral-900 dark:text-[#a4c9ff] text-[20px]">
                      fitbit_push_ups
                    </span>
                    <span className="font-headline text-xs sm:text-sm font-bold text-neutral-900 dark:text-[#d2e4fc]">
                      Mission Objectives: Sector 4 Core Drill
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-[#c1c6d3] leading-relaxed">
                    {primaryExpedition.objective}
                  </p>
                  <div className="flex items-center gap-2 mt-2 pt-2 bg-neutral-100/70 dark:bg-[#0f2132] p-2.5 rounded-lg border border-neutral-200 dark:border-[#253648]">
                    <span className="material-symbols-outlined text-neutral-900 dark:text-[#a4c9ff] text-[18px]">
                      verified_user
                    </span>
                    <span className="font-label text-xs text-neutral-800 dark:text-[#d2e4fc] font-bold">
                      NCPOR Standard Protocol v4.2 in strict effect
                    </span>
                  </div>
                </div>

                {/* Environmental Telemetry */}
                <div className="bg-white dark:bg-[#0a1d2e] p-4 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between gap-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase font-bold text-neutral-500 dark:text-[#c1c6d3]">
                      Live Station Conditions
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-[#0f2132] text-neutral-800 dark:text-[#a4c9ff] font-mono text-[9px] font-bold border border-neutral-200 dark:border-[#253648]">
                      ARGOS + IRIDIUM
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 my-1">
                    <div className="bg-neutral-50 dark:bg-[#0f2132] p-2.5 rounded-lg border border-neutral-200 dark:border-[#253648]">
                      <span className="text-[9px] font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase">
                        TEMP / CHILL
                      </span>
                      <p className="font-telemetry-num text-xl font-bold text-neutral-900 dark:text-[#d2e4fc]">
                        {primaryExpedition.weather?.temp ?? '-32.4°C'}
                      </p>
                      <span className="text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
                        Windchill {primaryExpedition.weather?.windchill ?? '-46.2°C'}
                      </span>
                    </div>
                    <div className="bg-neutral-50 dark:bg-[#0f2132] p-2.5 rounded-lg border border-neutral-200 dark:border-[#253648]">
                      <span className="text-[9px] font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase">
                        KATABATIC WIND
                      </span>
                      <p className="font-telemetry-num text-xl font-bold text-neutral-900 dark:text-[#a4c9ff]">
                        {primaryExpedition.weather?.wind ?? '38 kt ESE'}
                      </p>
                      <span className="text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
                        Gusts up to {primaryExpedition.weather?.gusts ?? '54 kt'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-neutral-500 dark:text-[#c1c6d3] text-[11px]">
                    <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Comms Link 99.4% Uplink
                    </span>
                    <span className="font-mono">{primaryExpedition.weather?.pressure ?? '984 hPa'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Panel 2: Timeline */}
            {activeDossierTab === 'timeline' && (
              <div className="space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-headline text-xs sm:text-sm font-bold text-neutral-900 dark:text-[#d2e4fc]">
                    Multi-Stage Expedition Milestone Chain
                  </span>
                  <span className="font-mono text-xs text-neutral-900 dark:text-[#a4c9ff] font-bold">
                    Stage 5 of 6 Active
                  </span>
                </div>

                {[
                  {
                    num: '1',
                    title: '1. Scientific & Logistics Planning',
                    status: 'COMPLETED ✓',
                    desc: '01 Jan 2026 • NCPOR HQ Goa • Approvals finalized',
                    isDone: true,
                  },
                  {
                    num: '2',
                    title: '2. Cargo Consolidation & Cold Packing',
                    status: 'COMPLETED ✓',
                    desc: '15 May 2026 • Cape Town Staging Deck',
                    isDone: true,
                  },
                  {
                    num: '3',
                    title: '3. Southern Ocean Marine Transit',
                    status: 'COMPLETED ✓',
                    desc: '24 Jun → 11 Aug 2026 • S.A. Agulhas II Icebreaker',
                    isDone: true,
                  },
                  {
                    num: '4',
                    title: '4. Bharati Basecamp Touchdown',
                    status: 'COMPLETED ✓',
                    desc: '12 Aug 2026 • Personnel & Habitation modules operational',
                    isDone: true,
                  },
                  {
                    num: '5',
                    title: '5. Field Operations & Deep Ice Core Sampling',
                    status: 'ACTIVE NOW • 68%',
                    desc: 'Currently engaged in Sector 4 drill testbed. Weather window nominal.',
                    isActive: true,
                  },
                  {
                    num: '6',
                    title: '6. Season Wrap & Evacuation Transit',
                    status: 'SCHEDULED 28 SEP',
                    desc: 'Target extraction via Polar Research Vessel slot 02.',
                    isPending: true,
                  },
                ].map((st, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                      st.isActive
                        ? 'bg-neutral-100 dark:bg-[#0f2132] border-2 border-black dark:border-[#a4c9ff]'
                        : st.isDone
                        ? 'bg-white dark:bg-[#0a1d2e] border-neutral-200 dark:border-[#253648]'
                        : 'bg-neutral-100/50 dark:bg-[#0f2132]/40 border-neutral-200 dark:border-[#253648] opacity-70'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${
                        st.isActive
                          ? 'text-neutral-900 dark:text-[#a4c9ff] animate-pulse'
                          : st.isDone
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-neutral-400'
                      }`}
                    >
                      {st.isDone ? 'check_circle' : st.isActive ? 'radio_button_checked' : 'schedule'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="font-headline text-xs sm:text-sm font-bold text-neutral-900 dark:text-[#d2e4fc]">
                          {st.title}
                        </span>
                        <span
                          className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            st.isActive
                              ? 'bg-black text-white dark:bg-[#0b5ea8]'
                              : st.isDone
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-neutral-200 dark:bg-[#253648] text-neutral-700 dark:text-[#c1c6d3]'
                          }`}
                        >
                          {st.status}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-[#c1c6d3] mt-0.5">{st.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab Panel 3: Personnel */}
            {activeDossierTab === 'personnel' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-headline text-xs sm:text-sm font-bold text-neutral-900 dark:text-[#d2e4fc]">
                      Expedition Crew Manifest
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] block">
                      Assigned to {primaryExpedition.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-neutral-900 dark:text-[#a4c9ff] font-bold">
                      {personnelList.filter((p) => p.expedition === primaryExpedition.id || p.expeditionId === primaryExpedition.id || (primaryExpedition.id === 'INPEX-2026' && !p.expedition)).length} Active Members
                    </span>
                    <button
                      onClick={() => setIsAssignOpen(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white text-xs font-headline font-bold transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[14px]">person_add</span>
                      <span>Assign Member</span>
                    </button>
                  </div>
                </div>

                {personnelList.filter((p) => p.expedition === primaryExpedition.id || p.expeditionId === primaryExpedition.id || (primaryExpedition.id === 'INPEX-2026' && !p.expedition)).length === 0 ? (
                  <div className="p-6 text-center bg-white dark:bg-[#0a1d2e] rounded-xl border border-dashed border-neutral-300 dark:border-[#253648]">
                    <span className="material-symbols-outlined text-neutral-400 text-[28px] mb-1">group_off</span>
                    <p className="text-xs text-neutral-600 dark:text-[#c1c6d3]">No personnel assigned to this expedition yet.</p>
                    <button
                      onClick={() => setIsAssignOpen(true)}
                      className="mt-2 text-xs font-bold text-neutral-900 dark:text-[#a4c9ff] underline"
                    >
                      + Assign Officers from Station Roster
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {personnelList
                      .filter((p) => p.expedition === primaryExpedition.id || p.expeditionId === primaryExpedition.id || (primaryExpedition.id === 'INPEX-2026' && !p.expedition))
                      .map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between bg-white dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] shadow-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {p.avatarUrl || (p as any).avatar ? (
                              <img
                                src={p.avatarUrl || (p as any).avatar}
                                alt={p.name}
                                className="w-10 h-10 rounded-lg object-cover shrink-0 ring-1 ring-neutral-300 dark:ring-[#253648]"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-200 dark:border-[#253648] flex items-center justify-center text-neutral-800 dark:text-[#a4c9ff] shrink-0">
                                <span className="material-symbols-outlined text-[20px]">person</span>
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc] truncate">
                                {p.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold uppercase text-neutral-900 dark:text-[#a4c9ff]">
                                {p.role}
                              </span>
                              <span className="text-[10px] text-neutral-500 dark:text-[#c1c6d3] truncate">
                                {p.station?.toUpperCase()} • {p.status || 'Active'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnassignMember(p.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-[#0f2132] transition-colors shrink-0"
                            title="Unassign from Expedition"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab Panel 4 & 5: Cargo & Assets */}
            {(activeDossierTab === 'cargo' || activeDossierTab === 'assets') && (
              <div className="space-y-2.5 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-white dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-neutral-900 dark:text-[#a4c9ff] text-[20px]">
                        bolt
                      </span>
                      <div>
                        <span className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc] block">
                          Gen-Set POLAR-AX-1042
                        </span>
                        <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3]">
                          Extreme-Cold Diesel 450kW
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 font-mono text-[9px] font-bold uppercase">
                      Nominal
                    </span>
                  </div>

                  <div className="bg-white dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-neutral-900 dark:text-[#a4c9ff] text-[20px]">
                        directions_bus
                      </span>
                      <div>
                        <span className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc] block">
                          PistenBully Snowcat #04
                        </span>
                        <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3]">
                          Sector 4 Drill Platform
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 font-mono text-[9px] font-bold uppercase">
                      In-Field
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Panel 6: Alerts */}
            {activeDossierTab === 'alerts' && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 p-3 rounded-xl flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-red-600 text-[20px] shrink-0">
                    warning
                  </span>
                  <div>
                    <span className="font-headline text-xs font-bold text-red-700 dark:text-red-300">
                      Fuel Reserve Safety Threshold Alert
                    </span>
                    <p className="text-xs text-red-600/90 dark:text-red-400/90 mt-0.5">
                      AFT Fuel bladder 3 dropping faster than scheduled burn rate due to sustained -30°C
                      heating demands.
                    </p>
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 p-3 rounded-xl flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0">
                    medical_services
                  </span>
                  <div>
                    <span className="font-headline text-xs font-bold text-amber-800 dark:text-amber-300">
                      Medical Resupply Due
                    </span>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      Class IV cold-weather antibiotics and intravenous fluids batch expires in 18
                      days.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Secondary Deployment Logs */}
      <div className="flex flex-col gap-2.5 pt-2">
        <div className="flex items-center justify-between">
          <span className="font-headline text-sm sm:text-base font-bold text-neutral-900 dark:text-[#d2e4fc]">
            Secondary Deployment Logs
          </span>
          <span className="text-[10px] font-mono font-bold text-neutral-500 dark:text-[#c1c6d3] uppercase">
            {filteredSecondary.length} Expeditions in View
          </span>
        </div>

        {filteredSecondary.map((exp) => (
          <div
            key={exp.id}
            className="bg-white hover:bg-neutral-50 dark:bg-[#0a1d2e] dark:hover:bg-[#0f2132] p-4 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col gap-2 shadow-sm transition-all"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setSelectedExpeditionId(exp.id);
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="font-headline text-xs sm:text-sm font-bold text-neutral-900 dark:text-[#d2e4fc] hover:text-blue-600 dark:hover:text-[#a4c9ff] text-left underline decoration-dotted"
                  title="Click to view expedition dossier"
                >
                  {exp.name}
                </button>
                <select
                  value={exp.status}
                  onChange={(e) => handleUpdateStatus(exp.id, e.target.value as any)}
                  className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-800 dark:text-[#a4c9ff] outline-none cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="planning">Planning</option>
                  <option value="delayed">Delayed</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingExpedition(exp)}
                  className="px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] text-[10px] font-mono text-neutral-700 dark:text-[#c1c6d3] border border-neutral-300 dark:border-[#253648]"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setSelectedExpeditionId(exp.id);
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="px-2.5 py-0.5 rounded bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white text-[10px] font-bold font-headline"
                >
                  Load Dossier
                </button>
                <span className="font-mono text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
                  {exp.location}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div>
                <span className="text-[9px] font-mono text-neutral-400 block uppercase">Window</span>
                <span className="font-medium text-neutral-900 dark:text-[#d2e4fc]">
                  {exp.startDate} → {exp.endDate}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-neutral-400 block uppercase">
                  Manifest
                </span>
                <span className="font-medium text-neutral-900 dark:text-[#d2e4fc]">
                  {exp.manifestSummary}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-neutral-400 block uppercase">
                  Discipline
                </span>
                <span className="font-medium text-neutral-900 dark:text-[#d2e4fc]">
                  {exp.discipline}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-neutral-400 block uppercase">
                  Progress
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-neutral-200 dark:bg-[#253648] overflow-hidden">
                    <div
                      className={`h-full ${
                        exp.status === 'delayed' ? 'bg-red-600' : 'bg-black dark:bg-[#a4c9ff]'
                      }`}
                      style={{ width: `${exp.progressPercent}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold text-neutral-900 dark:text-[#a4c9ff]">
                    {exp.progressPercent}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Expedition Tactical Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl border-2 border-neutral-900 dark:border-[#a4c9ff] shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-200 dark:border-[#253648] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-neutral-900 dark:text-[#a4c9ff]">
                  explore
                </span>
                <h3 className="font-headline text-sm font-bold text-neutral-900 dark:text-[#d2e4fc]">
                  Initiate New Polar Expedition
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 flex flex-col gap-3 text-xs">
              <div>
                <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                  Expedition Code / Title
                </label>
                <input
                  type="text"
                  required
                  value={newExpName}
                  onChange={(e) => setNewExpName(e.target.value)}
                  placeholder="e.g. INPEX-EAST-TRAVERSE"
                  className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                  Primary Polar Discipline
                </label>
                <select
                  value={newExpDiscipline}
                  onChange={(e) => setNewExpDiscipline(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
                >
                  <option value="Cryospheric Ice Sheet Dynamics">Cryospheric Ice Sheet Dynamics</option>
                  <option value="Sub-Ice Core Sediment Sampling">Sub-Ice Core Sediment Sampling</option>
                  <option value="Atmospheric Physics & Aurora Profiling">Atmospheric Physics & Aurora Profiling</option>
                  <option value="Autonomous Marine Robotic Exploration">Autonomous Marine Robotic Exploration</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                  Staging Base Station
                </label>
                <select
                  value={newExpStation}
                  onChange={(e) => setNewExpStation(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
                >
                  <option value="Bharati Station">Bharati Station (-69.407°S)</option>
                  <option value="Maitri Base">Maitri Base (-70.766°S)</option>
                  <option value="Himadri Arctic Node">Himadri Arctic Node (78.924°N)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                  Mission Objective
                </label>
                <textarea
                  rows={2}
                  value={newExpObjective}
                  onChange={(e) => setNewExpObjective(e.target.value)}
                  placeholder="Primary scientific goals and route details..."
                  className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingExp}
                className="w-full mt-2 py-3 bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white font-headline text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmittingExp ? (
                  <span>Registering to Firestore...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                    <span>Commit & Launch Expedition</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expedition Modal */}
      {editingExpedition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl border-2 border-neutral-900 dark:border-[#a4c9ff] shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-200 dark:border-[#253648] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-neutral-900 dark:text-[#a4c9ff]">edit</span>
                <h3 className="font-headline text-sm font-bold text-neutral-900 dark:text-[#d2e4fc]">
                  Edit Expedition: {editingExpedition.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingExpedition(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveExpedition} className="p-5 flex flex-col gap-3 text-xs">
              <div>
                <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                  Expedition Name / Designation
                </label>
                <input
                  type="text"
                  required
                  value={editingExpedition.name}
                  onChange={(e) => setEditingExpedition({ ...editingExpedition, name: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                    Status
                  </label>
                  <select
                    value={editingExpedition.status}
                    onChange={(e) => setEditingExpedition({ ...editingExpedition, status: e.target.value as any })}
                    className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
                  >
                    <option value="active">Active</option>
                    <option value="planning">Planning</option>
                    <option value="delayed">Delayed</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                    Progress %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingExpedition.progressPercent}
                    onChange={(e) => setEditingExpedition({ ...editingExpedition, progressPercent: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                  Discipline
                </label>
                <input
                  type="text"
                  value={editingExpedition.discipline}
                  onChange={(e) => setEditingExpedition({ ...editingExpedition, discipline: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                  Mission Objective
                </label>
                <textarea
                  rows={3}
                  value={editingExpedition.objective}
                  onChange={(e) => setEditingExpedition({ ...editingExpedition, objective: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full mt-2 py-3 bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white font-headline text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isUpdating ? (
                  <span>Updating Firestore...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Save Changes to Database</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Personnel Modal */}
      {isAssignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl border-2 border-neutral-900 dark:border-[#a4c9ff] shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-200 dark:border-[#253648] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-neutral-900 dark:text-[#a4c9ff]">person_add</span>
                <h3 className="font-headline text-sm font-bold text-neutral-900 dark:text-[#d2e4fc]">
                  Assign Personnel to {primaryExpedition.name}
                </h3>
              </div>
              <button
                onClick={() => setIsAssignOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs">
              <p className="text-neutral-600 dark:text-[#c1c6d3]">
                Select an available officer or technician from the station roster to assign to this expedition:
              </p>

              <div>
                <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                  Select Personnel
                </label>
                <select
                  value={selectedPersonId}
                  onChange={(e) => setSelectedPersonId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
                >
                  <option value="">-- Choose officer from roster --</option>
                  {personnelList
                    .filter((p) => p.expedition !== primaryExpedition.id && p.expeditionId !== primaryExpedition.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role}) - {p.station ? p.station.toUpperCase() : 'General'}
                      </option>
                    ))}
                </select>
              </div>

              <button
                type="button"
                disabled={!selectedPersonId}
                onClick={() => handleAssignMember(selectedPersonId)}
                className="w-full mt-2 py-3 bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white font-headline text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Confirm Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
