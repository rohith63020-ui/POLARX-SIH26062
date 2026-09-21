/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { StationKey } from '../types';

export type MilestoneCategory = 'resupply' | 'personnel' | 'maintenance';

export interface TimelineMilestone {
  id: string;
  title: string;
  category: MilestoneCategory;
  station: StationKey;
  stationLabel: string;
  date: string;
  month: string;
  daysOffset: number; // e.g. 7 means 7 days from now
  urgency: 'routine' | 'critical' | 'attention';
  status: 'upcoming' | 'in_progress' | 'completed' | 'weather_hold';
  leadOfficer: string;
  leadRole: string;
  avatarUrl?: string;
  details: string;
  itemsOrManifest: string[];
  weatherConstraint: string;
  vesselOrFlight?: string;
  kidTitle: string;
  kidSummary: string;
  kidIcon: string;
}

export const TIMELINE_MILESTONES: TimelineMilestone[] = [
  {
    id: 'RW-01',
    title: 'S.A. Agulhas II Vessel Fast-Ice Docking',
    category: 'resupply',
    station: 'bharati',
    stationLabel: 'Bharati Station (Larsemann Hills)',
    date: '18 Sep 2026',
    month: 'SEP 2026',
    daysOffset: 7,
    urgency: 'critical',
    status: 'upcoming',
    leadOfficer: 'Dr. Vikram Nair',
    leadRole: 'Expedition Commander',
    avatarUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1Vf9Xq0xnY47UNhlyZT7Pq9jC1es62slYKE3GsB3emxLWHUYPyinKSKTmWcXE0ZeWU9wN7u-aMXRzh-UC1e1uNDKA5Zu4AvwQhWeXJC_LYmZXqb8I_S61MIwqHjqSEyjhn5ommgosU-s5t7LYm9S8TDkyu07Zkurjg-rbpD0TAwLWwVklCAKG5s3H2G3iLvOcPNy1-LO5iJLhwWje5g3BklQInLGqLk3VJr1FYO1KZEFKUvshfhtlGeCf2u',
    details: 'Primary summer resupply vessel berthing against fast-ice sheet. Heavy sling offload of polar diesel fuel bladders, cryo-specimen freezers, and dry ration containers.',
    itemsOrManifest: [
      '120,000L Arctic-Grade Polar Diesel Fuel',
      '4x Deep Ice Core Diamond Drill Heads',
      '6x Cryogenic Sample Storage Dewars (-80°C)',
      '18 Metric Tonnes Fresh & Dry Provisions',
    ],
    weatherConstraint: 'Wind < 26 knots, Sea ice fracture index < 0.25, Daylight window > 8 hrs',
    vesselOrFlight: 'S.A. Agulhas II (Polar Class 5 Icebreaker)',
    kidTitle: 'Big Red Icebreaker Ship Arrives! 🚢',
    kidSummary: 'A giant ship smashes through the ocean ice to deliver yummy warm food, coats, and fuel for the heaters!',
    kidIcon: '🚢',
  },
  {
    id: 'MM-01',
    title: 'Primary Gen-Set #02 5,000h Overhaul',
    category: 'maintenance',
    station: 'bharati',
    stationLabel: 'Bharati Station (Larsemann Hills)',
    date: '21 Sep 2026',
    month: 'SEP 2026',
    daysOffset: 10,
    urgency: 'critical',
    status: 'in_progress',
    leadOfficer: 'Eng. Anita Sharma',
    leadRole: 'Logistics Director & Chief Engineer',
    details: 'Scheduled 5,000-hour complete mechanical overhaul on 450kW Cummins extreme-cold diesel generator. Rebuilding turbocharger cartridge, calibrating governors, and flushing oil cooler heat exchangers.',
    itemsOrManifest: [
      'Turbocharger replacement assembly',
      '12x High-pressure fuel injector nozzles',
      'Coolant heat exchanger silicone gaskets',
      'Digital governor firmware update chip',
    ],
    weatherConstraint: 'Indoor workshop bay; requires stable auxiliary Gen-Set #01 running with zero interruption',
    vesselOrFlight: 'Internal Station Engineering Bay A',
    kidTitle: 'Fixing The Giant Station Engine! ⚙️',
    kidSummary: 'Engineers are putting brand new parts inside the giant green engine that makes warm electricity for the base!',
    kidIcon: '⚙️',
  },
  {
    id: 'PR-01',
    title: '44th Winter-Over Science Team Rotation',
    category: 'personnel',
    station: 'bharati',
    stationLabel: 'Bharati Station (Larsemann Hills)',
    date: '25 Sep 2026',
    month: 'SEP 2026',
    daysOffset: 14,
    urgency: 'attention',
    status: 'upcoming',
    leadOfficer: 'Dr. Rajesh Sen',
    leadRole: 'Outgoing Station Leader',
    details: 'Formal command transfer and debriefing. 16 winter-over scientists who endured 14 months of polar night hand over life-support, radar, and lab operations to the incoming 45th Expedition contingent.',
    itemsOrManifest: [
      '16 Outgoing Winter-Over Crew Members',
      '18 Incoming Summer Expedition Specialists',
      'Transfer of Station Master Crypto Keys',
      'Comprehensive Medical & Psychological Clearance',
    ],
    weatherConstraint: 'Helicopter sling transfer requires wind < 32 knots and visibility > 2 km',
    vesselOrFlight: 'Bell 412EP Polar Airframes (x2)',
    kidTitle: 'Brave Scientists Going Home! 👋',
    kidSummary: '16 scientists who lived in Antarctica during the dark freezing winter get on the helicopter to fly home to their families!',
    kidIcon: '👋',
  },
  {
    id: 'MM-02',
    title: 'VSAT Satellite Radome De-Icing Service',
    category: 'maintenance',
    station: 'bharati',
    stationLabel: 'Bharati Station (Larsemann Hills)',
    date: '29 Sep 2026',
    month: 'SEP 2026',
    daysOffset: 18,
    urgency: 'routine',
    status: 'upcoming',
    leadOfficer: 'David Miller',
    leadRole: 'Senior Telecommunications Officer',
    details: 'External tethered climb of the 4.8-meter geodesic radome. Inspecting internal heat-trace heating elements, replacing RF feedhorn weather seal, and calibrating beam azimuth tracking toward Inmarsat-4.',
    itemsOrManifest: [
      '4.8m Radome silicone weatherproof seal ring',
      'Ku-band RF Feedhorn backup transducer',
      'Low-temp heat-trace heating cables (220V)',
      'Fall-arrest safety harnesses with Arctic carabiners',
    ],
    weatherConstraint: 'Strict: Zero precipitation, winds < 14 knots, surface temperature > -25°C',
    vesselOrFlight: 'Station Comms Tower Beta',
    kidTitle: 'Climbing The Big Space Ball! 📡',
    kidSummary: 'Climbing up to wipe heavy ice off the giant white soccer ball on the roof so everyone can video-call home!',
    kidIcon: '📡',
  },
  {
    id: 'RW-02',
    title: 'LC-130 Hercules Ski-Plane Air-Bridge',
    category: 'resupply',
    station: 'maitri',
    stationLabel: 'Maitri Station (Schirmacher Oasis)',
    date: '04 Oct 2026',
    month: 'OCT 2026',
    daysOffset: 23,
    urgency: 'critical',
    status: 'upcoming',
    leadOfficer: 'Col. Sanjeev Kapoor',
    leadRole: 'DROMLAN Air Operations Lead',
    details: 'High-priority continental ski-plane touchdown on Novolazarevskaya Blue Ice Runway. Direct Cape Town transfer of urgent diagnostic medical reagents, satellite spare components, and fresh provisions.',
    itemsOrManifest: [
      'Cold-chain blood plasma & lyophilized antibiotics',
      'Replacement server motherboards for seismic hub',
      'Fresh fruit crates & fresh dairy rations',
      'High-altitude meteorology ozonesonde packs',
    ],
    weatherConstraint: 'Runway surface friction > 0.35, ground wind cross-component < 15 kts, cloud ceiling > 1,500 ft',
    vesselOrFlight: 'USAF/DROMLAN LC-130H Hercules (Ski-equipped)',
    kidTitle: 'Airplane With Snow Skis Lands! 🛩️',
    kidSummary: 'A huge cargo plane with giant snow skis on its wheels touches down on the smooth blue ice runway with fresh apples!',
    kidIcon: '🛩️',
  },
  {
    id: 'PR-02',
    title: 'Summer Deep Glaciology Taskforce Inbound',
    category: 'personnel',
    station: 'bharati',
    stationLabel: 'Bharati Station (Larsemann Hills)',
    date: '12 Oct 2026',
    month: 'OCT 2026',
    daysOffset: 31,
    urgency: 'attention',
    status: 'upcoming',
    leadOfficer: 'Dr. Maya Sen',
    leadRole: 'Chief Geophysicist & Ice Coring Lead',
    details: 'Arrival of 12 glaciologists and subglacial radar technicians to launch the 2026-27 East Antarctic Ice Sheet core drilling campaign in Sector 4.',
    itemsOrManifest: [
      '12 Senior Glaciologists & Field Technicians',
      'Deep Ground Penetrating Radar (GPR) systems',
      'Titanium core drill barrels & ethanol thermal probes',
      'Survival sledges & high-altitude polar tents',
    ],
    weatherConstraint: 'Helo transit to Sector 4 dependent on katabatic wind subsidence',
    vesselOrFlight: 'SA Agulhas II Flight Deck Alpha',
    kidTitle: 'Ice Detective Team Arrives! 🔍',
    kidSummary: '12 ice detectives arrive with ground radar machines to see what is buried under miles of Antarctic ice!',
    kidIcon: '🔍',
  },
  {
    id: 'MM-03',
    title: 'Snowcat Heavy Traverse Fleet Fleet Service',
    category: 'maintenance',
    station: 'maitri',
    stationLabel: 'Maitri Station (Schirmacher Oasis)',
    date: '16 Oct 2026',
    month: 'OCT 2026',
    daysOffset: 35,
    urgency: 'attention',
    status: 'upcoming',
    leadOfficer: 'Sanjay Rawat',
    leadRole: 'Fleet Master Mechanic',
    details: 'Comprehensive track tensioning, extreme-cold synthetic hydraulic fluid change, and winch testing for the 4 PistenBully and Kassbohrer snowcat tractors before the 250km inland traverse.',
    itemsOrManifest: [
      '400L Low-temperature synthetic hydraulic fluid (-55°C)',
      '16x Reinforced steel track cleats and guide pins',
      'Hydraulic hose crimp fittings and spare pressure pumps',
      'Crevasse detector front-boom sensor calibration kits',
    ],
    weatherConstraint: 'Maintenance bay temperature kept above -5°C using diesel blowers',
    vesselOrFlight: 'Maitri Heavy Mechanical Hangar',
    kidTitle: 'Monster Snowcat Truck Checkup! 🚜',
    kidSummary: 'Mechanics are testing the giant rubber bulldozer tracks and monster trucks so they can drive over snow mountains!',
    kidIcon: '🚜',
  },
  {
    id: 'RW-03',
    title: 'Arctic Patrol Vessel KV Svalbard Port Call',
    category: 'resupply',
    station: 'himadri',
    stationLabel: 'Himadri Station (Ny-Ålesund, Arctic)',
    date: '22 Oct 2026',
    month: 'OCT 2026',
    daysOffset: 41,
    urgency: 'routine',
    status: 'upcoming',
    leadOfficer: 'Dr. Alok Verma',
    leadRole: 'Arctic Program Director',
    details: 'Final pre-polar-night maritime berthing at Ny-Ålesund pier before the Kongsfjorden fjord freezes over. Disembarking fjord CTD ocean buoys and atmospheric aerosol samplers.',
    itemsOrManifest: [
      '8x Oceanographic acoustic drift buoys',
      'Automated aerosol spectrometer sampling filters',
      'High-grade Arctic kerosene fuel barrels',
      'Winterized electric snowmobile batteries',
    ],
    weatherConstraint: 'Kongsfjorden pack ice drift < 30% coverage',
    vesselOrFlight: 'KV Svalbard (Norwegian Coast Guard Icebreaker)',
    kidTitle: 'Last Ship Before North Pole Freezes! ⚓',
    kidSummary: 'The last ship of the year pulls into the Arctic fjord with batteries and ocean buoys before the sea turns to solid ice!',
    kidIcon: '⚓',
  },
  {
    id: 'MM-04',
    title: 'Priyadarshini Lake RO Desalination Overhaul',
    category: 'maintenance',
    station: 'maitri',
    stationLabel: 'Maitri Station (Schirmacher Oasis)',
    date: '05 Nov 2026',
    month: 'NOV 2026',
    daysOffset: 55,
    urgency: 'routine',
    status: 'upcoming',
    leadOfficer: 'Preeti Nair',
    leadRole: 'Environmental & Water Systems Officer',
    details: 'Replacing UV sterilizer quartz tubes, reverse osmosis filtration membranes, and inspecting submerged heating traces running 1.2km into Lake Priyadarshini.',
    itemsOrManifest: [
      '4x Reverse osmosis high-pressure spiral membranes',
      '8x Germicidal ultraviolet quartz lamp sleeves',
      'Submersible electric heat-trace replacement cable',
      'Calibrated water chemistry digital analyzer kit',
    ],
    weatherConstraint: 'Surface wind < 20 knots for lakeside inspection',
    vesselOrFlight: 'Maitri Lake Water Treatment Station',
    kidTitle: 'Crystal Fresh Water Filter Refresh! 💧',
    kidSummary: 'Putting fresh new water filters on the pipe that drinks from the glacier lake so all the tea and drinking water stays delicious!',
    kidIcon: '💧',
  },
  {
    id: 'PR-03',
    title: 'Maitri Medical & Dive Specialist Handover',
    category: 'personnel',
    station: 'maitri',
    stationLabel: 'Maitri Station (Schirmacher Oasis)',
    date: '08 Nov 2026',
    month: 'NOV 2026',
    daysOffset: 58,
    urgency: 'attention',
    status: 'upcoming',
    leadOfficer: 'Dr. Rajesh Patel',
    leadRole: 'Chief Medical Officer',
    details: 'Rotation of hyperbaric medicine specialist and certified polar scientific divers who conduct winter under-ice lake ecology sampling.',
    itemsOrManifest: [
      '2x Cold-water scientific divers',
      '1x Emergency hyperbaric chamber technician',
      'Medical resupply certification transfer',
    ],
    weatherConstraint: 'Air corridor Cape Town to Maitri nominal',
    vesselOrFlight: 'DROMLAN Feeder Flight Twin Otter',
    kidTitle: 'Ice Scuba Divers Arrive! 🤿',
    kidSummary: 'Super brave scuba divers who dive under 3-meter thick lake ice arrive to study polar fish and tiny microscopic moss!',
    kidIcon: '🤿',
  },
  {
    id: 'RW-04',
    title: 'Dome-C Inland Traverse Heavy Fuel Drop',
    category: 'resupply',
    station: 'bharati',
    stationLabel: 'Bharati Station (Larsemann Hills)',
    date: '15 Nov 2026',
    month: 'NOV 2026',
    daysOffset: 65,
    urgency: 'critical',
    status: 'upcoming',
    leadOfficer: 'Eng. Anita Sharma',
    leadRole: 'Logistics Director',
    details: 'Second maritime supply stage carrying heavy bulk fuel sledges. Essential replenishment powering the 800km inland scientific traverse into the polar plateau.',
    itemsOrManifest: [
      '250,000L Low-pour polar aviation & generator fuel',
      '4x Heavy cargo sledges with UHMW polyethylene skids',
      'Spare Caterpillar C13 diesel power units',
      'Mobile field container kitchen module',
    ],
    weatherConstraint: 'Prydz Bay ice pack access open',
    vesselOrFlight: 'M/V Vasiliy Golovnin (Heavy Ice Transport)',
    kidTitle: 'Giant Fuel Sled Train Arrives! 🚛',
    kidSummary: 'Huge sleds loaded with 250,000 liters of polar fuel arrive to fuel the tractors going deep into the South Pole ice desert!',
    kidIcon: '🚛',
  },
  {
    id: 'MM-05',
    title: 'Himadri Riometer & Auroral Camera Calibration',
    category: 'maintenance',
    station: 'himadri',
    stationLabel: 'Himadri Station (Ny-Ålesund, Arctic)',
    date: '26 Nov 2026',
    month: 'NOV 2026',
    daysOffset: 76,
    urgency: 'routine',
    status: 'upcoming',
    leadOfficer: 'Dr. Sunil Kaul',
    leadRole: 'Upper Atmosphere Physicist',
    details: 'Laser leveling, sensitivity tuning, and dome cleaning for the 30 MHz cosmic noise riometer and high-sensitivity EMCCD all-sky auroral imager prior to 24-hour winter darkness.',
    itemsOrManifest: [
      'Optical anti-reflective dome replacement lenses',
      'Precision RF noise calibration signal generator',
      'High-speed cryo-cooled camera sensor backup',
    ],
    weatherConstraint: 'Clear night sky required for star field optical calibration',
    vesselOrFlight: 'Himadri Atmospheric Roof Deck',
    kidTitle: 'Tuning Aurora Northern Lights Cameras! 🌌',
    kidSummary: 'Scientists clean the glass lenses of the cameras that photograph glowing green and violet Northern Lights dancing across the night sky!',
    kidIcon: '🌌',
  },
];

interface ExpeditionTimelineProps {
  currentStation?: StationKey;
  kidMode?: boolean;
  onToast?: (title: string, body: string, icon?: string, color?: 'green' | 'amber' | 'blue') => void;
}

export const ExpeditionTimeline: React.FC<ExpeditionTimelineProps> = ({
  currentStation = 'bharati',
  kidMode = true,
  onToast,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | MilestoneCategory>('all');
  const [selectedStationFilter, setSelectedStationFilter] = useState<StationKey | 'all'>('all');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>(TIMELINE_MILESTONES[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter milestones based on category and station filter
  const filteredMilestones = TIMELINE_MILESTONES.filter((m) => {
    const matchCategory = selectedCategory === 'all' || m.category === selectedCategory;
    const matchStation = selectedStationFilter === 'all' || m.station === selectedStationFilter;
    return matchCategory && matchStation;
  });

  const selectedMilestone =
    filteredMilestones.find((m) => m.id === selectedMilestoneId) ||
    filteredMilestones[0] ||
    TIMELINE_MILESTONES[0];

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleJumpToToday = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
    setSelectedMilestoneId(filteredMilestones[0]?.id || TIMELINE_MILESTONES[0].id);
  };

  const handleCopyDetails = (m: TimelineMilestone) => {
    const briefing = `[POLARX TIMELINE] ${m.id}: ${m.title}
Date: ${m.date} | Station: ${m.stationLabel}
Category: ${m.category.toUpperCase()} | Status: ${m.status.toUpperCase()}
Lead: ${m.leadOfficer} (${m.leadRole})
Details: ${m.details}
Weather Constraint: ${m.weatherConstraint}`;

    navigator.clipboard.writeText(briefing);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 2500);
    onToast?.('BRIEFING COPIED', `Schedule briefing for ${m.id} copied to clipboard`, 'content_copy', 'green');
  };

  const handleFlagAlert = (m: TimelineMilestone) => {
    onToast?.(
      'CALENDAR REMINDER SET',
      `Flagged ${m.id} (${m.title}) with high-priority countdown notification`,
      'notification_add',
      'amber'
    );
  };

  // Category visual styles helper
  const getCategoryTheme = (cat: MilestoneCategory) => {
    switch (cat) {
      case 'resupply':
        return {
          label: 'Resupply Window',
          kidLabel: 'Food & Fuel Resupply 📦',
          icon: 'local_shipping',
          badgeBg: 'bg-sky-100 dark:bg-sky-950/60 text-sky-900 dark:text-sky-300 border-sky-300 dark:border-sky-700',
          dotBg: 'bg-sky-500',
          ringColor: 'ring-sky-500',
          accentBorder: 'border-sky-500',
        };
      case 'personnel':
        return {
          label: 'Personnel Rotation',
          kidLabel: 'Crew Handover 👥',
          icon: 'groups',
          badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
          dotBg: 'bg-emerald-500',
          ringColor: 'ring-emerald-500',
          accentBorder: 'border-emerald-500',
        };
      case 'maintenance':
        return {
          label: 'Maintenance Milestone',
          kidLabel: 'Engine & Gear Fix 🔧',
          icon: 'build',
          badgeBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700',
          dotBg: 'bg-amber-500',
          ringColor: 'ring-amber-500',
          accentBorder: 'border-amber-500',
        };
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#0a1d2e] rounded-2xl border border-neutral-200 dark:border-[#253648] shadow-sm overflow-hidden flex flex-col p-4 sm:p-5 gap-4">
      {/* Top Header & Interactive Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-[#1a2b3d] pb-3.5">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-neutral-900 dark:text-[#a4c9ff] text-[22px]">
              timeline
            </span>
            <h2 className="font-headline text-lg sm:text-xl font-black text-neutral-900 dark:text-[#d2e4fc] tracking-tight">
              {kidMode ? 'Polar Expedition Horizon & Schedule' : 'Operational Horizon & Resupply Timeline'}
            </h2>
            <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-[#0f2132] text-neutral-800 dark:text-[#a4c9ff] text-[10px] font-mono font-bold uppercase border border-neutral-300 dark:border-[#253648]">
              2026-2027 CYCLE
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-[#c1c6d3] mt-0.5">
            {kidMode
              ? 'Swipe horizontally ↔ to see upcoming ships, fresh food crates, scientist visits, and big engine tune-ups!'
              : 'Chronological timeline of resupply windows, personnel rotations, and maintenance milestones across polar stations'}
          </p>
        </div>

        {/* Scroll Nav Buttons & Today Anchor */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={handleJumpToToday}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] text-neutral-800 dark:text-[#d2e4fc] text-xs font-bold font-headline flex items-center gap-1 border border-neutral-200 dark:border-[#253648] transition-all"
            title="Reset view to current date"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Today (11 Sep)</span>
          </button>

          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#0f2132] p-0.5 rounded-lg border border-neutral-200 dark:border-[#253648]">
            <button
              onClick={() => handleScroll('left')}
              className="w-7 h-7 rounded flex items-center justify-center text-neutral-700 dark:text-[#d2e4fc] hover:bg-white dark:hover:bg-[#1a2b3d] transition-colors"
              aria-label="Scroll timeline left"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="w-7 h-7 rounded flex items-center justify-center text-neutral-700 dark:text-[#d2e4fc] hover:bg-white dark:hover:bg-[#1a2b3d] transition-colors"
              aria-label="Scroll timeline right"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills & Station Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-label font-bold shrink-0 transition-all flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-black text-white dark:bg-[#0b5ea8] shadow-sm'
                : 'bg-neutral-100 dark:bg-[#0f2132] text-neutral-600 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white border border-neutral-200 dark:border-[#253648]'
            }`}
          >
            <span>All Milestones</span>
            <span className="px-1.5 py-0.2 rounded-full bg-neutral-700 dark:bg-black/40 text-white text-[10px]">
              {TIMELINE_MILESTONES.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('resupply')}
            className={`px-3 py-1 rounded-full text-xs font-label font-bold shrink-0 transition-all flex items-center gap-1.5 ${
              selectedCategory === 'resupply'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-neutral-100 dark:bg-[#0f2132] text-neutral-600 dark:text-[#c1c6d3] hover:text-sky-600 border border-neutral-200 dark:border-[#253648]'
            }`}
          >
            <span>📦 Resupply Windows</span>
            <span className="text-[10px] opacity-80">
              ({TIMELINE_MILESTONES.filter((m) => m.category === 'resupply').length})
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('personnel')}
            className={`px-3 py-1 rounded-full text-xs font-label font-bold shrink-0 transition-all flex items-center gap-1.5 ${
              selectedCategory === 'personnel'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-neutral-100 dark:bg-[#0f2132] text-neutral-600 dark:text-[#c1c6d3] hover:text-emerald-600 border border-neutral-200 dark:border-[#253648]'
            }`}
          >
            <span>👥 Personnel Rotations</span>
            <span className="text-[10px] opacity-80">
              ({TIMELINE_MILESTONES.filter((m) => m.category === 'personnel').length})
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('maintenance')}
            className={`px-3 py-1 rounded-full text-xs font-label font-bold shrink-0 transition-all flex items-center gap-1.5 ${
              selectedCategory === 'maintenance'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-neutral-100 dark:bg-[#0f2132] text-neutral-600 dark:text-[#c1c6d3] hover:text-amber-600 border border-neutral-200 dark:border-[#253648]'
            }`}
          >
            <span>🔧 Maintenance</span>
            <span className="text-[10px] opacity-80">
              ({TIMELINE_MILESTONES.filter((m) => m.category === 'maintenance').length})
            </span>
          </button>
        </div>

        {/* Station Filter Toggle */}
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#0f2132] p-1 rounded-lg border border-neutral-200 dark:border-[#253648] text-xs font-headline">
          <span className="text-[10px] font-mono text-neutral-500 dark:text-[#c1c6d3] px-1 uppercase font-bold">
            Station:
          </span>
          {(['all', 'bharati', 'maitri', 'himadri'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStationFilter(st)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold capitalize transition-colors ${
                selectedStationFilter === st
                  ? 'bg-black text-white dark:bg-[#0b5ea8]'
                  : 'text-neutral-600 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal Scrollable Timeline Rail & Track */}
      <div className="relative w-full">
        {/* Visual Current Date Anchor Header Bar */}
        <div className="flex items-center justify-between mb-2 text-[11px] font-mono font-bold text-neutral-500 dark:text-[#c1c6d3] px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-emerald-700 dark:text-emerald-400 font-extrabold uppercase">
              Current Date: 11 Sep 2026
            </span>
            <span className="text-neutral-400">•</span>
            <span>Antarctic Late Winter / Austral Spring Transition</span>
          </div>
          <span className="hidden md:inline text-[10px] opacity-75">
            Showing {filteredMilestones.length} Events on Track • Click any card for briefing
          </span>
        </div>

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="w-full overflow-x-auto pb-4 pt-2 no-scrollbar scroll-smooth flex items-stretch gap-3.5 snap-x snap-mandatory"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {filteredMilestones.map((m) => {
            const theme = getCategoryTheme(m.category);
            const isSelected = selectedMilestone?.id === m.id;

            return (
              <div
                key={m.id}
                onClick={() => setSelectedMilestoneId(m.id)}
                className={`min-w-[270px] sm:min-w-[310px] max-w-[330px] rounded-xl p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-200 snap-start border ${
                  isSelected
                    ? 'bg-neutral-50 dark:bg-[#0f2132] border-2 border-neutral-900 dark:border-[#a4c9ff] shadow-md ring-2 ring-neutral-900/10 dark:ring-[#a4c9ff]/20 scale-[1.01]'
                    : 'bg-white dark:bg-[#071A2B] border-neutral-200 dark:border-[#253648] hover:border-neutral-400 dark:hover:border-neutral-500 shadow-sm'
                }`}
              >
                {/* Milestone Top Row: Category badge & Days remaining countdown */}
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase flex items-center gap-1 border ${theme.badgeBg}`}
                  >
                    <span className="material-symbols-outlined text-[13px]">{theme.icon}</span>
                    <span>{m.category}</span>
                  </span>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      m.status === 'in_progress'
                        ? 'bg-emerald-500 text-white animate-pulse'
                        : m.daysOffset <= 10
                        ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 font-extrabold border border-red-300'
                        : 'bg-neutral-100 dark:bg-[#1a2b3d] text-neutral-700 dark:text-[#c1c6d3] border border-neutral-200 dark:border-[#253648]'
                    }`}
                  >
                    {m.status === 'in_progress' ? 'ACTIVE NOW' : `T-MINUS ${m.daysOffset} DAYS`}
                  </span>
                </div>

                {/* Title & Station */}
                <div className="mb-2">
                  <h3 className="font-headline text-xs sm:text-sm font-bold text-neutral-900 dark:text-[#d2e4fc] line-clamp-2 leading-snug">
                    {kidMode ? m.kidTitle : m.title}
                  </h3>
                  <div className="flex items-center gap-1 mt-1 text-[10.5px] text-neutral-500 dark:text-[#c1c6d3] font-mono">
                    <span className="material-symbols-outlined text-[13px] text-neutral-700 dark:text-[#a4c9ff]">
                      location_on
                    </span>
                    <span className="truncate capitalize font-semibold">{m.station} Base</span>
                    <span>•</span>
                    <span className="text-neutral-900 dark:text-white font-bold">{m.date}</span>
                  </div>
                </div>

                {/* Kid summary or Tactical briefing */}
                <p className="text-[11px] text-neutral-600 dark:text-[#c1c6d3] line-clamp-2 leading-relaxed mb-3">
                  {kidMode ? m.kidSummary : m.details}
                </p>

                {/* Footer: Lead Officer & Station Action */}
                <div className="pt-2.5 border-t border-neutral-100 dark:border-[#1a2b3d] flex items-center justify-between gap-2 mt-auto">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {m.avatarUrl ? (
                      <img
                        src={m.avatarUrl}
                        alt={m.leadOfficer}
                        className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-neutral-300 dark:ring-[#253648]"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-[#1a2b3d] flex items-center justify-center text-[10px] text-neutral-700 dark:text-[#a4c9ff] shrink-0">
                        {theme.icon === 'build' ? '⚙️' : theme.icon === 'groups' ? '👥' : '📦'}
                      </div>
                    )}
                    <span className="text-[10px] font-headline font-bold text-neutral-800 dark:text-[#d2e4fc] truncate">
                      {m.leadOfficer}
                    </span>
                  </div>

                  <span
                    className={`text-[9.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-neutral-900 text-white dark:bg-[#0b5ea8]'
                        : 'text-neutral-500 dark:text-[#c1c6d3] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {isSelected ? 'SELECTED ✓' : 'INSPECT →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Horizontal Scroll Bar Indicator Hint for Mobile */}
        <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-neutral-400 dark:text-neutral-500 mt-1">
          <span className="material-symbols-outlined text-[13px]">swap_horiz</span>
          <span>Scroll horizontally or tap arrows to navigate timeline</span>
        </div>
      </div>

      {/* Selected Milestone Deep-Dive Inspector Panel */}
      {selectedMilestone && (
        <div className="mt-1 bg-neutral-50 dark:bg-[#071A2B] rounded-xl p-4 sm:p-5 border border-neutral-200 dark:border-[#253648] flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-[#1a2b3d] pb-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
                  getCategoryTheme(selectedMilestone.category).badgeBg
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">
                  {getCategoryTheme(selectedMilestone.category).icon}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-neutral-500 dark:text-[#a4c9ff]">
                    [{selectedMilestone.id}]
                  </span>
                  <h3 className="font-headline text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                    {selectedMilestone.title}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                      selectedMilestone.urgency === 'critical'
                        ? 'bg-red-600 text-white'
                        : selectedMilestone.urgency === 'attention'
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {selectedMilestone.urgency} window
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-[#c1c6d3] mt-0.5">
                  Scheduled for <strong className="text-neutral-900 dark:text-white">{selectedMilestone.date}</strong> ({selectedMilestone.stationLabel})
                </p>
              </div>
            </div>

            {/* Tactical Actions */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => handleCopyDetails(selectedMilestone)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0f2132] hover:bg-neutral-100 dark:hover:bg-[#1a2b3d] text-neutral-800 dark:text-[#d2e4fc] text-xs font-bold font-headline border border-neutral-300 dark:border-[#253648] transition-all shadow-sm active:scale-95"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {copiedId === selectedMilestone.id ? 'check' : 'content_copy'}
                </span>
                <span>{copiedId === selectedMilestone.id ? 'Copied' : 'Copy Briefing'}</span>
              </button>

              <button
                onClick={() => handleFlagAlert(selectedMilestone)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white text-xs font-bold font-headline shadow-sm transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[15px]">notification_add</span>
                <span>Set Reminder</span>
              </button>
            </div>
          </div>

          {/* Child Mode Explanation Banner */}
          {kidMode && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-200 text-xs flex items-center gap-2.5">
              <span className="text-2xl shrink-0">{selectedMilestone.kidIcon}</span>
              <div className="flex flex-col">
                <span className="font-headline font-black text-xs sm:text-sm">
                  Junior Explorer Guide: {selectedMilestone.kidTitle}
                </span>
                <span className="text-[11.5px] mt-0.5">{selectedMilestone.kidSummary}</span>
              </div>
            </div>
          )}

          {/* Detailed Specs 3-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Column 1: Operational Scope & Vehicle */}
            <div className="bg-white dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] space-y-1.5 shadow-sm">
              <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3] block">
                Operational Logistics
              </span>
              <p className="text-neutral-700 dark:text-[#d2e4fc] leading-relaxed">
                {selectedMilestone.details}
              </p>
              {selectedMilestone.vesselOrFlight && (
                <div className="pt-2 border-t border-neutral-100 dark:border-[#1a2b3d] flex items-center gap-1.5 font-mono text-[11px] text-neutral-800 dark:text-[#a4c9ff]">
                  <span className="material-symbols-outlined text-[14px]">directions_boat</span>
                  <span className="font-bold">{selectedMilestone.vesselOrFlight}</span>
                </div>
              )}
            </div>

            {/* Column 2: Manifest & Itemized Components */}
            <div className="bg-white dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] space-y-1.5 shadow-sm">
              <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3] block">
                Manifest / Cargo Items
              </span>
              <ul className="space-y-1">
                {selectedMilestone.itemsOrManifest.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-1.5 text-[11px] text-neutral-700 dark:text-[#c1c6d3]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-[#a4c9ff] shrink-0 mt-1" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Weather Window & Command Officer */}
            <div className="bg-white dark:bg-[#0a1d2e] p-3 rounded-xl border border-neutral-200 dark:border-[#253648] space-y-2 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 dark:text-[#c1c6d3] block mb-1">
                  Weather Go/No-Go Window
                </span>
                <div className="p-2 rounded-lg bg-neutral-50 dark:bg-[#0f2132] border border-neutral-200 dark:border-[#253648] text-[11px] text-neutral-800 dark:text-[#d2e4fc] font-mono">
                  {selectedMilestone.weatherConstraint}
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-[#1a2b3d] flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono text-neutral-400 block uppercase">
                    Officer In Charge
                  </span>
                  <span className="font-headline font-bold text-neutral-900 dark:text-[#d2e4fc] text-xs">
                    {selectedMilestone.leadOfficer}
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-[#c1c6d3] block truncate">
                    {selectedMilestone.leadRole}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 font-mono text-[9px] font-bold uppercase">
                  READY
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
