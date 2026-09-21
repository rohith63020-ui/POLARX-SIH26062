/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StationKey } from '../types';

interface ReportsViewProps {
  currentStation?: StationKey;
  onToast: (title: string, body: string, icon?: string, color?: 'green' | 'amber' | 'blue') => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentStation = 'bharati',
  onToast,
}) => {
  const [reportType, setReportType] = useState<'all' | 'sitrep' | 'cargo' | 'fuel' | 'research'>('all');

  const reports = [
    {
      id: 'REP-2026-089',
      type: 'sitrep',
      title: 'Daily Continental Situation Report (SITREP-089)',
      station: 'Bharati Station',
      date: '2026-09-13',
      author: 'Rohith Sai (Logistics Manager)',
      summary: 'Sea-ice fast ice stability confirmed at 2.1m. PistenBully convoys operational with 0 incidents.',
      status: 'VERIFIED',
      classification: 'OFFICIAL',
    },
    {
      id: 'REP-2026-088',
      type: 'cargo',
      title: 'Heavy Asset & Generator Resupply Audit',
      station: 'Bharati Station',
      date: '2026-09-12',
      author: 'Rohith Sai (Logistics Manager)',
      summary: 'Turbine Turbine Gen-Set #03 reached 100% operational test bench load. 40,000L Arctic Diesel transferred.',
      status: 'VERIFIED',
      classification: 'OFFICIAL',
    },
    {
      id: 'REP-2026-087',
      type: 'fuel',
      title: 'Maitri Fuel Depletion & Buffer Burn Rate Audit',
      station: 'Maitri Station',
      date: '2026-09-11',
      author: 'Maj. Arjun Rathore (Expedition Officer)',
      summary: 'Schirmacher Oasis secondary tanks holding 142 days of winter reserve at current thermal output.',
      status: 'SUBMITTED',
      classification: 'RESTRICTED',
    },
    {
      id: 'REP-2026-086',
      type: 'research',
      title: 'Paleoclimate Ice Core Volatile Chemistry Analysis',
      station: 'Himadri Arctic Station',
      date: '2026-09-10',
      author: 'Dr. Maya Sen (Lead Researcher)',
      summary: 'Kongsvegen Glacier Core Sample #81 indicates 420ppm CO2 spike in historical layer B. Telemetry model converged.',
      status: 'PUBLISHED',
      classification: 'SCIENCE UNRESTRICTED',
    },
  ];

  const filteredReports = reports.filter((r) => reportType === 'all' || r.type === reportType);

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Top Controls */}
      <div className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-[#0a1d2e] rounded-2xl border border-neutral-200 dark:border-[#253648] shadow-sm flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-[#a4c9ff]">
              description
            </span>
            <h1 className="font-headline text-xl font-bold text-neutral-900 dark:text-[#d2e4fc]">
              Mission Reports & Expedition SITREPs
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 dark:bg-[#0f2132] text-neutral-700 dark:text-[#c1c6d3] border border-neutral-300 dark:border-[#253648]">
              {filteredReports.length} Documented Audits
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-[#c1c6d3] mt-0.5">
            Formal NCPOR mission documentation, resupply audits, and peer-reviewed ice research dossiers.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#0f2132] p-1 rounded-xl border border-neutral-200 dark:border-[#253648]">
            {(['all', 'sitrep', 'cargo', 'fuel', 'research'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setReportType(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                  reportType === t
                    ? 'bg-neutral-900 text-white dark:bg-[#0b5ea8]'
                    : 'text-neutral-600 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() =>
              onToast(
                'REPORT EXPORTED',
                'Synthesized SITREP & Cargo PDF package generated with SHA-256 seal.',
                'download',
                'green'
              )
            }
            className="px-3 py-1.5 bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white rounded-xl text-xs font-headline font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>Export Dossier (PDF/CSV)</span>
          </button>
        </div>
      </div>

      {/* Reports Listing */}
      <div className="flex flex-col gap-3">
        {filteredReports.map((item) => (
          <div
            key={item.id}
            className="p-4 bg-white dark:bg-[#0a1d2e] rounded-xl border border-neutral-200 dark:border-[#253648] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-neutral-400 dark:hover:border-[#a4c9ff]/60 transition-all"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-[#0f2132] border border-neutral-200 dark:border-[#253648] flex items-center justify-center shrink-0 text-blue-600 dark:text-[#a4c9ff]">
                <span className="material-symbols-outlined text-[20px]">
                  {item.type === 'cargo'
                    ? 'inventory'
                    : item.type === 'fuel'
                    ? 'local_gas_station'
                    : item.type === 'research'
                    ? 'biotech'
                    : 'assignment'}
                </span>
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-headline font-bold text-sm text-neutral-900 dark:text-[#d2e4fc]">
                    {item.title}
                  </span>
                  <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-bold bg-neutral-100 dark:bg-[#0f2132] text-neutral-700 dark:text-[#c1c6d3] border border-neutral-300 dark:border-[#253648]">
                    {item.id}
                  </span>
                  <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-[#c1c6d3] mt-1">
                  {item.summary}
                </p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-500 dark:text-[#8b919c] mt-1.5 flex-wrap">
                  <span>Author: {item.author}</span>
                  <span>•</span>
                  <span>Station: {item.station}</span>
                  <span>•</span>
                  <span>Date: {item.date}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-[#1a2b3d]">
              <button
                onClick={() =>
                  onToast(
                    'REPORT OPENED',
                    `Rendering authenticated view of ${item.id}`,
                    'visibility',
                    'blue'
                  )
                }
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] text-neutral-800 dark:text-[#d2e4fc] rounded-lg text-xs font-bold border border-neutral-300 dark:border-[#253648] flex items-center gap-1 transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">visibility</span>
                <span>View Full Sitrep</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
