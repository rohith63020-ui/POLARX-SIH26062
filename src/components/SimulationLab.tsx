/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { OfflineMapCache } from './OfflineMapCache';

interface SimulationLabProps {
  onTriggerScenario: (scenario: string) => void;
  onToast: (title: string, body: string, icon?: string, color?: 'green' | 'amber' | 'blue') => void;
  kidMode?: boolean;
}

export const SimulationLab: React.FC<SimulationLabProps> = ({
  onTriggerScenario,
  onToast,
  kidMode = true,
}) => {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'map_cache'>('scenarios');
  const [temperature, setTemperature] = useState(-31);
  const [windSpeed, setWindSpeed] = useState(42);
  const [latency, setLatency] = useState(140);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    '[INIT] Telemetry simulation daemon booted on port 3000',
    '[ARGO] Argos-4 satellite constellation pass completed: 18 nodes synced',
    '[NCPOR] Central relay handshake verified: 0 packet loss',
    '[MAP_VAULT] Offline Sector Cache validated: 4 sectors ready in local storage',
    '[STATION] Bharati Base micro-grid running on Gen-Set POLAR-AX-1042',
    '[WEATHER] Katabatic gale warning active: 42 kt gusts SE',
  ]);

  const addLog = (msg: string) => {
    const time = new Date().toISOString().substring(11, 19);
    setConsoleLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 15)]);
  };

  const runScenario = (type: string, name: string) => {
    onTriggerScenario(type);
    addLog(`TRIGGERED SCENARIO: ${name}`);
    onToast('SCENARIO ACTIVE', `Running simulation for ${name}`, 'science', 'amber');

    if (type === 'blizzard') {
      setTemperature(-48);
      setWindSpeed(68);
      addLog('WEATHER SENSORS: Extreme blizzard threshold breached (-48°C, 68kt)');
    } else if (type === 'comms_loss') {
      setLatency(4500);
      addLog('COMMS RELAY: Inmarsat-C carrier dropped. Local offline map cache engaged.');
      addLog('OFFLINE MAP VAULT: Switched to locally cached sector tiles for uninterrupted GPS.');
    } else if (type === 'generator_drift') {
      addLog('SENSOR CLUSTER: Crankshaft vibration 142 Hz. Overheating alert in Sector 4.');
    } else if (type === 'rescue') {
      addLog('SAR DISPATCH: Snowcat SAR-01 out of hangar. 406 MHz signal locked.');
    }
  };

  const handleReset = () => {
    setTemperature(-31);
    setWindSpeed(42);
    setLatency(140);
    addLog('SYSTEM RESET: All operational parameters restored to nominal baseline.');
    onToast('SYSTEMS NOMINAL', 'Polar simulation parameters normalized.', 'restart_alt', 'green');
  };

  return (
    <div className="flex flex-col w-full space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-black dark:bg-[#071A2B] border border-neutral-700 flex items-center justify-center p-0.5">
            <span className="material-symbols-outlined text-white text-[14px]">science</span>
          </div>
          <span className="font-mono text-[10px] sm:text-xs text-neutral-900 dark:text-[#a4c9ff] uppercase tracking-widest font-bold">
            Evaluator Simulation Lab • SIH26062
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
          <span className="text-[10px] sm:text-xs font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase">
            SANDBOX DECK-07
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-headline text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc] tracking-tight">
              {kidMode ? 'Polar Science Sandbox & Maps 🧪' : 'Polar Simulation Sandbox & Cache'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-[#c1c6d3]">
              {kidMode
                ? 'Test extreme weather storms and download offline snow maps for your mobile device!'
                : 'Interactive testbed for evaluators to simulate polar conditions and manage offline sector map caches'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-300 dark:border-[#253648] text-xs font-headline font-bold text-neutral-900 dark:text-[#d2e4fc] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Reset to Nominal</span>
            </button>
          </div>
        </div>

        {/* Sub-view Navigation Switcher */}
        <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-[#253648] pt-2 pb-1">
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`px-3.5 py-2 rounded-xl text-xs font-headline font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'scenarios'
                ? 'bg-black text-white dark:bg-[#0b5ea8] shadow-sm'
                : 'bg-neutral-100 dark:bg-[#0f2132] text-neutral-600 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white border border-neutral-200 dark:border-[#253648]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">science</span>
            <span>Telemetry & Scenarios</span>
          </button>

          <button
            onClick={() => setActiveTab('map_cache')}
            className={`px-3.5 py-2 rounded-xl text-xs font-headline font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'map_cache'
                ? 'bg-black text-white dark:bg-[#0b5ea8] shadow-sm'
                : 'bg-neutral-100 dark:bg-[#0f2132] text-neutral-600 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white border border-neutral-200 dark:border-[#253648]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">download_for_offline</span>
            <span>Offline Map Cache</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9.5px] font-mono font-bold">
              VAULT
            </span>
          </button>
        </div>
      </div>

      {/* Render Sub-View: Offline Map Cache */}
      {activeTab === 'map_cache' ? (
        <OfflineMapCache currentStation="bharati" kidMode={kidMode} onToast={onToast} />
      ) : (
        <>
          {/* Quick Notice pointing to Offline Map Cache */}
          <div className="bg-neutral-50 dark:bg-[#071A2B] border border-neutral-200 dark:border-[#253648] p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[20px] text-neutral-800 dark:text-[#a4c9ff] shrink-0">
                satellite_alt
              </span>
              <span className="text-neutral-700 dark:text-[#c1c6d3] truncate">
                Prepare for satellite link loss by pre-downloading high-res polar sector packages to browser storage.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('map_cache')}
              className="shrink-0 px-3 py-1 rounded-lg bg-black dark:bg-[#0b5ea8] text-white font-headline font-bold text-[11px] hover:opacity-90 flex items-center gap-1"
            >
              <span>Manage Map Cache</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

          {/* Pre-configured Scenarios Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          onClick={() => runScenario('blizzard', 'Katabatic Blizzard Storm')}
          className="bg-white dark:bg-[#0a1d2e] p-4 rounded-xl border border-neutral-200 dark:border-[#253648] hover:border-black dark:hover:border-[#a4c9ff] transition-all cursor-pointer shadow-sm flex flex-col justify-between gap-3"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-blue-500 text-[24px]">ac_unit</span>
              <span className="text-[9px] font-mono font-bold uppercase bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 px-2 py-0.5 rounded">
                WEATHER
              </span>
            </div>
            <h3 className="font-headline text-sm font-bold text-neutral-900 dark:text-[#d2e4fc] mt-2">
              Katabatic Storm Spike
            </h3>
            <p className="text-xs text-neutral-500 dark:text-[#c1c6d3] mt-1">
              Drop temp to -48°C and spike winds to 68 kt. Surges fuel burn by 25%.
            </p>
          </div>
          <button className="w-full py-1.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] text-xs font-headline font-bold text-neutral-900 dark:text-[#d2e4fc]">
            Trigger Storm
          </button>
        </div>

        <div
          onClick={() => runScenario('rescue', 'Sector 7 Crevasse Rescue')}
          className="bg-white dark:bg-[#0a1d2e] p-4 rounded-xl border border-neutral-200 dark:border-[#253648] hover:border-red-600 dark:hover:border-red-500 transition-all cursor-pointer shadow-sm flex flex-col justify-between gap-3"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-red-600 text-[24px]">crisis_alert</span>
              <span className="text-[9px] font-mono font-bold uppercase bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 px-2 py-0.5 rounded">
                SAR DEFCON-1
              </span>
            </div>
            <h3 className="font-headline text-sm font-bold text-neutral-900 dark:text-[#d2e4fc] mt-2">
              Crevasse Trap Event
            </h3>
            <p className="text-xs text-neutral-500 dark:text-[#c1c6d3] mt-1">
              Triggers Snowcat-04 crevasse trap and dispatches heavy winch response.
            </p>
          </div>
          <button className="w-full py-1.5 rounded-lg bg-red-600 text-white text-xs font-headline font-bold">
            Trigger Mayday
          </button>
        </div>

        <div
          onClick={() => runScenario('comms_loss', 'Satellite Comms Blackout')}
          className="bg-white dark:bg-[#0a1d2e] p-4 rounded-xl border border-neutral-200 dark:border-[#253648] hover:border-amber-500 transition-all cursor-pointer shadow-sm flex flex-col justify-between gap-3"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-amber-600 text-[24px]">
                portable_wifi_off
              </span>
              <span className="text-[9px] font-mono font-bold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded">
                OFFLINE FAILOVER
              </span>
            </div>
            <h3 className="font-headline text-sm font-bold text-neutral-900 dark:text-[#d2e4fc] mt-2">
              Sat-Link Blackout
            </h3>
            <p className="text-xs text-neutral-500 dark:text-[#c1c6d3] mt-1">
              Simulates solar flare disruption, forcing app to full local-first offline queue.
            </p>
          </div>
          <button className="w-full py-1.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] text-xs font-headline font-bold text-neutral-900 dark:text-[#d2e4fc]">
            Drop Link
          </button>
        </div>

        <div
          onClick={() => runScenario('generator_drift', 'Generator Anomaly')}
          className="bg-white dark:bg-[#0a1d2e] p-4 rounded-xl border border-neutral-200 dark:border-[#253648] hover:border-black dark:hover:border-[#a4c9ff] transition-all cursor-pointer shadow-sm flex flex-col justify-between gap-3"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-purple-600 text-[24px]">
                precision_manufacturing
              </span>
              <span className="text-[9px] font-mono font-bold uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-400 px-2 py-0.5 rounded">
                AI TELEMETRY
              </span>
            </div>
            <h3 className="font-headline text-sm font-bold text-neutral-900 dark:text-[#d2e4fc] mt-2">
              Generator Drift
            </h3>
            <p className="text-xs text-neutral-500 dark:text-[#c1c6d3] mt-1">
              Simulates 142 Hz vibration spike on Gen-Set POLAR-AX-1042.
            </p>
          </div>
          <button className="w-full py-1.5 rounded-lg bg-neutral-100 dark:bg-[#0f2132] text-xs font-headline font-bold text-neutral-900 dark:text-[#d2e4fc]">
            Inject Anomaly
          </button>
        </div>
      </div>

      {/* Manual Sliders */}
      <div className="bg-white dark:bg-[#0a1d2e] p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-[#253648] space-y-4 shadow-sm">
        <span className="font-headline text-sm font-bold text-neutral-900 dark:text-[#d2e4fc] block">
          Manual Environmental Telemetry Controls
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-neutral-500 dark:text-[#c1c6d3]">SURFACE TEMP</span>
              <span className="font-bold text-neutral-900 dark:text-[#d2e4fc]">
                {temperature}°C
              </span>
            </div>
            <input
              type="range"
              min="-60"
              max="-10"
              value={temperature}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTemperature(val);
                addLog(`TELEMETRY: Station temperature set to ${val}°C`);
              }}
              className="w-full accent-black dark:accent-[#a4c9ff]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-neutral-500 dark:text-[#c1c6d3]">WIND VELOCITY</span>
              <span className="font-bold text-neutral-900 dark:text-[#d2e4fc]">
                {windSpeed} kt
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              value={windSpeed}
              onChange={(e) => {
                const val = Number(e.target.value);
                setWindSpeed(val);
                addLog(`TELEMETRY: Katabatic anemometer read set to ${val} kt`);
              }}
              className="w-full accent-black dark:accent-[#a4c9ff]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-neutral-500 dark:text-[#c1c6d3]">SAT LINK LATENCY</span>
              <span className="font-bold text-neutral-900 dark:text-[#d2e4fc]">
                {latency} ms
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="5000"
              step="50"
              value={latency}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLatency(val);
                addLog(`TELEMETRY: Sat-Link ping adjusted to ${val} ms`);
              }}
              className="w-full accent-black dark:accent-[#a4c9ff]"
            />
          </div>
        </div>
      </div>

      {/* Live Telemetry Console Log */}
      <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 flex flex-col gap-2 font-mono text-xs shadow-inner">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-neutral-300 font-bold uppercase tracking-wider text-[11px]">
              Live Telemetry Console Daemon
            </span>
          </div>
          <button
            onClick={() => setConsoleLogs([])}
            className="text-[10px] text-neutral-500 hover:text-neutral-300 uppercase"
          >
            Clear Log
          </button>
        </div>

        <div className="h-44 overflow-y-auto space-y-1 text-[11px] text-emerald-400/90 pr-1">
          {(consoleLogs || []).map((log, i) => (
            <div key={i} className="leading-tight">
              {log}
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  );
};
