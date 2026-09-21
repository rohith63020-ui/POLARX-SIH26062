/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CargoAsset, OfflineRecord, UserProfile } from '../types';
import { PolarLogo } from './PolarLogo';

/* =========================================================================
   1. GLOBAL TACTICAL TOAST NOTIFICATION
   ========================================================================= */
export interface ToastData {
  id: string;
  title: string;
  body: string;
  icon?: string;
  color?: 'green' | 'amber' | 'blue';
}

export const TacticalToast: React.FC<{
  toasts?: ToastData[];
  onDismiss: (id: string) => void;
}> = ({ toasts = [], onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-24 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {(toasts || []).map((t) => {
        let border = 'border-neutral-900 dark:border-[#a4c9ff]';
        let badgeBg = 'bg-neutral-900 text-white dark:bg-[#0b5ea8]';
        if (t.color === 'green') {
          border = 'border-emerald-600 dark:border-emerald-500';
          badgeBg = 'bg-emerald-600 text-white';
        } else if (t.color === 'amber') {
          border = 'border-amber-600 dark:border-amber-500';
          badgeBg = 'bg-amber-600 text-white';
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto bg-white/95 dark:bg-[#0a1d2e]/95 backdrop-blur-xl p-3 rounded-xl border-2 ${border} shadow-2xl flex items-start gap-3 animate-in slide-in-from-right duration-200`}
          >
            <div
              className={`w-8 h-8 rounded-lg ${badgeBg} flex items-center justify-center shrink-0 shadow-sm`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {t.icon || 'notifications'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc] block truncate">
                {t.title}
              </span>
              <p className="text-[11px] text-neutral-600 dark:text-[#c1c6d3] mt-0.5 leading-tight">
                {t.body}
              </p>
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white shrink-0 p-0.5"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};

/* =========================================================================
   2. GENERIC DIALOG MODAL
   ========================================================================= */
export const GenericModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, icon, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl border-2 border-neutral-900 dark:border-[#a4c9ff] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-neutral-200 dark:border-[#253648] flex items-center justify-between bg-neutral-50 dark:bg-[#0f2132]">
          <div className="flex items-center gap-2">
            {icon && (
              <span className="material-symbols-outlined text-neutral-900 dark:text-[#a4c9ff] text-[20px]">
                {icon}
              </span>
            )}
            <h3 className="font-headline text-sm sm:text-base font-bold text-neutral-900 dark:text-[#d2e4fc]">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-[#1a2b3d] text-neutral-600 dark:text-[#c1c6d3]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

/* =========================================================================
   3. QR SCANNER REAL BROWSER MODAL (html5-qrcode)
   ========================================================================= */
export { QrScannerModal } from './QrScannerModal';

/* =========================================================================
   4. ADD CARGO ASSET MODAL
   ========================================================================= */
export const AddCargoAssetModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAddAsset: (asset: CargoAsset) => void;
}> = ({ isOpen, onClose, onAddAsset }) => {
  const [name, setName] = useState('');
  const [qrId, setQrId] = useState(`POLAR-AX-${Math.floor(1000 + Math.random() * 9000)}`);
  const [weight, setWeight] = useState('500');
  const [status, setStatus] = useState<CargoAsset['status']>('IN TRANSIT');
  const [location, setLocation] = useState('Southern Ocean Corridor');
  const [carrier, setCarrier] = useState('S.A. Agulhas II');
  const [destination, setDestination] = useState('Bharati Station');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = qrId.trim() || `POLAR-AX-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAsset: CargoAsset = {
      id,
      name: name || 'Scientific Deep-Core Drill Head',
      category: 'Science Core',
      tier: 'Tier 1 Priority Core',
      status,
      healthPercent: 98,
      location: location || 'Southern Ocean Corridor',
      destStation: destination,
      destination,
      carrier,
      eta: '28 Aug 2026',
      mass: `${weight || 500} kg`,
      weightKg: Number(weight) || 500,
      integrity: 98,
      serialNumber: `SN-${Math.floor(10000 + Math.random() * 90000)}`,
      departureDate: '12 Aug 2026',
      logId: `NCPOR-${Math.floor(1000 + Math.random() * 9000)}`,
      qrPayload: `NCPOR:${id}:${destination}:VERIFIED`,
      lastTelemetry: 'Just registered (Local RF)',
    };
    onAddAsset(newAsset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl border-2 border-neutral-900 dark:border-[#a4c9ff] shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        <div className="p-4 border-b border-neutral-200 dark:border-[#253648] flex items-center justify-between">
          <h3 className="font-headline text-sm font-bold text-neutral-900 dark:text-[#d2e4fc]">
            Register High-Value Cargo / Asset
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                Asset QR ID *
              </label>
              <input
                type="text"
                required
                value={qrId}
                onChange={(e) => setQrId(e.target.value)}
                placeholder="e.g. POLAR-AX-1042"
                className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc] font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc] font-bold"
              >
                <option value="IN TRANSIT">IN TRANSIT</option>
                <option value="AT STATION">AT STATION</option>
                <option value="DEPLOYED">DEPLOYED</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
              Asset Designation / Description *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cryo-Freezer Module 200L"
              className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
            />
          </div>

          <div>
            <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
              Current Location / Tracking Point *
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Southern Ocean Corridor, Prydz Bay, Bharati Staging Bay"
              className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                required
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
              />
            </div>
            <div>
              <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                Vessel / Carrier
              </label>
              <input
                type="text"
                required
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
              Destination Polar Basecamp
            </label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
            >
              <option value="Bharati Station">Bharati Station (-69.407°S)</option>
              <option value="Maitri Base">Maitri Base (-70.766°S)</option>
              <option value="Himadri Arctic Node">Himadri Arctic Node (78.924°N)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white font-headline text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95"
          >
            Save Asset & Generate QR Tag
          </button>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   4B. EDIT CARGO ASSET MODAL
   ========================================================================= */
export const EditCargoAssetModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  asset: CargoAsset;
  onSave: (id: string, updates: Partial<CargoAsset>) => void;
}> = ({ isOpen, onClose, asset, onSave }) => {
  const [name, setName] = useState(asset.name || '');
  const [status, setStatus] = useState<CargoAsset['status']>(asset.status || 'IN TRANSIT');
  const [location, setLocation] = useState(asset.location || '');
  const [carrier, setCarrier] = useState(asset.carrier || asset.vessel || '');
  const [destination, setDestination] = useState(asset.destination || asset.destStation || 'Bharati Station');
  const [healthPercent, setHealthPercent] = useState(asset.healthPercent ?? asset.integrity ?? 95);

  useEffect(() => {
    setName(asset.name || '');
    setStatus(asset.status || 'IN TRANSIT');
    setLocation(asset.location || '');
    setCarrier(asset.carrier || asset.vessel || '');
    setDestination(asset.destination || asset.destStation || 'Bharati Station');
    setHealthPercent(asset.healthPercent ?? asset.integrity ?? 95);
  }, [asset]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(asset.id, {
      name,
      status,
      location,
      carrier,
      destination,
      destStation: destination,
      healthPercent: Number(healthPercent),
      integrity: Number(healthPercent),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl border-2 border-neutral-900 dark:border-[#a4c9ff] shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        <div className="p-4 border-b border-neutral-200 dark:border-[#253648] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-neutral-900 dark:text-[#a4c9ff]">
              edit
            </span>
            <h3 className="font-headline text-sm font-bold text-neutral-900 dark:text-[#d2e4fc]">
              Update Asset / Cargo: {asset.id}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3 text-xs">
          <div>
            <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
              Asset Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                Operational Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc] font-bold"
              >
                <option value="IN TRANSIT">IN TRANSIT</option>
                <option value="AT STATION">AT STATION</option>
                <option value="DEPLOYED">DEPLOYED</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                Integrity (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={healthPercent}
                onChange={(e) => setHealthPercent(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
              Current Location
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                Carrier / Vessel
              </label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
              />
            </div>

            <div>
              <label className="font-bold text-neutral-800 dark:text-[#d2e4fc] block mb-1">
                Destination Base
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc]"
              >
                <option value="Bharati Station">Bharati Station</option>
                <option value="Maitri Base">Maitri Base</option>
                <option value="Himadri Arctic Node">Himadri Arctic Node</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-neutral-600 dark:text-[#c1c6d3] font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white font-headline text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95"
            >
              Update in Firestore
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   5. RESUPPLY REQUEST MODAL
   ========================================================================= */
export const ResupplyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: string, qty: string) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [item, setItem] = useState('Broad-Spec IV Antibiotics (POLAR-MED-409)');
  const [qty, setQty] = useState('200 units');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl border-2 border-neutral-900 dark:border-[#a4c9ff] shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        <div className="p-4 border-b border-neutral-200 dark:border-[#253648] flex items-center justify-between">
          <h3 className="font-headline text-sm font-bold text-neutral-900 dark:text-[#d2e4fc]">
            Create Emergency Resupply Request
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-5 flex flex-col gap-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Target SKU / Item</label>
            <input
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648]"
            />
          </div>
          <div>
            <label className="font-bold block mb-1">Requested Quantity</label>
            <input
              type="text"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648]"
            />
          </div>
          <button
            onClick={() => {
              onSubmit(item, qty);
              onClose();
            }}
            className="w-full mt-2 py-3 bg-red-600 hover:bg-red-700 text-white font-headline text-xs font-bold uppercase tracking-wider rounded-xl shadow-md"
          >
            Transmit Priority Order to Goa HQ
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   6. USER IDENTITY CREDENTIALS MODAL
   ========================================================================= */
export const IdentityModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}> = ({ isOpen, onClose, user }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl border-2 border-neutral-900 dark:border-[#a4c9ff] shadow-2xl max-w-sm w-full overflow-hidden flex flex-col p-5 gap-4 text-center">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <PolarLogo size="xs" />
            <span className="font-mono text-[10px] font-bold tracking-wider text-neutral-600 dark:text-[#a4c9ff]">
              NCPOR POLARX
            </span>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-black dark:hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <img
          src={user.avatarUrl}
          alt={user.name}
          className="w-20 h-20 rounded-full mx-auto object-cover ring-4 ring-black dark:ring-[#a4c9ff]"
        />
        <div>
          <h3 className="font-headline text-lg font-black text-neutral-900 dark:text-[#d2e4fc]">
            {user.name}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-[#c1c6d3]">
            {user.role} • {user.station}
          </p>
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-black text-white dark:bg-[#0b5ea8] font-mono text-xs font-bold">
            CLEARANCE: {user.clearance}
          </span>
        </div>
        <div className="bg-neutral-100 dark:bg-[#0f2132] p-3 rounded-xl border text-xs font-mono text-left space-y-1">
          <div>
            <strong>Email:</strong> {user.email}
          </div>
          <div>
            <strong>ID:</strong> {user.id}
          </div>
          <div>
            <strong>Crypto Key:</strong> SHA-256 (NCPOR-SIH26062)
          </div>
        </div>
      </div>
    </div>
  );
};
