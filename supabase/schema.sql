-- ============================================================================
-- POLARX (Polar Expedition Logistics & Asset Management System)
-- Central PostgreSQL Supabase Database Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/towrhqfkcgtiiwynmkaq/sql
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (User & Commander Profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE,
  full_name TEXT NOT NULL,
  callsign TEXT,
  role TEXT NOT NULL DEFAULT 'Researcher',
  station TEXT NOT NULL DEFAULT 'Bharati Base',
  clearance TEXT DEFAULT 'Level 2 Station Clearance',
  contact_number TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Locations Table
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  elevation_meters DOUBLE PRECISION,
  description TEXT,
  status TEXT DEFAULT 'ACTIVE',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Expeditions Table
CREATE TABLE IF NOT EXISTS expeditions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  location TEXT NOT NULL,
  coordinates TEXT,
  discipline TEXT,
  objective TEXT,
  start_date TEXT,
  end_date TEXT,
  duration_days INTEGER DEFAULT 45,
  current_day INTEGER DEFAULT 1,
  progress_percent INTEGER DEFAULT 0,
  commander JSONB,
  weather JSONB,
  manifest_summary TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Personnel Table
CREATE TABLE IF NOT EXISTS personnel (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  station TEXT,
  clearance TEXT,
  status TEXT DEFAULT 'ACTIVE_DUTY',
  medical_fitness TEXT,
  contact TEXT,
  specialty TEXT,
  expedition_id TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Assets Table
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  asset_code TEXT,
  qr_code TEXT,
  rfid_code TEXT,
  asset_name TEXT NOT NULL,
  name TEXT,
  category TEXT,
  tier TEXT,
  status TEXT DEFAULT 'OPERATIONAL',
  condition TEXT DEFAULT 'OPTIMAL',
  health_percent INTEGER DEFAULT 100,
  location TEXT,
  origin_port TEXT,
  dest_station TEXT,
  vessel TEXT,
  eta TEXT,
  mass TEXT,
  serial_number TEXT,
  qr_payload TEXT,
  last_telemetry TEXT,
  alerts JSONB DEFAULT '[]'::jsonb,
  expedition_id TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Cargo Table
CREATE TABLE IF NOT EXISTS cargo (
  id TEXT PRIMARY KEY,
  cargo_code TEXT,
  name TEXT,
  carrier TEXT,
  origin TEXT,
  destination TEXT,
  departure_date TEXT,
  expected_arrival TEXT,
  transport_mode TEXT,
  status TEXT DEFAULT 'IN_TRANSIT',
  weight DOUBLE PRECISION,
  priority TEXT DEFAULT 'HIGH',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Inventory & Consumables Table
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  location TEXT,
  available DOUBLE PRECISION DEFAULT 0,
  min_buffer DOUBLE PRECISION DEFAULT 0,
  unit TEXT,
  burn_rate DOUBLE PRECISION DEFAULT 0,
  burn_rate_unit TEXT,
  days_remaining INTEGER,
  status TEXT DEFAULT 'NORMAL',
  priority INTEGER DEFAULT 2,
  transit_order JSONB,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Emergency Incidents (SAR) Table
CREATE TABLE IF NOT EXISTS emergency_incidents (
  id TEXT PRIMARY KEY,
  incident_code TEXT,
  incident_type TEXT,
  severity TEXT NOT NULL DEFAULT 'CRITICAL',
  title TEXT NOT NULL,
  defcon TEXT,
  description TEXT,
  location TEXT,
  coordinates TEXT,
  active_time TEXT,
  status TEXT DEFAULT 'ACTIVE',
  personnel JSONB DEFAULT '[]'::jsonb,
  personnel_involved JSONB DEFAULT '[]'::jsonb,
  response_team TEXT,
  eta TEXT,
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  alert_type TEXT,
  severity TEXT NOT NULL DEFAULT 'WARNING',
  title TEXT NOT NULL,
  message TEXT,
  description TEXT,
  status TEXT DEFAULT 'ACTIVE',
  expedition_id TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. AI Predictive Insights Table
CREATE TABLE IF NOT EXISTS ai_insights (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  category_label TEXT,
  confidence INTEGER DEFAULT 85,
  summary TEXT,
  metrics JSONB,
  recommendation TEXT,
  action_primary TEXT,
  action_secondary TEXT,
  factors JSONB DEFAULT '[]'::jsonb,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Activity Logs (SITREP) Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  title TEXT,
  action TEXT,
  badge TEXT,
  badge_type TEXT,
  category TEXT,
  details TEXT,
  description TEXT,
  actor TEXT,
  timestamp TEXT,
  entity_type TEXT,
  entity_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Sync Queue Table
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  operation TEXT NOT NULL,
  payload JSONB NOT NULL,
  sync_status TEXT DEFAULT 'SYNCED',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_qr ON assets(qr_code);
CREATE INDEX IF NOT EXISTS idx_assets_rfid ON assets(rfid_code);
CREATE INDEX IF NOT EXISTS idx_assets_code ON assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON emergency_incidents(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(sync_status);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expeditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargo ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Default Read/Write Policies for Authenticated & Anon Clients
DO $$ 
DECLARE
  tbl text;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read policy for %I" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public read policy for %I" ON %I FOR SELECT USING (true)', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Public write policy for %I" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public write policy for %I" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;
