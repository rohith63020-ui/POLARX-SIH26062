/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POLARX Central Types & Entity Model Declarations
 * Mapped to 18 PostgreSQL / Supabase Schema Tables & Offline IndexedDB Stores
 */

export type AppTab =
  | 'ops'
  | 'dashboard'
  | 'exped'
  | 'expeditions'
  | 'cargo'
  | 'assets'
  | 'stock'
  | 'inventory'
  | 'ai'
  | 'ai-insights'
  | 'sos'
  | 'emergency'
  | 'sim'
  | 'personnel'
  | 'reports'
  | 'settings'
  | 'profile'
  | 'gmail'
  | 'communications';

export type StationKey = 'bharati' | 'maitri' | 'himadri';
export type StationId = StationKey;

export type UserRole =
  | 'admin'
  | 'expedition_manager'
  | 'logistics_manager'
  | 'researcher'
  | 'field_operator'
  | 'emergency_operator'
  | 'viewer';

export type FirebaseUserRole =
  | 'ADMIN'
  | 'LOGISTICS_MANAGER'
  | 'EXPEDITION_OFFICER'
  | 'RESEARCHER';

// ============================================================================
// 1. PROFILES (Table: profiles)
// ============================================================================
export interface Profile {
  id: string; // UUID references auth.users
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  organization: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
  version?: number;
}

export interface UserProfile {
  name: string;
  fullName?: string;
  role: string;
  station: string;
  organization?: string;
  clearance: string;
  email: string;
  avatarUrl: string;
  id?: string;
  phone?: string;
}

export interface FirestoreUserProfile {
  uid: string;
  displayName: string;
  fullName?: string;
  email: string;
  photoURL?: string;
  avatarUrl?: string;
  provider?: 'google' | 'password' | string;
  role: FirebaseUserRole | string;
  organization?: string;
  createdAt: string;
  lastLogin: string;
  station?: string;
}

// ============================================================================
// 2. LOCATIONS (Table: locations)
// ============================================================================
export interface Location {
  id: string;
  name: string;
  location_type:
    | 'PERMANENT_STATION'
    | 'FIELD_CAMP'
    | 'DEPOT'
    | 'AIRSTRIP'
    | 'PORT'
    | 'WAYPOINT'
    | 'TRAVERSE_SITE';
  latitude: number;
  longitude: number;
  region: 'ANTARCTIC' | 'ARCTIC' | 'SOUTHERN_OCEAN' | 'TRANSIT';
  description?: string | null;
  created_at?: string;
  version?: number;
}

// ============================================================================
// 3. EXPEDITIONS (Table: expeditions)
// ============================================================================
export interface Expedition {
  id: string;
  expedition_code?: string;
  name: string;
  region?: 'ANTARCTIC' | 'ARCTIC' | 'SOUTHERN_OCEAN' | string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  status: 'active' | 'planning' | 'delayed' | 'completed' | 'ACTIVE' | 'PLANNING' | 'COMPLETED' | 'DELAYED' | 'EMERGENCY_HOLD';
  description?: string;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  version?: number;

  // Frontend UI extensions
  location?: string;
  coordinates?: string;
  commander?: {
    name: string;
    role: string;
    avatarUrl?: string;
    subordinatesCount: number;
  };
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  currentDay?: number;
  progressPercent?: number;
  objective?: string;
  weather?: {
    temp: string;
    windchill: string;
    wind: string;
    gusts: string;
    pressure: string;
  };
  manifestSummary?: string;
  discipline?: string;
}

// ============================================================================
// 4. PERSONNEL (Table: personnel)
// ============================================================================
export interface PersonnelMember {
  id: string;
  employee_code?: string;
  full_name?: string;
  designation?: string;
  department?: string;
  phone?: string | null;
  email?: string | null;
  emergency_contact?: string | null;
  status?:
    | 'ACTIVE_DUTY'
    | 'FIELD_TRAVERSE'
    | 'STANDBY_SAR'
    | 'REST_CYCLE'
    | 'MEDICAL_HOLD'
    | 'EVACUATED'
    | 'ON ACTIVE DUTY'
    | 'TRAVERSE FIELD'
    | 'STANDBY SAR'
    | 'ON_DUTY'
    | string;
  current_location_id?: string | null;
  expedition_id?: string | null;
  expeditionId?: string | null;
  created_at?: string;
  updated_at?: string;
  version?: number;

  // Frontend compatibility
  name: string;
  role?: string;
  station?: StationKey | string;
  clearance?: string;
  medicalFitness?: string;
  contact?: string;
  specialty?: string;
  avatarUrl?: string;
  avatar?: string;
  expedition?: string;
  userId?: string;
  [key: string]: any;
}

// ============================================================================
// 5. ASSETS (Table: assets)
// ============================================================================
export interface Asset {
  id: string;
  asset_code?: string;
  qr_code?: string;
  rfid_code?: string;
  asset_name?: string;
  category?:
    | 'Power Generation'
    | 'Medical Bio-Lab'
    | 'Surface Heavy Equipment'
    | 'Scientific Core Instrumentation'
    | 'Life Support Systems'
    | 'Field Traverse Vehicles'
    | 'Communications Array'
    | 'Safety & SAR Gear'
    | string;
  description?: string | null;
  serial_number?: string | null;
  serialNumber?: string | null;
  condition?:
    | 'OPTIMAL'
    | 'GOOD'
    | 'FAIR'
    | 'DEGRADED'
    | 'CRITICAL_DEFECT'
    | 'OUT_OF_SERVICE'
    | string;
  status?:
    | 'OPERATIONAL'
    | 'IN_TRANSIT'
    | 'DEPLOYED_FIELD'
    | 'UNDER_MAINTENANCE'
    | 'DECOMMISSIONED'
    | 'AT STATION'
    | 'DEPLOYED'
    | 'MAINTENANCE'
    | string;
  current_location_id?: string | null;
  expedition_id?: string | null;
  expeditionId?: string | null;
  purchase_date?: string | null;
  last_maintenance_date?: string | null;
  next_maintenance_date?: string | null;
  created_at?: string;
  updated_at?: string;
  version?: number;

  // UI mapping fields
  name: string;
  location?: string;
  mass?: string;
  healthPercent?: number;
  qrPayload?: string;
  logId?: string;
  [key: string]: any;
}

export type CargoAsset = Asset & {
  tier?: string;
  originPort?: string;
  destStation?: string;
  vessel?: string;
  eta?: string;
  lastTelemetry?: string;
  alerts?: string[];
  carrier?: string;
  destination?: string;
  weightKg?: number;
  integrity?: number;
  departureDate?: string;
  expeditionId?: string;
  [key: string]: any;
};

// ============================================================================
// 6. CARGO (Table: cargo)
// ============================================================================
export interface Cargo {
  id: string;
  cargo_code: string;
  expedition_id?: string | null;
  origin: string;
  destination: string;
  carrier: string;
  transport_mode:
    | 'POLAR_RESEARCH_VESSEL'
    | 'ICEBREAKER_CONVOY'
    | 'SKI_AIRCRAFT_LC130'
    | 'TWIN_OTTER_FLIGHT'
    | 'SNOW_OVERLAND_TRAVERSE';
  departure_date: string;
  expected_arrival: string;
  actual_arrival?: string | null;
  status:
    | 'MANIFESTED'
    | 'IN_TRANSIT'
    | 'HELD_WEATHER'
    | 'DELIVERED'
    | 'UNLOADED'
    | 'CANCELLED'
    | string;
  weight: number;
  priority: 'CRITICAL' | 'HIGH' | 'STANDARD' | 'ROUTINE';
  manifest_url?: string | null;
  created_at?: string;
  updated_at?: string;
  version?: number;

  // UI compatibility aliases
  items?: CargoItem[];
  code?: string;
}

// ============================================================================
// 7. CARGO ITEMS (Table: cargo_items)
// ============================================================================
export interface CargoItem {
  id: string;
  cargo_id: string;
  asset_id?: string | null;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  weight: number;
  condition: string;
  created_at?: string;
  version?: number;
}

// ============================================================================
// 8. INVENTORY (Table: inventory)
// ============================================================================
export interface ConsumableItem {
  id: string;
  location_id?: string | null;
  expedition_id?: string | null;
  item_code?: string;
  item_name?: string;
  category:
    | 'Medical & Pharmaceuticals'
    | 'Polar Fuel & Lubricants'
    | 'Rations & Provisions'
    | 'Mechanical & Spares'
    | 'Scientific Reagents & Core Kits'
    | 'Survival & Cold Weather Gear'
    | 'Medical'
    | 'Energy'
    | 'Provision'
    | 'Maintenance'
    | 'Scientific Core'
    | string;
  quantity?: number;
  unit: string;
  minimum_quantity?: number;
  maximum_quantity?: number;
  consumption_rate?: number; // daily burn rate
  last_updated?: string;
  created_at?: string;
  updated_at?: string;
  version?: number;

  // UI compatibility mappings
  name?: string;
  location?: string;
  available?: number;
  minBuffer?: number;
  minimumThreshold?: number;
  burnRate?: number;
  burnRateUnit?: string;
  daysRemaining?: number;
  status?: 'CRITICAL' | 'LOW' | 'NORMAL' | 'OPTIMAL' | string;
  priority?: number;
  transitOrder?: {
    orderId: string;
    vessel: string;
    eta: string;
    progressPercent: number;
  };
  sku?: string;
  currentStock?: number;
  maxStock?: number;
  threshold?: number;
  consumptionHistory?: StockLog[];
}

export interface StockLog {
  id: string;
  type: 'ADD' | 'CONSUME' | 'ADJUST' | 'RESUPPLY_RESTOCK' | 'WASTE';
  amount: number;
  remaining: number;
  reason?: string;
  timestamp: string;
  user?: string;
}

// ============================================================================
// 9. INVENTORY TRANSACTIONS (Table: inventory_transactions)
// ============================================================================
export interface InventoryTransaction {
  id: string;
  inventory_id: string;
  transaction_type: 'ADD' | 'CONSUME' | 'ADJUST' | 'RESUPPLY_RESTOCK' | 'WASTE';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason?: string | null;
  performed_by?: string | null;
  created_at: string;
  version?: number;
}

// ============================================================================
// 10. ASSET MOVEMENTS (Table: asset_movements)
// ============================================================================
export interface AssetMovement {
  id: string;
  asset_id: string;
  from_location_id?: string | null;
  to_location_id?: string | null;
  movement_type:
    | 'DISPATCH'
    | 'TRANSFER'
    | 'FIELD_DEPLOYMENT'
    | 'RETURN_BASE'
    | 'MAINTENANCE_RECOVERY';
  latitude?: number | null;
  longitude?: number | null;
  moved_by?: string | null;
  timestamp: string;
  version?: number;
}

// ============================================================================
// 11. PERSONNEL MOVEMENTS (Table: personnel_movements)
// ============================================================================
export interface PersonnelMovement {
  id: string;
  personnel_id: string;
  from_location_id?: string | null;
  to_location_id?: string | null;
  movement_type:
    | 'FIELD_SORTIE'
    | 'STATION_TRANSFER'
    | 'SAR_DEPLOY'
    | 'EVACUATION'
    | 'ROTATION';
  timestamp: string;
  recorded_by?: string | null;
  version?: number;
}

// ============================================================================
// 12. MAINTENANCE RECORDS (Table: maintenance_records)
// ============================================================================
export interface MaintenanceRecord {
  id: string;
  asset_id: string;
  maintenance_type:
    | 'SCHEDULED_PM'
    | 'EMERGENCY_REPAIR'
    | 'CALIBRATION'
    | 'ARCTIC_WINTERIZATION'
    | 'OVERHAUL';
  description: string;
  performed_by?: string | null;
  maintenance_date: string;
  next_due_date?: string | null;
  cost?: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTS_HOLD';
  created_at?: string;
  version?: number;
}

// ============================================================================
// 13. EMERGENCY INCIDENTS (Table: emergency_incidents)
// ============================================================================
export interface EmergencyIncident {
  id: string;
  incident_code?: string;
  expedition_id?: string | null;
  incident_type?:
    | 'CREVASSE_FALL'
    | 'BLIZZARD_WHITEOUT_ISOLATION'
    | 'GENERATOR_POWER_FAILURE'
    | 'MEDICAL_TRAUMA'
    | 'VEHICLE_BREAKDOWN_ICE'
    | 'HAZMAT_FUEL_SPILL'
    | 'FIRE_HABITAT'
    | 'SAT_COMM_BLACKOUT'
    | string;
  severity?: 'CRITICAL' | 'WARNING' | 'INFO' | string;
  title: string;
  description: string;
  location_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  reported_by?: string | null;
  status: 'ACTIVE' | 'SAR_DEPLOYED' | 'CONTAINED' | 'RESOLVED' | 'FALSE_ALARM' | string;
  reported_at?: string;
  resolved_at?: string | null;
  created_at?: string;
  updated_at?: string;
  version?: number;
}

export interface SarIncident extends Partial<EmergencyIncident> {
  id: string;
  title: string;
  defcon?: string;
  location?: string;
  activeTime?: string;
  personnel?: {
    name: string;
    role: string;
    status: 'critical' | 'stable' | 'monitored' | string;
  }[];
  responseTeam?: string;
  personnelInTeam?: string;
  eta?: string;
  status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED' | 'SAR_DEPLOYED' | string;
  coordinates?: string;
  description?: string;
  situation?: string;
  severity?: 'CRITICAL' | 'WARNING' | 'INFO' | string;
  reportedTime?: string;
  incidentCommander?: string;
  leadInvestigator?: string;
  distressCode?: string;
  personnelInvolved?: string[];
  [key: string]: any;
}

// ============================================================================
// 14. EMERGENCY RESOURCES (Table: emergency_resources)
// ============================================================================
export interface EmergencyResource {
  id: string;
  incident_id?: string;
  emergencyId?: string;
  personnelId?: string;
  assetId?: string;
  resource_type?:
    | 'PERSONNEL'
    | 'VEHICLE'
    | 'MEDICAL_KIT'
    | 'SAR_EQUIPMENT'
    | 'HEATED_SHELTER'
    | 'DRONE'
    | string;
  resource_name?: string;
  name?: string;
  type?: string;
  quantity: number;
  assigned_to?: string | null;
  assignedTeam?: string;
  status: 'EN_ROUTE' | 'ON_SCENE' | 'STANDBY' | 'RELEASED' | string;
  location?: string;
  createdBy?: string;
  createdAt?: string;
  created_at?: string;
  updated_at?: string;
  version?: number;
  [key: string]: any;
}

// ============================================================================
// 15. ALERTS (Table: alerts)
// ============================================================================
export interface AlertItem {
  id: string;
  alert_type?:
    | 'LOW_STOCK_DEPLETION'
    | 'WEATHER_ANOMALY'
    | 'ASSET_HEALTH_DEGRADATION'
    | 'MAINTENANCE_OVERDUE'
    | 'CARGO_DELAY_SCHEDULE'
    | 'DEFCON_EMERGENCY_ESCALATION'
    | 'COMMUNICATION_TIMEOUT'
    | string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | string;
  title: string;
  message?: string;
  description?: string;
  entity_type?: string | null;
  entity_id?: string | null;
  expedition_id?: string | null;
  inventoryId?: string;
  assetId?: string;
  expeditionId?: string;
  type?: string;
  timestamp?: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  created_at?: string;
  updated_at?: string;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  version?: number;
  [key: string]: any;
}

export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
export type NotificationCategory =
  | 'INVENTORY'
  | 'CARGO'
  | 'ASSET'
  | 'EXPEDITION'
  | 'PERSONNEL'
  | 'EMERGENCY'
  | 'RESUPPLY'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  dedupKey?: string;
  title: string;
  message: string;
  timestamp: string;
  createdAt: string;
  updatedAt?: string;
  severity: NotificationSeverity;
  category: NotificationCategory;
  targetTab?: AppTab | string;
  targetId?: string;
  isRead: boolean;
  readAt?: string | null;
  userId?: string;
  role?: string;
  stationId?: string;
  createdBy?: string;
  metadata?: Record<string, any>;
  version?: number;
}

// ============================================================================
// 16. AI INSIGHTS (Table: ai_insights)
// ============================================================================
export interface AiInsight {
  id: string;
  expedition_id?: string | null;
  insight_type?:
    | 'CONSUMPTION_FORECAST'
    | 'MAINTENANCE_PREDICTION'
    | 'WEATHER_IMPACT'
    | 'ROUTE_OPTIMIZATION'
    | 'SAFETY_RECOMMENDATION'
    | string;
  title: string;
  description?: string;
  recommendation: string;
  confidence: number;
  severity?: 'CRITICAL' | 'WARNING' | 'INFO' | string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  generated_at?: string;
  status?: 'NEW' | 'APPLIED' | 'DISMISSED' | string;
  created_at?: string;
  updated_at?: string;
  version?: number;

  // UI mapping fields
  alertId?: string;
  inventoryId?: string;
  category?: 'consumables' | 'fleet' | 'transit' | string;
  categoryLabel?: string;
  summary?: string;
  metrics?: {
    label1: string;
    val1: string;
    sub1: string;
    label2: string;
    val2: string;
    sub2: string;
    label3: string;
    val3: string;
    sub3: string;
  };
  actionPrimary?: string;
  actionSecondary?: string;
  factors?: {
    label: string;
    weight: number;
    icon: string;
    statusColor?: string;
    name?: string;
  }[];
  type?: string;
  targetAssetOrStation?: string;
  confidencePercent?: number;
  model?: string;
}

// ============================================================================
// 17. SYNC QUEUE (Table: sync_queue)
// ============================================================================
export interface SyncQueueRecord {
  id: string;
  device_id: string;
  user_id?: string | null;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type:
    | 'profiles'
    | 'expeditions'
    | 'personnel'
    | 'locations'
    | 'assets'
    | 'cargo'
    | 'cargo_items'
    | 'inventory'
    | 'inventory_transactions'
    | 'asset_movements'
    | 'personnel_movements'
    | 'maintenance_records'
    | 'emergency_incidents'
    | 'emergency_resources'
    | 'alerts'
    | 'ai_insights'
    | 'activity_logs'
    | string;
  entity_id?: string | null;
  payload: Record<string, any>;
  created_at: string;
  synced_at?: string | null;
  sync_status: 'PENDING' | 'SYNCED' | 'CONFLICT' | 'FAILED';
  retry_count: number;
  error_message?: string | null;
}

export interface PendingSyncItem {
  id: string;
  entity:
    | 'expeditions'
    | 'assets'
    | 'cargo'
    | 'inventory'
    | 'personnel'
    | 'alerts'
    | 'emergencyIncidents'
    | 'activityLogs'
    | 'resupplyRequests'
    | string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityId: string;
  data: any;
  timestamp: number;
  retryCount?: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'COMPLETED';
  error?: string;
  description: string;
}

export interface OfflineRecord {
  id: string;
  type: 'ASSET' | 'INVENTORY' | 'PERSONNEL' | 'CARGO' | 'EMERGENCY' | 'CUSTOM';
  desc: string;
  time: string;
  status: 'PENDING SYNC' | 'SYNCHRONIZED';
  station?: string;
  user?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// 18. ACTIVITY LOGS (Table: activity_logs)
// ============================================================================
export interface ActivityLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_data?: Record<string, any> | null;
  new_data?: Record<string, any> | null;
  timestamp: string;
  device_id?: string;
}

export interface SitrepEvent {
  id: string;
  expeditionId?: string;
  emergencyId?: string;
  inventoryId?: string;
  timestamp: string;
  badge: string;
  badgeType: 'telemetry' | 'deploy' | 'sat' | 'distress' | 'beacon' | 'ops' | 'ai';
  description: string;
  time?: string;
  category?: string;
  title?: string;
  details?: string;
  actor?: string;
  status?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResupplyRequest {
  id: string;
  inventoryId?: string;
  expeditionId?: string;
  orderNumber?: string;
  itemName: string;
  requestedQty: number;
  unit: string;
  priority: 'EMERGENCY' | 'HIGH' | 'ROUTINE' | 'STANDARD';
  status: 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'DELIVERED';
  destination?: string;
  eta?: string;
  vesselOrCarrier?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MissionReport {
  id: string;
  type: 'sitrep' | 'cargo' | 'fuel' | 'research' | 'inventory' | 'emergency' | string;
  title: string;
  station: string;
  date: string;
  author: string;
  summary: string;
  status: 'VERIFIED' | 'SUBMITTED' | 'PUBLISHED' | 'DRAFT' | string;
  classification: string;
  dataSnapshot?: {
    activeExpeditions?: number;
    totalAssets?: number;
    lowStockItems?: number;
    criticalAlerts?: number;
    activePersonnel?: number;
    sarIncidents?: number;
    [key: string]: any;
  };
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
