/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StationKey, PersonnelMember, Expedition } from '../types';
import {
  subscribePersonnel,
  subscribeExpeditions,
  createPersonnel,
  updatePersonnel,
} from '../firebase/dbService';
import { INITIAL_PERSONNEL } from '../data/initialData';

interface PersonnelManagementProps {
  currentStation?: StationKey;
  onToast: (title: string, body: string, icon?: string, color?: 'green' | 'amber' | 'blue') => void;
}

export const PersonnelManagement: React.FC<PersonnelManagementProps> = ({
  currentStation = 'bharati',
  onToast,
}) => {
  const [filterStation, setFilterStation] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [personnelList, setPersonnelList] = useState<PersonnelMember[]>([]);
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<PersonnelMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Personnel Form State
  const [newPerson, setNewPerson] = useState({
    name: '',
    role: '',
    station: currentStation as StationKey,
    clearance: 'LEVEL-3 FIELD TACTICAL',
    status: 'ON ACTIVE DUTY',
    medicalFitness: 'OPTIMAL (100%)',
    contact: '',
    specialty: '',
    expeditionId: '',
  });

  // Edit Personnel Form State
  const [editForm, setEditForm] = useState({
    status: 'ON ACTIVE DUTY',
    station: 'bharati' as StationKey,
    expeditionId: '',
    role: '',
    specialty: '',
  });

  useEffect(() => {
    const unsubPersonnel = subscribePersonnel((data) => {
      setIsLoading(false);
      if (data && data.length > 0) {
        setPersonnelList(data);
        setIsLiveConnected(true);
      } else {
        setPersonnelList(INITIAL_PERSONNEL);
      }
    });

    const unsubExpeditions = subscribeExpeditions((data) => {
      if (data) {
        setExpeditions(data);
      }
    });

    return () => {
      unsubPersonnel();
      unsubExpeditions();
    };
  }, []);

  const handleOpenEdit = (member: PersonnelMember) => {
    setEditingMember(member);
    setEditForm({
      status: member.status || 'ON ACTIVE DUTY',
      station: (member.station as StationKey) || 'bharati',
      expeditionId: member.expeditionId || member.expedition || '',
      role: member.role || '',
      specialty: member.specialty || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setIsSubmitting(true);
    try {
      const selectedExp = expeditions.find((exp) => exp.id === editForm.expeditionId);
      await updatePersonnel(editingMember.id, {
        status: editForm.status,
        station: editForm.station,
        expeditionId: editForm.expeditionId || '',
        expedition: editForm.expeditionId || '',
        role: editForm.role,
        specialty: editForm.specialty,
      });

      onToast(
        'PERSONNEL UPDATED',
        `Updated status and assignments for ${editingMember.name} in Firestore`,
        'check_circle',
        'green'
      );
      setEditingMember(null);
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to update personnel', 'error', 'amber');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPerson.name || !newPerson.role) {
      onToast('MISSING FIELDS', 'Please provide a name and operational role', 'warning', 'amber');
      return;
    }

    setIsSubmitting(true);
    try {
      const id = `PERS-${Date.now().toString().slice(-4)}`;
      const memberData: PersonnelMember = {
        id,
        name: newPerson.name,
        role: newPerson.role,
        station: newPerson.station,
        clearance: newPerson.clearance,
        status: newPerson.status,
        medicalFitness: newPerson.medicalFitness,
        contact: newPerson.contact || `${newPerson.name.toLowerCase().replace(/\s+/g, '.')}@ncpor.gov.in`,
        specialty: newPerson.specialty || 'General Polar Station Operations',
        expeditionId: newPerson.expeditionId || '',
        expedition: newPerson.expeditionId || '',
      };

      await createPersonnel(memberData);
      onToast('PERSONNEL INDUCTED', `Enrolled ${newPerson.name} (${id}) into Firestore database`, 'person_add', 'green');
      setIsAddModalOpen(false);
      setNewPerson({
        name: '',
        role: '',
        station: currentStation as StationKey,
        clearance: 'LEVEL-3 FIELD TACTICAL',
        status: 'ON ACTIVE DUTY',
        medicalFitness: 'OPTIMAL (100%)',
        contact: '',
        specialty: '',
        expeditionId: '',
      });
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to create personnel in Firestore', 'error', 'amber');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (member: PersonnelMember, nextStatus: string) => {
    try {
      await updatePersonnel(member.id, { status: nextStatus });
      onToast('STATUS UPDATED', `${member.name} status updated to ${nextStatus}`, 'published_with_changes', 'blue');
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to update status', 'error', 'amber');
    }
  };

  const filtered = personnelList.filter((p) => {
    const matchesStation = filterStation === 'all' || p.station.toLowerCase() === filterStation.toLowerCase();
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.specialty && p.specialty.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStation && matchesStatus && matchesSearch;
  });

  return (
    <div className="w-full flex flex-col gap-5 pb-8">
      {/* Top Banner */}
      <div className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-[#0a1d2e] rounded-2xl border border-neutral-200 dark:border-[#253648] shadow-sm flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="material-symbols-outlined text-blue-600 dark:text-[#a4c9ff]">badge</span>
            <h1 className="font-headline text-xl font-bold text-neutral-900 dark:text-[#d2e4fc]">
              Station Personnel & Expedition Officers
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 dark:bg-[#0f2132] text-neutral-700 dark:text-[#c1c6d3] border border-neutral-300 dark:border-[#253648]">
              {filtered.length} / {personnelList.length} Personnel
            </span>
            {isLiveConnected && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                FIRESTORE LIVE
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-[#c1c6d3] mt-0.5">
            Real-time duty roster, medical readiness scores, and tactical station assignments.
          </p>
        </div>

        {/* Controls and Action */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white text-xs font-headline font-bold shadow-sm transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            <span>Add Personnel</span>
          </button>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-neutral-400">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search personnel, ID, role..."
              className="bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-900 dark:text-[#d2e4fc] focus:outline-none w-48"
            />
          </div>

          <select
            value={filterStation}
            onChange={(e) => setFilterStation(e.target.value)}
            className="bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-2.5 py-1.5 text-xs text-neutral-900 dark:text-[#d2e4fc] focus:outline-none font-bold"
          >
            <option value="all">All Stations</option>
            <option value="bharati">Bharati Base</option>
            <option value="maitri">Maitri Base</option>
            <option value="himadri">Himadri Arctic</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-2.5 py-1.5 text-xs text-neutral-900 dark:text-[#d2e4fc] focus:outline-none font-bold"
          >
            <option value="all">All Statuses</option>
            <option value="ON ACTIVE DUTY">On Active Duty</option>
            <option value="TRAVERSE FIELD">Traverse Field</option>
            <option value="STANDBY SAR">Standby SAR</option>
            <option value="REST CYCLE">Rest Cycle</option>
          </select>
        </div>
      </div>

      {/* Personnel Roster Cards */}
      {isLoading ? (
        <div className="p-8 text-center bg-white dark:bg-[#0a1d2e] rounded-xl border border-neutral-200 dark:border-[#253648]">
          <span className="material-symbols-outlined text-4xl text-neutral-400 animate-spin">
            progress_activity
          </span>
          <p className="mt-2 text-xs font-mono text-neutral-500">Querying Firestore personnel collection...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-[#0a1d2e] rounded-xl border border-neutral-200 dark:border-[#253648]">
          <span className="material-symbols-outlined text-4xl text-neutral-400">person_off</span>
          <p className="mt-2 text-sm font-headline font-bold text-neutral-700 dark:text-[#d2e4fc]">
            No personnel found matching the criteria
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-3 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-headline font-bold"
          >
            Induct New Personnel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((member) => {
            const assignedExpedition = expeditions.find(
              (exp) => exp.id === (member.expeditionId || member.expedition)
            );

            return (
              <div
                key={member.id}
                className="p-4 bg-white dark:bg-[#0a1d2e] rounded-xl border border-neutral-200 dark:border-[#253648] shadow-sm flex flex-col justify-between gap-3 hover:border-neutral-400 dark:hover:border-[#a4c9ff]/60 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-headline font-bold text-sm text-neutral-900 dark:text-[#d2e4fc]">
                        {member.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-neutral-100 dark:bg-[#0f2132] text-neutral-700 dark:text-[#c1c6d3] border border-neutral-300 dark:border-[#253648]">
                        {member.id}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-neutral-600 dark:text-[#c1c6d3]">
                      {member.role}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                        member.status === 'ON ACTIVE DUTY'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : member.status === 'TRAVERSE FIELD'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                          : member.status === 'STANDBY SAR'
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {member.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-50 dark:bg-[#0f2132] p-2.5 rounded-lg border border-neutral-200 dark:border-[#253648]">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-neutral-500 dark:text-[#8b919c] block">
                      Station Assigned
                    </span>
                    <span className="font-bold text-neutral-800 dark:text-[#d2e4fc] capitalize flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-blue-500">location_on</span>
                      {member.station} Station
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono uppercase text-neutral-500 dark:text-[#8b919c] block">
                      Assigned Expedition
                    </span>
                    <span className="font-bold text-neutral-800 dark:text-[#d2e4fc] truncate block">
                      {assignedExpedition ? (
                        <span className="text-blue-600 dark:text-blue-400">{assignedExpedition.name}</span>
                      ) : (
                        <span className="text-neutral-400 font-normal">Base Duty Pool</span>
                      )}
                    </span>
                  </div>

                  <div className="col-span-2 pt-1 border-t border-neutral-200 dark:border-[#253648]">
                    <span className="text-[10px] font-mono uppercase text-neutral-500 dark:text-[#8b919c] block">
                      Specialty & Responsibilities
                    </span>
                    <span className="text-neutral-700 dark:text-[#c1c6d3]">
                      {member.specialty || 'General logistics and operations'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100 dark:border-[#253648] flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-neutral-600 dark:text-[#8b919c]">
                    <span className="material-symbols-outlined text-[15px] text-emerald-500">vital_signs</span>
                    <span className="font-mono text-[11px]">Fitness: {member.medicalFitness || 'OPTIMAL (100%)'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Quick status cycle button */}
                    <button
                      onClick={() => {
                        const statuses = ['ON ACTIVE DUTY', 'TRAVERSE FIELD', 'STANDBY SAR', 'REST CYCLE'];
                        const nextIndex = (statuses.indexOf(member.status) + 1) % statuses.length;
                        handleQuickStatusChange(member, statuses[nextIndex]);
                      }}
                      title="Cycle Status"
                      className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] text-neutral-700 dark:text-[#c1c6d3] rounded-lg text-[11px] font-bold border border-neutral-300 dark:border-[#253648] flex items-center gap-1 transition-all"
                    >
                      <span className="material-symbols-outlined text-[13px]">published_with_changes</span>
                      <span>Toggle Status</span>
                    </button>

                    {/* Edit / Reassign modal button */}
                    <button
                      onClick={() => handleOpenEdit(member)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[14px]">tune</span>
                      <span>Reassign</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Reassign Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#0a1d2e] border border-neutral-300 dark:border-[#253648] rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-[#253648]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-[22px]">manage_accounts</span>
                <h3 className="font-headline font-bold text-base text-neutral-900 dark:text-[#d2e4fc]">
                  Reassign Personnel: {editingMember.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                    Station Assignment
                  </label>
                  <select
                    value={editForm.station}
                    onChange={(e) => setEditForm({ ...editForm, station: e.target.value as StationKey })}
                    className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="bharati">Bharati Base (Larsemann Hills)</option>
                    <option value="maitri">Maitri Base (Schirmacher Oasis)</option>
                    <option value="himadri">Himadri Station (Ny-Ålesund, Arctic)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                    Operational Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="ON ACTIVE DUTY">ON ACTIVE DUTY</option>
                    <option value="TRAVERSE FIELD">TRAVERSE FIELD</option>
                    <option value="STANDBY SAR">STANDBY SAR</option>
                    <option value="REST CYCLE">REST CYCLE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                  Assign to Active Expedition
                </label>
                <select
                  value={editForm.expeditionId}
                  onChange={(e) => setEditForm({ ...editForm, expeditionId: e.target.value })}
                  className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500 font-bold"
                >
                  <option value="">-- No Expedition (General Station Pool) --</option>
                  {expeditions.map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.name} ({exp.status.toUpperCase()} • {exp.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                  Operational Role
                </label>
                <input
                  type="text"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                  Specialty & Responsibilities
                </label>
                <textarea
                  rows={2}
                  value={editForm.specialty}
                  onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                  className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
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
                    <span>Saving...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>Update Assignment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Personnel Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#0a1d2e] border border-neutral-300 dark:border-[#253648] rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-[#253648]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-[22px]">person_add</span>
                <h3 className="font-headline font-bold text-base text-neutral-900 dark:text-[#d2e4fc]">
                  Induct New Station Personnel
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreatePersonnel} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={newPerson.name}
                    onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                    Operational Role *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cryo-Geologist / Field Engineer"
                    value={newPerson.role}
                    onChange={(e) => setNewPerson({ ...newPerson, role: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                    Station Station Base
                  </label>
                  <select
                    value={newPerson.station}
                    onChange={(e) => setNewPerson({ ...newPerson, station: e.target.value as StationKey })}
                    className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="bharati">Bharati Base</option>
                    <option value="maitri">Maitri Base</option>
                    <option value="himadri">Himadri Station</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                    Duty Status
                  </label>
                  <select
                    value={newPerson.status}
                    onChange={(e) => setNewPerson({ ...newPerson, status: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="ON ACTIVE DUTY">ON ACTIVE DUTY</option>
                    <option value="TRAVERSE FIELD">TRAVERSE FIELD</option>
                    <option value="STANDBY SAR">STANDBY SAR</option>
                    <option value="REST CYCLE">REST CYCLE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                    Expedition Assignment (Optional)
                  </label>
                  <select
                    value={newPerson.expeditionId}
                    onChange={(e) => setNewPerson({ ...newPerson, expeditionId: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="">-- Station Base Duty Pool --</option>
                    {expeditions.map((exp) => (
                      <option key={exp.id} value={exp.id}>
                        {exp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                    Security Clearance
                  </label>
                  <select
                    value={newPerson.clearance}
                    onChange={(e) => setNewPerson({ ...newPerson, clearance: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="LEVEL-1 GENERAL">LEVEL-1 GENERAL</option>
                    <option value="LEVEL-2 SCIENCE OBSERVER">LEVEL-2 SCIENCE OBSERVER</option>
                    <option value="LEVEL-3 FIELD TACTICAL">LEVEL-3 FIELD TACTICAL</option>
                    <option value="LEVEL-4 TOP SECRET">LEVEL-4 TOP SECRET</option>
                    <option value="LEVEL-5 FULL COMMAND">LEVEL-5 FULL COMMAND</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                  Specialty & Responsibilities
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Ice drill specialist, high-altitude crevasse rescue certified"
                  value={newPerson.specialty}
                  onChange={(e) => setNewPerson({ ...newPerson, specialty: e.target.value })}
                  className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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
                    <span>Inducting into Firestore...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                      <span>Induct Personnel</span>
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
