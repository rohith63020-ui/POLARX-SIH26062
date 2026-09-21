/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ConsumableItem } from '../types';
import { PolarLogo } from './PolarLogo';
import { useData } from '../context/DataContext';

interface InventoryIntelligenceProps {
  onOpenResupplyModal: () => void;
  onToast: (title: string, body: string, icon?: string, color?: 'green' | 'amber' | 'blue') => void;
}

export const InventoryIntelligence: React.FC<InventoryIntelligenceProps> = ({
  onOpenResupplyModal,
  onToast,
}) => {
  const dataCtx = useData();
  const items = dataCtx.inventory;
  const isLiveConnected = dataCtx.isOnline && !dataCtx.isSimulatedOffline;
  const isLoading = !dataCtx.isInitialized;

  const [filter, setFilter] = useState<
    'all' | 'critical' | 'low' | 'fuel' | 'medical' | 'rations'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeHorizon, setTimeHorizon] = useState<'7D' | '14D' | '30D' | '60D'>('14D');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const selectedItem =
    items.find((i) => i.id === selectedItemId || i.sku === selectedItemId) ||
    items[0] ||
    null;

  // Stock Transaction Modal State
  const [stockModalType, setStockModalType] = useState<'ADD' | 'CONSUME' | 'THRESHOLD' | null>(null);
  const [stockAmount, setStockAmount] = useState<string>('10');
  const [stockReason, setStockReason] = useState<string>('');
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !stockModalType) return;
    const val = Number(stockAmount);
    if (isNaN(val) || val <= 0) {
      onToast('INVALID AMOUNT', 'Please provide a positive numerical value', 'error', 'amber');
      return;
    }
    setIsSubmittingStock(true);
    try {
      if (stockModalType === 'THRESHOLD') {
        await dataCtx.updateInventoryItem(selectedItem.id, {
          minimumThreshold: val,
          minBuffer: val,
        });
        onToast('THRESHOLD UPDATED', `Set minimum threshold for ${selectedItem.name} to ${val} ${selectedItem.unit}`, 'check_circle', 'green');
      } else {
        await dataCtx.recordStockTransaction(selectedItem.id, stockModalType, val, stockReason);
        onToast(
          stockModalType === 'ADD' ? 'STOCK ADDED' : 'STOCK CONSUMED',
          `${stockModalType === 'ADD' ? 'Added' : 'Consumed'} ${val} ${selectedItem.unit} of ${selectedItem.name}`,
          stockModalType === 'ADD' ? 'add_box' : 'remove_circle',
          stockModalType === 'ADD' ? 'green' : 'blue'
        );
      }
      setStockModalType(null);
      setStockAmount('10');
      setStockReason('');
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to update stock in database', 'error', 'amber');
    } finally {
      setIsSubmittingStock(false);
    }
  };

  const handleQuickConsume500LFuel = async () => {
    try {
      const updatedFuel = await dataCtx.consumeFuel(500);
      if (!updatedFuel) return;
      const stock = updatedFuel.available;
      const burn = updatedFuel.burnRate || 1;
      const daysRem = Math.floor(stock / burn);
      onToast(
        'OFFLINE FUEL CONSUMED',
        `500L consumed. Stock: ${stock} L. Days remaining: ~${daysRem} days. ${dataCtx.isOnline && !dataCtx.isSimulatedOffline ? 'Synced to cloud.' : 'Saved to IndexedDB (Queued offline)'}`,
        'local_gas_station',
        stock <= updatedFuel.minBuffer ? 'amber' : 'green'
      );
    } catch (err: any) {
      onToast('ERROR', err?.message || 'Failed to consume fuel', 'error', 'amber');
    }
  };

  const totalItemsCount = items.length;
  const criticalItemsCount = items.filter((i) => i.status === 'CRITICAL').length;
  const lowItemsCount = items.filter((i) => i.status === 'LOW').length;
  const fuelCount = items.filter((i) => i.category === 'Energy').length;
  const medCount = items.filter((i) => i.category === 'Medical').length;
  const rationCount = items.filter((i) => i.category === 'Provision').length;

  const filteredItems = items.filter((item) => {
    let matchesFilter = true;
    if (filter === 'critical') matchesFilter = item.status === 'CRITICAL';
    if (filter === 'low') matchesFilter = item.status === 'LOW' || item.status === 'CRITICAL';
    if (filter === 'fuel') matchesFilter = item.category === 'Energy';
    if (filter === 'medical') matchesFilter = item.category === 'Medical';
    if (filter === 'rations') matchesFilter = item.category === 'Provision';

    const skuOrId = item.sku || item.id;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skuOrId.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col w-full space-y-4 pb-8">
      {/* Header & Controls */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <PolarLogo size="xs" />
          <span className="font-mono text-[10px] sm:text-xs text-neutral-900 dark:text-[#a4c9ff] uppercase tracking-widest font-bold">
            Consumables & Station Inventory • NCPOR
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
          <span className="text-[10px] sm:text-xs font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase">
            DECK-05
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
              Inventory Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-[#c1c6d3]">
              Burn-rate telemetry, run-out projections, and autonomous resupply triggers
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleQuickConsume500LFuel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-headline font-bold shadow-md transition-all active:scale-95 border border-amber-500 cursor-pointer"
              title="Consume 500L Polar Diesel offline test"
            >
              <span className="material-symbols-outlined text-[16px]">local_gas_station</span>
              <span>Test: Consume 500L Fuel</span>
            </button>
            <button
              onClick={onOpenResupplyModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white text-xs font-headline font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
              <span>Create Resupply Request</span>
            </button>
            <button
              onClick={() =>
                onToast('MONTE CARLO SIMULATION', 'Simulated 10,000 katabatic blizzard runs. Confidence: 94.2%', 'science', 'blue')
              }
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-300 dark:border-[#253648] text-xs font-headline font-bold text-neutral-900 dark:text-[#d2e4fc] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">model_training</span>
              <span>Run Burn Simulation</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0a1d2e] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3]">
            Total Inventory SKUs
          </span>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc]">
              {totalItemsCount}
            </span>
            <span className="text-[10px] font-bold text-neutral-500 dark:text-[#c1c6d3] uppercase">
              SKUS
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] truncate font-mono">
            Synchronized with Firestore
          </span>
        </div>

        <div className="bg-white dark:bg-[#0a1d2e] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3]">
            Low Stock SKUs
          </span>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-amber-600">
              {lowItemsCount}
            </span>
            <span className="text-[10px] font-bold text-amber-600 uppercase">BUFFER LOW</span>
          </div>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 truncate font-mono">
            Approaching safety buffer
          </span>
        </div>

        <div className="bg-white dark:bg-[#0a1d2e] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3]">
              Critical Alert
            </span>
            {criticalItemsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            )}
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-red-600">
              {String(criticalItemsCount).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-bold text-red-600 uppercase">URGENT</span>
          </div>
          <span className="text-[11px] text-red-600 truncate font-mono">
            {criticalItemsCount > 0 ? 'Depletion risk within threshold' : 'All stocks above safety limit'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#0a1d2e] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3]">
            Energy & Fuel SKUs
          </span>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc]">
              {fuelCount}
            </span>
            <span className="text-[10px] font-bold text-neutral-500 dark:text-[#c1c6d3] uppercase">
              ENERGY
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] truncate font-mono">
            Monitored fuel reserves
          </span>
        </div>
      </div>

      {/* Interactive Predictive Consumables Forecast Chart */}
      <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl border border-neutral-200 dark:border-[#253648] p-4 sm:p-5 flex flex-col gap-3.5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600 text-[20px]">trending_down</span>
              <h3 className="font-headline text-base font-black text-neutral-900 dark:text-[#d2e4fc]">
                Predictive Consumables Forecast
              </h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-[#c1c6d3]">
              AI Bayesian regression model based on current katabatic -30°C temperature anomaly
            </p>
          </div>

          {/* Time Horizon Pills */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#0f2132] p-1 rounded-lg border border-neutral-200 dark:border-[#253648]">
            {(['7D', '14D', '30D', '60D'] as const).map((hz) => (
              <button
                key={hz}
                onClick={() => setTimeHorizon(hz)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors ${
                  timeHorizon === hz
                    ? 'bg-black text-white dark:bg-[#0b5ea8]'
                    : 'text-neutral-600 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white'
                }`}
              >
                {hz}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Forecast Chart Visualization */}
        <div className="relative w-full h-56 bg-neutral-50 dark:bg-[#071A2B] rounded-xl border border-neutral-200 dark:border-[#253648] p-3 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>500 UNITS (MAX)</span>
            <span className="text-red-600 dark:text-red-400 font-bold">
              -- SAFETY BUFFER: 250 UNITS
            </span>
          </div>

          {/* SVG Curves */}
          <svg className="w-full h-36" viewBox="0 0 500 140" fill="none">
            {/* Safety Buffer Horizontal Line */}
            <line
              x1="0"
              y1="75"
              x2="500"
              y2="75"
              stroke="#dc2626"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />

            {/* Historical Stock Line (Left to Day 0) */}
            <path
              d="M 10 30 Q 80 35 150 48"
              stroke="#1e293b"
              strokeWidth="2.5"
              className="dark:stroke-neutral-300"
            />

            {/* Gradient Area Below Projection */}
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 150 48 L 260 75 L 340 105 L 480 135 L 480 140 L 150 140 Z"
              fill="url(#forecastGrad)"
            />

            {/* Projected Stock Line (Trending down past safety threshold) */}
            <path
              d="M 150 48 Q 240 70 340 105 T 480 135"
              stroke="#dc2626"
              strokeWidth="3"
              strokeDasharray="5 3"
            />

            {/* Day 10 Run-out Breach Marker */}
            <circle cx="340" cy="105" r="5" fill="#dc2626" className="animate-ping" />
            <circle cx="340" cy="105" r="4" fill="#dc2626" />
          </svg>

          {/* Day 10 Callout Marker Badge */}
          <div className="absolute top-[52%] left-[62%] -translate-x-1/2 bg-red-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold shadow-lg flex items-center gap-1 z-20">
            <span className="material-symbols-outlined text-[13px]">warning</span>
            <span>DAY 10: RUN-OUT BREACH</span>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 dark:text-[#c1c6d3] pt-1 border-t border-neutral-200 dark:border-[#253648]">
            <span>TODAY (DAY 0)</span>
            <span>DAY 5</span>
            <span className="text-red-600 dark:text-red-400 font-bold">DAY 10 (CRITICAL)</span>
            <span>DAY 14</span>
          </div>
        </div>

        {/* Katabatic Storm Surge Alert */}
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900/60 p-3 rounded-xl flex items-start gap-2.5">
          <span className="material-symbols-outlined text-red-600 text-[20px] shrink-0">
            crisis_alert
          </span>
          <div className="flex-1 text-xs">
            <span className="font-headline font-bold text-red-800 dark:text-red-300">
              Katabatic Storm Surge Warning: Consumption Spike
            </span>
            <p className="text-neutral-700 dark:text-[#c1c6d3] mt-0.5">
              Polar Diesel burn rate has spiked <strong className="text-red-600">+18%</strong> due to
              continuous station heating demands at -31°C. Medical bay antibiotics running out in 10
              days.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="flex flex-col gap-2.5 bg-neutral-100 dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648]">
        <div className="relative flex items-center w-full">
          <span className="material-symbols-outlined absolute left-3 text-neutral-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Consumable Item, SKU or Station Hub..."
            className="w-full bg-white dark:bg-[#0f2132] text-neutral-900 dark:text-[#d2e4fc] text-xs pl-9 pr-14 py-2 rounded-lg border border-neutral-200 dark:border-[#253648] outline-none focus:border-black dark:focus:border-[#a4c9ff] transition-colors"
          />
          <span className="absolute right-2 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-[#071A2B] text-[9px] font-mono text-neutral-500 dark:text-[#c1c6d3]">
            ⌘K
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'all', label: 'All', count: totalItemsCount },
            { id: 'critical', label: 'Critical Alert', count: criticalItemsCount, isCrit: true },
            { id: 'low', label: 'Low Stock', count: lowItemsCount },
            { id: 'fuel', label: 'Fuel', count: fuelCount },
            { id: 'medical', label: 'Medical', count: medCount },
            { id: 'rations', label: 'Rations', count: rationCount },
          ].map((pill) => {
            const isActive = filter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setFilter(pill.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-label font-bold shrink-0 flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? pill.isCrit
                      ? 'bg-red-600 text-white'
                      : 'bg-black text-white dark:bg-[#0b5ea8]'
                    : pill.isCrit
                    ? 'bg-white dark:bg-[#0f2132] text-red-600 border border-red-300 dark:border-red-900/60'
                    : 'bg-white dark:bg-[#0f2132] text-neutral-600 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white border border-neutral-200 dark:border-[#253648]'
                }`}
              >
                <span>{pill.label}</span>
                <span className="opacity-80 text-[10px] font-mono">({pill.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded Active Dossier Drawer for Selected Item */}
      {selectedItem && (
        <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl border-2 border-neutral-300 dark:border-[#253648] shadow-xl p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <span className="material-symbols-outlined text-[24px]">
                  {selectedItem.category === 'Energy'
                    ? 'local_gas_station'
                    : selectedItem.category === 'Medical'
                    ? 'medical_services'
                    : selectedItem.category === 'Provision'
                    ? 'restaurant'
                    : 'inventory_2'}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-neutral-500 dark:text-[#c1c6d3]">
                    {selectedItem.sku || selectedItem.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider ${
                      selectedItem.status === 'CRITICAL'
                        ? 'bg-red-600 text-white'
                        : selectedItem.status === 'LOW'
                        ? 'bg-amber-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {selectedItem.status}
                  </span>
                </div>
                <h3 className="font-headline text-base sm:text-lg font-black text-neutral-900 dark:text-[#d2e4fc] truncate">
                  {selectedItem.name}
                </h3>
                <span className="text-xs text-neutral-500 dark:text-[#c1c6d3]">
                  Location: {selectedItem.location} • Category: {selectedItem.category}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[9px] font-mono text-neutral-400 uppercase">Days Remaining</span>
              <p
                className={`font-telemetry-num text-2xl sm:text-3xl font-black ${
                  selectedItem.daysRemaining <= 10 ? 'text-red-600' : 'text-neutral-900 dark:text-[#d2e4fc]'
                }`}
              >
                {selectedItem.daysRemaining}d
              </p>
              <span
                className={`text-[10px] font-bold font-mono ${
                  selectedItem.daysRemaining <= 10 ? 'text-red-600' : 'text-neutral-500'
                }`}
              >
                {selectedItem.daysRemaining <= 10 ? 'BUFFER CRITICAL' : 'BUFFER NOMINAL'}
              </span>
            </div>
          </div>

          {/* Key Stock Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-neutral-100/70 dark:bg-[#0f2132] p-2.5 rounded-lg border border-neutral-200 dark:border-[#253648]">
              <span className="text-[9px] font-mono text-neutral-400 uppercase block">
                Current Stock
              </span>
              <span className="font-mono font-bold text-neutral-900 dark:text-[#d2e4fc] text-sm">
                {(selectedItem.currentStock ?? selectedItem.available).toLocaleString()} {selectedItem.unit}
              </span>
            </div>
            <div className="bg-neutral-100/70 dark:bg-[#0f2132] p-2.5 rounded-lg border border-neutral-200 dark:border-[#253648]">
              <span className="text-[9px] font-mono text-neutral-400 uppercase block">
                Daily Burn Rate
              </span>
              <span className="font-mono font-bold text-neutral-900 dark:text-[#d2e4fc] text-sm">
                {selectedItem.burnRate} {selectedItem.unit}/day
              </span>
            </div>
            <div className="bg-neutral-100/70 dark:bg-[#0f2132] p-2.5 rounded-lg border border-neutral-200 dark:border-[#253648]">
              <span className="text-[9px] font-mono text-neutral-400 uppercase block">
                Minimum Threshold
              </span>
              <span className="font-mono font-bold text-neutral-900 dark:text-[#d2e4fc] text-sm">
                {(selectedItem.minimumThreshold ?? selectedItem.minBuffer ?? selectedItem.threshold ?? 50).toLocaleString()} {selectedItem.unit}
              </span>
            </div>
            <div className="bg-neutral-100/70 dark:bg-[#0f2132] p-2.5 rounded-lg border border-neutral-200 dark:border-[#253648]">
              <span className="text-[9px] font-mono text-neutral-400 uppercase block">
                Storage Status
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                MONITORED DEPOT
              </span>
            </div>
          </div>

          {/* Interactive Stock Controls */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <button
              onClick={() => {
                setStockModalType('ADD');
                setStockAmount('50');
                setStockReason('Resupply shipment intake');
              }}
              className="flex-1 min-w-[120px] bg-emerald-600 hover:bg-emerald-700 text-white font-headline text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Add Stock</span>
            </button>
            <button
              onClick={() => {
                setStockModalType('CONSUME');
                setStockAmount('10');
                setStockReason('Station daily consumption');
              }}
              className="flex-1 min-w-[120px] bg-amber-600 hover:bg-amber-700 text-white font-headline text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">remove_circle</span>
              <span>Consume Stock</span>
            </button>
            <button
              onClick={() => {
                setStockModalType('THRESHOLD');
                setStockAmount(
                  String(selectedItem.minimumThreshold ?? selectedItem.minBuffer ?? selectedItem.threshold ?? 50)
                );
                setStockReason('');
              }}
              className="flex-1 min-w-[140px] bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-300 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc] font-headline text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>Set Threshold</span>
            </button>
          </div>

          {/* Consumption History Log */}
          <div className="mt-2 pt-3 border-t border-neutral-200 dark:border-[#253648]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-headline font-bold text-neutral-900 dark:text-[#d2e4fc] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-neutral-500">history</span>
                Consumption & Restock History
              </span>
              <span className="text-[10px] font-mono text-neutral-500 dark:text-[#c1c6d3]">
                {selectedItem.consumptionHistory?.length || 0} Recorded Transactions
              </span>
            </div>

            {selectedItem.consumptionHistory && selectedItem.consumptionHistory.length > 0 ? (
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                {selectedItem.consumptionHistory.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-[#0f2132] border border-neutral-200 dark:border-[#253648]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          log.type === 'ADD'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                        }`}
                      >
                        {log.type === 'ADD' ? `+${log.amount}` : `-${log.amount}`} {selectedItem.unit}
                      </span>
                      <span className="text-neutral-700 dark:text-[#d2e4fc] text-[11px]">
                        {log.reason || 'Operational adjustment'}
                      </span>
                    </div>
                    <div className="text-right text-[10px] text-neutral-400">
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="mx-1">•</span>
                      <span className="text-neutral-600 dark:text-[#c1c6d3]">Bal: {log.remaining}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 italic py-1">
                No recent stock transactions recorded in Firestore. Click 'Add Stock' or 'Consume Stock' above to record real changes.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Monitored Consumables List */}
      <div className="flex flex-col gap-2.5 pt-2">
        <div className="flex items-center justify-between">
          <span className="font-headline text-sm sm:text-base font-bold text-neutral-900 dark:text-[#d2e4fc]">
            Monitored Consumables ({filteredItems.length})
          </span>
          <span className="text-[10px] font-mono font-bold text-neutral-500 dark:text-[#c1c6d3] uppercase">
            Click to view burn analytics
          </span>
        </div>

        {filteredItems.map((item) => {
          const itemSku = item.sku || item.id;
          const stock = item.currentStock ?? item.available;

          return (
            <div
              key={itemSku}
              onClick={() => setSelectedItemId(item.id || item.sku || '')}
              className="p-4 rounded-xl border bg-white hover:bg-neutral-50 dark:bg-[#0a1d2e] dark:hover:bg-[#0f2132] border-neutral-200 dark:border-[#253648] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-[#0f2132] border border-neutral-200 dark:border-[#253648] flex items-center justify-center text-neutral-800 dark:text-[#a4c9ff] shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    {item.category === 'Energy'
                      ? 'local_gas_station'
                      : item.category === 'Medical'
                      ? 'medical_services'
                      : item.category === 'Provision'
                      ? 'restaurant'
                      : 'settings'}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-neutral-900 dark:text-[#d2e4fc]">
                      {itemSku}
                    </span>
                    <span
                      className={`px-2 py-0.2 rounded-full font-mono text-[9px] font-bold uppercase ${
                        item.status === 'CRITICAL'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'
                          : item.status === 'LOW'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <h4 className="font-headline text-xs sm:text-sm font-bold text-neutral-900 dark:text-[#d2e4fc] truncate">
                    {item.name}
                  </h4>
                  <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3]">
                    Location: {item.location} • Burn: {item.burnRate} {item.unit}/day
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-5 text-xs font-mono shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-[#253648]">
                <div className="text-left sm:text-right">
                  <span className="text-[9px] text-neutral-400 block uppercase">Available</span>
                  <span className="font-bold text-neutral-900 dark:text-[#d2e4fc]">
                    {stock.toLocaleString()} {item.unit}
                  </span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[9px] text-neutral-400 block uppercase">Time to Zero</span>
                  <span
                    className={`font-bold ${
                      item.daysRemaining <= 10
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-neutral-800 dark:text-[#d2e4fc]'
                    }`}
                  >
                    {item.daysRemaining} days
                  </span>
                </div>
                <span className="material-symbols-outlined text-neutral-400 text-[18px]">
                  chevron_right
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stock Transaction & Threshold Modal */}
      {stockModalType && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#0a1d2e] border border-neutral-300 dark:border-[#253648] rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-[#253648]">
              <div className="flex items-center gap-2">
                <span
                  className={`material-symbols-outlined text-[22px] ${
                    stockModalType === 'ADD'
                      ? 'text-emerald-600'
                      : stockModalType === 'CONSUME'
                      ? 'text-amber-600'
                      : 'text-blue-600'
                  }`}
                >
                  {stockModalType === 'ADD'
                    ? 'add_circle'
                    : stockModalType === 'CONSUME'
                    ? 'remove_circle'
                    : 'tune'}
                </span>
                <h3 className="font-headline font-bold text-base text-neutral-900 dark:text-[#d2e4fc]">
                  {stockModalType === 'ADD'
                    ? 'Add Stock Intake'
                    : stockModalType === 'CONSUME'
                    ? 'Consume Stock'
                    : 'Update Minimum Safety Threshold'}
                </h3>
              </div>
              <button
                onClick={() => setStockModalType(null)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="text-xs text-neutral-600 dark:text-[#c1c6d3]">
              Item: <span className="font-bold text-neutral-900 dark:text-white">{selectedItem.name}</span> ({selectedItem.sku || selectedItem.id})
              <br />
              Current On Hand: <span className="font-mono font-bold">{(selectedItem.currentStock ?? selectedItem.available).toLocaleString()} {selectedItem.unit}</span>
            </div>

            <form onSubmit={handleStockSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                  {stockModalType === 'THRESHOLD' ? 'Minimum Safety Threshold' : 'Quantity'}{' '}
                  ({selectedItem.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={stockAmount}
                  onChange={(e) => setStockAmount(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-sm font-mono text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              {stockModalType !== 'THRESHOLD' && (
                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-700 dark:text-[#c1c6d3] mb-1">
                    Operational Reason / Log Memo
                  </label>
                  <input
                    type="text"
                    value={stockReason}
                    onChange={(e) => setStockReason(e.target.value)}
                    placeholder={
                      stockModalType === 'ADD'
                        ? 'e.g. Inward air shipment from vessel'
                        : 'e.g. Science lab expedition consumption'
                    }
                    className="w-full bg-neutral-50 dark:bg-[#0f2132] border border-neutral-300 dark:border-[#253648] rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStockModalType(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-headline font-bold text-neutral-600 dark:text-[#c1c6d3] hover:bg-neutral-100 dark:hover:bg-[#0f2132]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStock}
                  className={`px-4 py-2 rounded-xl text-xs font-headline font-bold text-white shadow-sm flex items-center gap-1.5 transition-all ${
                    stockModalType === 'ADD'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : stockModalType === 'CONSUME'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSubmittingStock ? (
                    <span>Syncing Firestore...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>
                        {stockModalType === 'ADD'
                          ? 'Confirm Stock Intake'
                          : stockModalType === 'CONSUME'
                          ? 'Confirm Consumption'
                          : 'Save Threshold'}
                      </span>
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
