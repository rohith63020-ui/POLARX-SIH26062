/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { INITIAL_AI_INSIGHTS } from '../data/initialData';
import { AiInsight, AlertItem, ConsumableItem } from '../types';
import { PolarLogo } from './PolarLogo';
import {
  subscribeAlerts,
  subscribeInventory,
  createResupplyRequest,
  createActivityLog,
} from '../firebase/dbService';

interface AiIntelligenceProps {
  onOpenModal: (title: string, body: React.ReactNode, icon?: string) => void;
  onToast: (title: string, body: string, icon?: string, color?: 'green' | 'amber' | 'blue') => void;
}

export const AiIntelligence: React.FC<AiIntelligenceProps> = ({ onOpenModal, onToast }) => {
  const [filter, setFilter] = useState<'all' | 'consumables' | 'fleet' | 'transit'>('all');
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(
    INITIAL_AI_INSIGHTS[0].id
  );
  const [approvedManifest, setApprovedManifest] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [inventory, setInventory] = useState<ConsumableItem[]>([]);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    const unsubAlerts = subscribeAlerts((data) => {
      if (data && data.length > 0) {
        setAlerts(data);
        setIsLiveConnected(true);
      }
    });

    const unsubInv = subscribeInventory((data) => {
      if (data && data.length > 0) {
        setInventory(data);
        setIsLiveConnected(true);
      }
    });

    return () => {
      unsubAlerts();
      unsubInv();
    };
  }, []);

  const insights = INITIAL_AI_INSIGHTS;

  const filteredInsights = insights.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'consumables') return item.category === 'consumables';
    if (filter === 'fleet') return item.category === 'fleet';
    if (filter === 'transit') return item.category === 'transit';
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedInsightId(expandedInsightId === id ? null : id);
  };

  const handleApproveConsolidation = async () => {
    setApprovedManifest(true);
    const resupplyReq = {
      id: 'RES-8820-' + Date.now(),
      inventoryId: 'POLAR-MED-409',
      expeditionId: 'INPEX-2026',
      orderNumber: '#RES-8820',
      itemName: 'Consolidated Broad-Spec IV Antibiotics & Polar Diesel',
      requestedQty: 120,
      unit: 'lots',
      priority: 'EMERGENCY' as const,
      status: 'APPROVED' as const,
      destination: 'Bharati Medical Bay',
      eta: '4d 12h',
      vesselOrCarrier: 'S.A. Agulhas II',
      notes: 'AI Optimizer merged Orders #FP-2400 & #RES-8820 for Cape Town slot 02.',
    };

    try {
      await createResupplyRequest(resupplyReq);
      await createActivityLog({
        id: 'SIT-AI-' + Date.now(),
        description: 'AI Optimizer approved combined manifest #RES-8820 for Agulhas II slot 02',
        title: 'Manifest Consolidation Approved',
        badge: 'AI OPTIMIZED',
        badgeType: 'ai',
        category: 'LOGISTICS_DIRECTIVE',
        expeditionId: 'INPEX-2026',
      });
    } catch (e) {
      console.warn('AI order approval write:', e);
    }

    onToast(
      'MANIFEST CONSOLIDATED',
      'Orders #FP-2400 and #RES-8820 merged for Agulhas II slot 02 in Firestore',
      'task_alt',
      'green'
    );
  };

  return (
    <div className="flex flex-col w-full space-y-4 pb-8">
      {/* Header & Status Banner */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <PolarLogo size="xs" />
          <span className="font-mono text-[10px] sm:text-xs text-neutral-900 dark:text-[#a4c9ff] uppercase tracking-widest font-bold">
            Argos Telemetry + Gemini Engine • NCPOR
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
          <span className="text-[10px] sm:text-xs font-mono text-neutral-500 dark:text-[#c1c6d3] uppercase">
            DECK-06
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
              AI Logistics & Operational Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-[#c1c6d3]">
              Autonomous consumption modeling, anomaly detection, and route optimization
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#0f2132] border border-neutral-200 dark:border-[#253648] text-neutral-900 dark:text-[#d2e4fc] text-xs font-mono font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>INGESTION: 94.2% HEALTH</span>
            </span>
          </div>
        </div>
      </div>

      {/* Model Overview Metrics (4 Grid Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0a1d2e] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3]">
            Active Models
          </span>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc]">
              04
            </span>
            <span className="text-[10px] font-bold text-neutral-500 dark:text-[#c1c6d3] uppercase">
              NEURAL
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] truncate font-mono">
            Bayesian + LSTM + XGBoost
          </span>
        </div>

        <div className="bg-white dark:bg-[#0a1d2e] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3]">
            Validation Score
          </span>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#a4c9ff]">
              89.4%
            </span>
            <span className="text-[10px] font-bold text-neutral-500 dark:text-[#c1c6d3] uppercase">
              ROC ACC
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] truncate font-mono">
            Validated against 40 seasons
          </span>
        </div>

        <div className="bg-white dark:bg-[#0a1d2e] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3]">
              Active Anomalies
            </span>
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-red-600">
              03
            </span>
            <span className="text-[10px] font-bold text-red-600 uppercase">CRITICAL</span>
          </div>
          <span className="text-[11px] text-red-600 truncate font-mono">Immediate intervention</span>
        </div>

        <div className="bg-white dark:bg-[#0a1d2e] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648] flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3]">
            Synoptic Run
          </span>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-telemetry-num text-2xl sm:text-3xl font-black text-neutral-900 dark:text-[#d2e4fc]">
              02h
            </span>
            <span className="text-[10px] font-bold text-neutral-500 dark:text-[#c1c6d3] uppercase">
              14M
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] truncate font-mono">
            Automated deep inference
          </span>
        </div>
      </div>

      {/* Filter Tabs & Station Imagery */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'all', label: 'All Insights', count: 4 },
            { id: 'consumables', label: 'Consumables & Stock', count: 2 },
            { id: 'fleet', label: 'Fleet Reliability', count: 1 },
            { id: 'transit', label: 'Multimodal Transit', count: 1 },
          ].map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-label font-bold shrink-0 flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? 'bg-black text-white dark:bg-[#0b5ea8] shadow-sm'
                    : 'bg-white dark:bg-[#0f2132] text-neutral-600 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white border border-neutral-200 dark:border-[#253648]'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] font-mono opacity-80">({tab.count})</span>
              </button>
            );
          })}
        </div>

        {/* Station Visual Context Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative h-28 rounded-xl overflow-hidden border border-neutral-200 dark:border-[#253648]">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLusVnniIg6lihHt83LC4rr-S6tNtRqkR4fs8ZLIu26nDnVeGOAvY_d980GZZ-mVZIycpwwyLxhr3LGJ28e0qJN8vS2NCl_a4wsVkDWsBgoejD_-PhMuJRQzGXaVZMKFNNkg2xk4oMYSqB8j9E2xkfNMI6QYC_6jaVwxqJXEqx0TkHqa8WeWVxXg77afuffez9dbf75U0sySn0bZX5QC-cHdu8Irymd9QliMki1enQoKhZBQLgb6pykg"
              alt="Bharati Ground Array"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white">
              <span className="font-headline text-xs font-bold">
                Bharati Ground Sensor Grid
              </span>
              <span className="font-mono text-[9px] bg-black/60 px-1.5 py-0.5 rounded border border-neutral-600">
                SECTOR BH-01
              </span>
            </div>
          </div>

          <div className="relative h-28 rounded-xl overflow-hidden border border-neutral-200 dark:border-[#253648]">
            <img
              src="https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=600&auto=format&fit=crop&q=80"
              alt="S.A. Agulhas II Traverse"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white">
              <span className="font-headline text-xs font-bold">
                S.A. Agulhas II Traverse
              </span>
              <span className="font-mono text-[9px] bg-black/60 px-1.5 py-0.5 rounded border border-neutral-600">
                VESSEL CORRIDOR
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insight Cards */}
      <div className="space-y-3.5">
        {filteredInsights.map((insight) => {
          const isExpanded = expandedInsightId === insight.id;

          return (
            <div
              key={insight.id}
              className="bg-white dark:bg-[#0a1d2e] rounded-2xl border border-neutral-200 dark:border-[#253648] p-4 sm:p-5 shadow-sm space-y-3 transition-all"
            >
              {/* Header with Badges */}
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider ${
                      insight.id === 'ai-1' || (insight.severity === 'CRITICAL')
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 border border-red-300 dark:border-red-800'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {insight.severity || (insight.id === 'ai-1' ? 'CRITICAL' : 'HIGH PRIORITY')}
                  </span>
                  <span className="font-mono text-xs text-neutral-500 dark:text-[#c1c6d3]">
                    {insight.targetAssetOrStation ||
                      (insight.id === 'ai-1'
                        ? 'POLAR-MED-409'
                        : insight.id === 'ai-2'
                        ? 'FUEL POD ALPHA'
                        : insight.id === 'ai-3'
                        ? 'GEN-SET POLAR-AX-1042'
                        : 'S.A. AGULHAS II')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-neutral-900 dark:text-[#a4c9ff] font-bold bg-neutral-100 dark:bg-[#0f2132] px-2 py-0.5 rounded border border-neutral-200 dark:border-[#253648]">
                    CONFIDENCE {insight.confidencePercent ?? insight.confidence}%
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="font-headline text-base sm:text-lg font-black text-neutral-900 dark:text-[#d2e4fc]">
                  {insight.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-[#c1c6d3] mt-1 leading-relaxed">
                  {insight.description || insight.summary}
                </p>
              </div>

              {/* Anomaly Visualization Graphic / Chart */}
              {insight.id === 'ai-1' && (
                <div className="p-3 bg-neutral-50 dark:bg-[#071A2B] rounded-xl border border-neutral-200 dark:border-[#253648] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-neutral-900 dark:text-[#d2e4fc]">
                      ANTIBIOTICS DEPLETION PROJECTION
                    </span>
                    <span className="text-red-600 font-bold">CRITICAL: DAY 10 RUN-OUT</span>
                  </div>
                  <div className="w-full h-12 flex items-end gap-1 pt-1">
                    {[100, 92, 85, 78, 70, 62, 54, 45, 36, 25, 12, 0, 0, 0].map((val, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <div
                          className={`w-full rounded-t transition-all ${
                            i >= 10 ? 'bg-red-600' : 'bg-neutral-800 dark:bg-[#a4c9ff]'
                          }`}
                          style={{ height: `${val}%` }}
                        />
                        <span className="text-[8px] font-mono text-neutral-400">{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insight.id === 'ai-2' && (
                <div className="p-3 bg-neutral-50 dark:bg-[#071A2B] rounded-xl border border-neutral-200 dark:border-[#253648] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-neutral-900 dark:text-[#d2e4fc]">
                      POLAR DIESEL BURN SURGE (+18%)
                    </span>
                    <span className="text-amber-600 font-bold">12 DAYS RESUPPLY WINDOW</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-[#253648] overflow-hidden">
                    <div className="h-full bg-red-600" style={{ width: '22%' }} />
                  </div>
                </div>
              )}

              {insight.id === 'ai-3' && (
                <div className="p-3 bg-neutral-50 dark:bg-[#071A2B] rounded-xl border border-neutral-200 dark:border-[#253648] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-neutral-900 dark:text-[#d2e4fc]">
                      CRANKSHAFT VIBRATION FREQUENCY DRIFT
                    </span>
                    <span className="text-red-600 font-bold">142 Hz (NORMAL: 60 Hz)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-[#c1c6d3]">
                    <span className="material-symbols-outlined text-amber-500 text-[18px]">
                      tune
                    </span>
                    <span>Bearing temperature trending +14°C above baseline</span>
                  </div>
                </div>
              )}

              {insight.id === 'ai-4' && (
                <div className="p-3 bg-neutral-50 dark:bg-[#071A2B] rounded-xl border border-neutral-200 dark:border-[#253648] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-neutral-900 dark:text-[#d2e4fc]">
                      CONSOLIDATED TRANSIT SAVINGS
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      -22% DIESEL • 4.5 DAYS FASTER
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-[#253648] overflow-hidden">
                    <div className="h-full bg-emerald-600" style={{ width: '78%' }} />
                  </div>
                </div>
              )}

              {/* Action Recommendation Box */}
              <div className="bg-neutral-100 dark:bg-[#0f2132] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] flex items-start justify-between gap-3">
                <div className="text-xs">
                  <span className="font-headline font-bold text-neutral-900 dark:text-[#d2e4fc] block">
                    Recommended Action:
                  </span>
                  <p className="text-neutral-600 dark:text-[#c1c6d3] mt-0.5">
                    {insight.recommendation}
                  </p>
                </div>
                {insight.id === 'ai-4' ? (
                  <button
                    onClick={handleApproveConsolidation}
                    className={`px-3 py-1.5 rounded-lg text-xs font-headline font-bold shrink-0 transition-all ${
                      approvedManifest
                        ? 'bg-emerald-600 text-white'
                        : 'bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white shadow-sm'
                    }`}
                  >
                    {approvedManifest ? 'Manifest Merged ✓' : 'Approve Consolidation'}
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      onToast(
                        'ACTION DISPATCHED',
                        `Directive: ${insight.recommendation.substring(0, 45)}...`,
                        'check_circle',
                        'green'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white text-xs font-headline font-bold shrink-0 shadow-sm active:scale-95 transition-all"
                  >
                    Execute Action
                  </button>
                )}
              </div>

              {/* Explainability Drawer Toggle */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => toggleExpand(insight.id)}
                  className="text-xs font-headline font-bold text-neutral-700 dark:text-[#a4c9ff] flex items-center gap-1 hover:underline"
                >
                  <span>
                    {isExpanded ? 'Hide Model Explainability' : 'Explain Model Factors & Weights'}
                  </span>
                  <span
                    className={`material-symbols-outlined text-[16px] transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  >
                    expand_more
                  </span>
                </button>
                <span className="font-mono text-[10px] text-neutral-400">
                  Model: {insight.model || (insight.id === 'ai-1' ? 'Bayesian Time-to-Exhaustion' : insight.id === 'ai-2' ? 'LSTM Burn Forecaster' : insight.id === 'ai-3' ? 'Telemetry Anomaly Isolation' : 'Transit LP Optimizer')}
                </span>
              </div>

              {/* Expanded Explainability Details */}
              {isExpanded && (
                <div className="bg-neutral-50 dark:bg-[#071A2B] p-3.5 rounded-xl border border-neutral-200 dark:border-[#253648] space-y-2 animate-in fade-in duration-200">
                  <span className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc] block">
                    Key Feature Weights & Environmental Inputs:
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {(insight.factors || []).map((fac, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-neutral-600 dark:text-[#c1c6d3]">{fac.label || fac.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-neutral-200 dark:bg-[#253648] overflow-hidden">
                            <div
                              className="h-full bg-black dark:bg-[#a4c9ff]"
                              style={{ width: `${fac.weight}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-neutral-900 dark:text-[#d2e4fc] w-8 text-right">
                            {fac.weight}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Export & Protocol Compliance Footer */}
      <div className="p-4 rounded-xl bg-neutral-100 dark:bg-[#0a1d2e] border border-neutral-200 dark:border-[#253648] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc]">
            NCPOR AI Governance & Trust Protocol v2.4
          </h4>
          <p className="text-[11px] text-neutral-500 dark:text-[#c1c6d3]">
            All neural inferences audited with strict human-in-the-loop authorization
          </p>
        </div>
        <button
          onClick={() =>
            onOpenModal(
              'Exporting Predictive SITREP',
              <div className="space-y-2 text-xs">
                <p>Generating compiled Bayesian predictive report for NCPOR Command Board...</p>
                <div className="p-2.5 rounded bg-neutral-100 dark:bg-[#0f2132] font-mono text-[11px]">
                  File: NCPOR_AI_PREDICTIVE_SITREP_2026.pdf<br />
                  Models: 4 Neural Pipelines Verified<br />
                  Accuracy: 89.4% ROC AUC
                </div>
              </div>,
              'download'
            )
          }
          className="px-4 py-2 rounded-xl bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white text-xs font-headline font-bold shadow-md transition-all self-start sm:self-auto"
        >
          Export Predictive SITREP (PDF)
        </button>
      </div>
    </div>
  );
};
