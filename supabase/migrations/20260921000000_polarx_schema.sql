-- ============================================================================
-- POLARX – Integrated Polar Expedition Logistics & Asset Management System
-- Problem Statement: SIH26062 | Team: NEXO TECH
-- Complete PostgreSQL Database Schema for Supabase with RLS, Triggers & Functions
-- ============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE (User Roles & Clearance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN (
        'admin',
        'expedition_manager',
        'logistics_manager',
        'researcher',
        'field_operator',
        'emergency_operator',
        'viewer'
    )) DEFAULT 'researcher',
    organization TEXT DEFAULT 'NCPOR (National Centre for Polar and Ocean Research)',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 2. LOCATIONS TABLE (Polar Stations, Field Camps, Waypoints)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location_type TEXT NOT NULL CHECK (location_type IN (
        'PERMANENT_STATION',
        'FIELD_CAMP',
        'DEPOT',
        'AIRSTRIP',
        'PORT',
        'WAYPOINT',
        'TRAVERSE_SITE'
    )),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    region TEXT NOT NULL CHECK (region IN ('ANTARCTIC', 'ARCTIC', 'SOUTHERN_OCEAN', 'TRANSIT')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 3. EXPEDITIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.expeditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expedition_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    region TEXT NOT NULL CHECK (region IN ('ANTARCTIC', 'ARCTIC', 'SOUTHERN_OCEAN')),
    destination TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PLANNING', 'ACTIVE', 'COMPLETED', 'DELAYED', 'EMERGENCY_HOLD')) DEFAULT 'PLANNING',
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 4. PERSONNEL TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    department TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    emergency_contact TEXT,
    status TEXT NOT NULL CHECK (status IN (
        'ACTIVE_DUTY',
        'FIELD_TRAVERSE',
        'STANDBY_SAR',
        'REST_CYCLE',
        'MEDICAL_HOLD',
        'EVACUATED'
    )) DEFAULT 'ACTIVE_DUTY',
    current_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    expedition_id UUID REFERENCES public.expeditions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 5. ASSETS TABLE (Heavy Equipment, Scientific Labs, Vehicles, Power Gen)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_code TEXT UNIQUE NOT NULL,
    qr_code TEXT UNIQUE NOT NULL,
    rfid_code TEXT UNIQUE NOT NULL,
    asset_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Power Generation',
        'Medical Bio-Lab',
        'Surface Heavy Equipment',
        'Scientific Core Instrumentation',
        'Life Support Systems',
        'Field Traverse Vehicles',
        'Communications Array',
        'Safety & SAR Gear'
    )),
    description TEXT,
    serial_number TEXT,
    condition TEXT NOT NULL CHECK (condition IN (
        'OPTIMAL',
        'GOOD',
        'FAIR',
        'DEGRADED',
        'CRITICAL_DEFECT',
        'OUT_OF_SERVICE'
    )) DEFAULT 'OPTIMAL',
    status TEXT NOT NULL CHECK (status IN (
        'OPERATIONAL',
        'IN_TRANSIT',
        'DEPLOYED_FIELD',
        'UNDER_MAINTENANCE',
        'DECOMMISSIONED'
    )) DEFAULT 'OPERATIONAL',
    current_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    expedition_id UUID REFERENCES public.expeditions(id) ON DELETE SET NULL,
    purchase_date DATE,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 6. CARGO TABLE (Consignments, Supply Vessels, Air Drops)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cargo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cargo_code TEXT UNIQUE NOT NULL,
    expedition_id UUID REFERENCES public.expeditions(id) ON DELETE SET NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    carrier TEXT NOT NULL,
    transport_mode TEXT NOT NULL CHECK (transport_mode IN (
        'POLAR_RESEARCH_VESSEL',
        'ICEBREAKER_CONVOY',
        'SKI_AIRCRAFT_LC130',
        'TWIN_OTTER_FLIGHT',
        'SNOW_OVERLAND_TRAVERSE'
    )),
    departure_date TIMESTAMPTZ NOT NULL,
    expected_arrival TIMESTAMPTZ NOT NULL,
    actual_arrival TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN (
        'MANIFESTED',
        'IN_TRANSIT',
        'HELD_WEATHER',
        'DELIVERED',
        'UNLOADED',
        'CANCELLED'
    )) DEFAULT 'MANIFESTED',
    weight DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    priority TEXT NOT NULL CHECK (priority IN ('CRITICAL', 'HIGH', 'STANDARD', 'ROUTINE')) DEFAULT 'STANDARD',
    manifest_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 7. CARGO ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cargo_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cargo_id UUID NOT NULL REFERENCES public.cargo(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'units',
    weight DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    condition TEXT NOT NULL DEFAULT 'SEALED_CONTAINER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 8. INVENTORY TABLE (Station Consumables, Fuel, Food, Spares)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    expedition_id UUID REFERENCES public.expeditions(id) ON DELETE SET NULL,
    item_code TEXT UNIQUE NOT NULL,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Medical & Pharmaceuticals',
        'Polar Fuel & Lubricants',
        'Rations & Provisions',
        'Mechanical & Spares',
        'Scientific Reagents & Core Kits',
        'Survival & Cold Weather Gear'
    )),
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    minimum_quantity NUMERIC NOT NULL DEFAULT 10,
    maximum_quantity NUMERIC NOT NULL DEFAULT 100,
    consumption_rate DOUBLE PRECISION NOT NULL DEFAULT 1.0, -- daily burn rate
    last_updated TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 9. INVENTORY TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('ADD', 'CONSUME', 'ADJUST', 'RESUPPLY_RESTOCK', 'WASTE')),
    quantity NUMERIC NOT NULL,
    previous_quantity NUMERIC NOT NULL,
    new_quantity NUMERIC NOT NULL,
    reason TEXT,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 10. ASSET MOVEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.asset_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    from_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    to_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('DISPATCH', 'TRANSFER', 'FIELD_DEPLOYMENT', 'RETURN_BASE', 'MAINTENANCE_RECOVERY')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    moved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 11. PERSONNEL MOVEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.personnel_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personnel_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
    from_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    to_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('FIELD_SORTIE', 'STATION_TRANSFER', 'SAR_DEPLOY', 'EVACUATION', 'ROTATION')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ============================================================================
-- 12. MAINTENANCE RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('SCHEDULED_PM', 'EMERGENCY_REPAIR', 'CALIBRATION', 'ARCTIC_WINTERIZATION', 'OVERHAUL')),
    description TEXT NOT NULL,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    maintenance_date DATE NOT NULL,
    next_due_date DATE,
    cost NUMERIC DEFAULT 0.0,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'PARTS_HOLD')) DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 13. EMERGENCY INCIDENTS TABLE (SAR & Station DEFCON)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.emergency_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_code TEXT UNIQUE NOT NULL,
    expedition_id UUID REFERENCES public.expeditions(id) ON DELETE SET NULL,
    incident_type TEXT NOT NULL CHECK (incident_type IN (
        'CREVASSE_FALL',
        'BLIZZARD_WHITEOUT_ISOLATION',
        'GENERATOR_POWER_FAILURE',
        'MEDICAL_TRAUMA',
        'VEHICLE_BREAKDOWN_ICE',
        'HAZMAT_FUEL_SPILL',
        'FIRE_HABITAT',
        'SAT_COMM_BLACKOUT'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'SAR_DEPLOYED', 'CONTAINED', 'RESOLVED', 'FALSE_ALARM')) DEFAULT 'ACTIVE',
    reported_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 14. EMERGENCY RESOURCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.emergency_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.emergency_incidents(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('PERSONNEL', 'VEHICLE', 'MEDICAL_KIT', 'SAR_EQUIPMENT', 'HEATED_SHELTER', 'DRONE')),
    resource_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    assigned_to TEXT,
    status TEXT NOT NULL CHECK (status IN ('EN_ROUTE', 'ON_SCENE', 'STANDBY', 'RELEASED')) DEFAULT 'EN_ROUTE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 15. ALERTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'LOW_STOCK_DEPLETION',
        'WEATHER_ANOMALY',
        'ASSET_HEALTH_DEGRADATION',
        'MAINTENANCE_OVERDUE',
        'CARGO_DELAY_SCHEDULE',
        'DEFCON_EMERGENCY_ESCALATION',
        'COMMUNICATION_TIMEOUT'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    expedition_id UUID REFERENCES public.expeditions(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ============================================================================
-- 16. AI INSIGHTS TABLE (Predictive Analytics & Consumption Modeling)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expedition_id UUID REFERENCES public.expeditions(id) ON DELETE SET NULL,
    insight_type TEXT NOT NULL CHECK (insight_type IN (
        'CONSUMPTION_FORECAST',
        'MAINTENANCE_PREDICTION',
        'WEATHER_IMPACT',
        'ROUTE_OPTIMIZATION',
        'SAFETY_RECOMMENDATION'
    )),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0) DEFAULT 0.85,
    severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
    related_entity_type TEXT,
    related_entity_id UUID,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL CHECK (status IN ('NEW', 'APPLIED', 'DISMISSED')) DEFAULT 'NEW'
);

-- ============================================================================
-- 17. SYNC QUEUE TABLE (Offline Store Engine Synchronization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    operation TEXT NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')),
    entity_type TEXT NOT NULL,
    entity_id UUID,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    synced_at TIMESTAMPTZ,
    sync_status TEXT NOT NULL CHECK (sync_status IN ('PENDING', 'SYNCED', 'CONFLICT', 'FAILED')) DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT
);

-- ============================================================================
-- 18. ACTIVITY LOGS TABLE (Audit Trail & Activity Streams)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    device_id TEXT DEFAULT 'WEB_TERMINAL'
);

-- ============================================================================
-- DATABASE INDEXES (Fast Queries & Filtering)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_expeditions_code ON public.expeditions(expedition_code);
CREATE INDEX IF NOT EXISTS idx_expeditions_status ON public.expeditions(status);

CREATE INDEX IF NOT EXISTS idx_personnel_emp_code ON public.personnel(employee_code);
CREATE INDEX IF NOT EXISTS idx_personnel_expedition ON public.personnel(expedition_id);
CREATE INDEX IF NOT EXISTS idx_personnel_location ON public.personnel(current_location_id);
CREATE INDEX IF NOT EXISTS idx_personnel_status ON public.personnel(status);

CREATE INDEX IF NOT EXISTS idx_assets_code ON public.assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_assets_qr ON public.assets(qr_code);
CREATE INDEX IF NOT EXISTS idx_assets_rfid ON public.assets(rfid_code);
CREATE INDEX IF NOT EXISTS idx_assets_expedition ON public.assets(expedition_id);
CREATE INDEX IF NOT EXISTS idx_assets_location ON public.assets(current_location_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);

CREATE INDEX IF NOT EXISTS idx_cargo_code ON public.cargo(cargo_code);
CREATE INDEX IF NOT EXISTS idx_cargo_expedition ON public.cargo(expedition_id);
CREATE INDEX IF NOT EXISTS idx_cargo_status ON public.cargo(status);

CREATE INDEX IF NOT EXISTS idx_cargo_items_cargo ON public.cargo_items(cargo_id);
CREATE INDEX IF NOT EXISTS idx_cargo_items_asset ON public.cargo_items(asset_id);

CREATE INDEX IF NOT EXISTS idx_inventory_code ON public.inventory(item_code);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON public.inventory(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_expedition ON public.inventory(expedition_id);

CREATE INDEX IF NOT EXISTS idx_inventory_txn_inv ON public.inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_asset_mov_asset ON public.asset_movements(asset_id);
CREATE INDEX IF NOT EXISTS idx_pers_mov_pers ON public.personnel_movements(personnel_id);
CREATE INDEX IF NOT EXISTS idx_maint_asset ON public.maintenance_records(asset_id);

CREATE INDEX IF NOT EXISTS idx_emergency_code ON public.emergency_incidents(incident_code);
CREATE INDEX IF NOT EXISTS idx_emergency_expedition ON public.emergency_incidents(expedition_id);
CREATE INDEX IF NOT EXISTS idx_emergency_status ON public.emergency_incidents(status);

CREATE INDEX IF NOT EXISTS idx_alerts_expedition ON public.alerts(expedition_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts(severity);

CREATE INDEX IF NOT EXISTS idx_ai_expedition ON public.ai_insights(expedition_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON public.sync_queue(sync_status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(timestamp);

-- ============================================================================
-- AUTOMATED TRIGGERS & FUNCTIONS (updated_at Timestamp Sync)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_expeditions_updated_at ON public.expeditions;
CREATE TRIGGER tr_expeditions_updated_at BEFORE UPDATE ON public.expeditions FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_personnel_updated_at ON public.personnel;
CREATE TRIGGER tr_personnel_updated_at BEFORE UPDATE ON public.personnel FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_assets_updated_at ON public.assets;
CREATE TRIGGER tr_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_cargo_updated_at ON public.cargo;
CREATE TRIGGER tr_cargo_updated_at BEFORE UPDATE ON public.cargo FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_emergency_updated_at ON public.emergency_incidents;
CREATE TRIGGER tr_emergency_updated_at BEFORE UPDATE ON public.emergency_incidents FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expeditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper to inspect caller's role from profiles
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. PROFILES POLICIES
CREATE POLICY "Public profiles can be viewed by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can edit their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.current_user_role() = 'admin');

-- 2. OPERATIONAL READ ACCESS (All authenticated users can read operational entities)
CREATE POLICY "Authenticated users can read locations" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read expeditions" ON public.expeditions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read personnel" ON public.personnel FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read assets" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read cargo" ON public.cargo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read cargo_items" ON public.cargo_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read inventory_transactions" ON public.inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read asset_movements" ON public.asset_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read personnel_movements" ON public.personnel_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read maintenance_records" ON public.maintenance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read emergency_incidents" ON public.emergency_incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read emergency_resources" ON public.emergency_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read alerts" ON public.alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read ai_insights" ON public.ai_insights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read activity_logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);

-- 3. WRITE & UPDATE POLICIES BY ROLE

-- Admins & Managers can modify expeditions, assets, cargo
CREATE POLICY "Admins and Managers can modify expeditions"
    ON public.expeditions FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'expedition_manager'));

CREATE POLICY "Admins and Managers can modify assets"
    ON public.assets FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'expedition_manager', 'logistics_manager', 'field_operator'));

CREATE POLICY "Admins and Logistics Managers can modify cargo"
    ON public.cargo FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'expedition_manager', 'logistics_manager'));

CREATE POLICY "Admins and Logistics Managers can modify cargo items"
    ON public.cargo_items FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'expedition_manager', 'logistics_manager'));

-- Field Operators and Logistics Managers can update inventory and log transactions
CREATE POLICY "Operators and Managers can modify inventory"
    ON public.inventory FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'expedition_manager', 'logistics_manager', 'field_operator', 'researcher'));

CREATE POLICY "Users can create inventory transactions"
    ON public.inventory_transactions FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_role() != 'viewer');

CREATE POLICY "Users can record asset movements"
    ON public.asset_movements FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_role() != 'viewer');

-- Emergency Operators, Expedition Managers, and Admins can manage emergencies
CREATE POLICY "Emergency and Ops can create/update incidents"
    ON public.emergency_incidents FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'expedition_manager', 'emergency_operator', 'field_operator'));

CREATE POLICY "Emergency resources management"
    ON public.emergency_resources FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'expedition_manager', 'emergency_operator'));

CREATE POLICY "Users can manage alerts"
    ON public.alerts FOR ALL
    TO authenticated
    USING (public.current_user_role() != 'viewer');

CREATE POLICY "Sync queue user isolation"
    ON public.sync_queue FOR ALL
    TO authenticated
    USING (auth.uid() = user_id OR public.current_user_role() = 'admin');

CREATE POLICY "Activity log insertion"
    ON public.activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);
