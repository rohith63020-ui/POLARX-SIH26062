-- ============================================================================
-- POLARX Demo & Operational Seed Data (NCPOR Polar Logistics)
-- ============================================================================

-- Insert Stations / Locations
INSERT INTO public.locations (id, name, location_type, latitude, longitude, region, description) VALUES
('11111111-1111-1111-1111-111111111101', 'Bharati Research Station', 'PERMANENT_STATION', -69.4069, 76.1950, 'ANTARCTIC', 'Primary coastal research base in Larsemann Hills, East Antarctica.'),
('11111111-1111-1111-1111-111111111102', 'Maitri Research Base', 'PERMANENT_STATION', -70.7667, 11.7333, 'ANTARCTIC', 'Inland rocky oasis base in Schirmacher Oasis, Queen Maud Land.'),
('11111111-1111-1111-1111-111111111103', 'Himadri Arctic Station', 'PERMANENT_STATION', 78.9236, 11.9272, 'ARCTIC', 'High Arctic atmospheric & glaciology station at Ny-Ålesund, Svalbard.'),
('11111111-1111-1111-1111-111111111104', 'Larsemann Hills Depot Delta', 'DEPOT', -69.4120, 76.2200, 'ANTARCTIC', 'Fuel reserves and snowcat staging depot for deep ice traverse.'),
('11111111-1111-1111-1111-111111111105', 'Cape Town Port Logistics Hub', 'PORT', -33.9249, 18.4241, 'TRANSIT', 'Primary maritime embarkation and break-bulk loading terminal for Antarctic missions.')
ON CONFLICT (id) DO NOTHING;

-- Insert Expeditions
INSERT INTO public.expeditions (id, expedition_code, name, region, destination, start_date, end_date, status, description) VALUES
('22222222-2222-2222-2222-222222222201', 'EXP-IND-44-ANT', '44th Indian Antarctic Scientific Expedition (ISEA)', 'ANTARCTIC', 'Bharati & Maitri Stations', '2026-11-01', '2027-04-15', 'ACTIVE', 'Multi-disciplinary scientific voyage focusing on deep ice core paleoclimate drilling and atmospheric aerosol monitoring.'),
('22222222-2222-2222-2222-222222222202', 'EXP-IND-18-ARC', '18th Indian Arctic Glaciology & Marine Traverse', 'ARCTIC', 'Himadri Station, Ny-Ålesund', '2026-06-15', '2026-09-30', 'PLANNING', 'Svalbard glacier mass-balance calculations, permafrost thaw telemetry, and Kongsfjorden fjord hydrology.')
ON CONFLICT (id) DO NOTHING;

-- Insert Personnel
INSERT INTO public.personnel (id, employee_code, full_name, designation, department, phone, email, emergency_contact, status, current_location_id, expedition_id) VALUES
('33333333-3333-3333-3333-333333333301', 'NCPOR-P01', 'Dr. Vikramaditya Sen', 'Expedition Leader & Paleoclimatologist', 'Glaciology', '+91-98200-11221', 'v.sen@ncpor.gov.in', 'Mrs. Sen (+91-98200-11222)', 'ACTIVE_DUTY', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201'),
('33333333-3333-3333-3333-333333333302', 'NCPOR-P02', 'Lt. Col. Rajesh Nair', 'Station Commander & Operations Lead', 'Logistics & Safety', '+91-98200-33441', 'r.nair@ncpor.gov.in', 'HQ Operations (+91-832-2525555)', 'ACTIVE_DUTY', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201'),
('33333333-3333-3333-3333-333333333303', 'NCPOR-P03', 'Dr. Ananya Sharma', 'Lead Biochemist & Micro-Flora Analyst', 'Biology', '+91-98200-44551', 'a.sharma@ncpor.gov.in', 'Dr. K. Sharma (+91-98200-44552)', 'ACTIVE_DUTY', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201'),
('33333333-3333-3333-3333-333333333304', 'NCPOR-P04', 'Sgt. Major Balwinder Singh', 'Heavy Mechanical & Snowcat Specialist', 'Engineering', '+91-98200-55661', 'b.singh@ncpor.gov.in', 'Command Centre (+91-832-2525556)', 'FIELD_TRAVERSE', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222201'),
('33333333-3333-3333-3333-333333333305', 'NCPOR-P05', 'Dr. K. S. Venkatesh', 'Atmospheric Physics Researcher', 'Atmospheric Sciences', '+91-98200-66771', 'k.venkatesh@ncpor.gov.in', 'Family (+91-98200-66772)', 'ACTIVE_DUTY', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222201'),
('33333333-3333-3333-3333-333333333306', 'NCPOR-P06', 'Dr. Meera Nambiar', 'Polar Medical Surgeon & Hyperbaric Lead', 'Medical & Trauma', '+91-98200-77881', 'm.nambiar@ncpor.gov.in', 'Dr. R. Nambiar (+91-98200-77882)', 'STANDBY_SAR', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201'),
('33333333-3333-3333-3333-333333333307', 'NCPOR-P07', 'Arjun Rathore', 'Sat-Comms & Telemetry Network Engineer', 'Telecommunications', '+91-98200-88991', 'a.rathore@ncpor.gov.in', 'HQ Support (+91-832-2525557)', 'ACTIVE_DUTY', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201'),
('33333333-3333-3333-3333-333333333308', 'NCPOR-P08', 'Tsering Dorjee', 'Lead Mountain Guide & SAR Navigator', 'Field Operations', '+91-98200-99001', 't.dorjee@ncpor.gov.in', 'Leh Base Camp (+91-1982-252000)', 'FIELD_TRAVERSE', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222201'),
('33333333-3333-3333-3333-333333333309', 'NCPOR-P09', 'Dr. Alok Banerjee', 'Arctic Oceanographer', 'Marine Sciences', '+91-98200-11331', 'a.banerjee@ncpor.gov.in', 'Kolkata Univ (+91-33-24146666)', 'ACTIVE_DUTY', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222202'),
('33333333-3333-3333-3333-333333333310', 'NCPOR-P10', 'Priya Kulkarni', 'Autonomous Glacier Drone Pilot', 'Instrumentation', '+91-98200-22441', 'p.kulkarni@ncpor.gov.in', 'Pune Base (+91-20-25690000)', 'ACTIVE_DUTY', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222202')
ON CONFLICT (id) DO NOTHING;

-- Insert 15 Assets
INSERT INTO public.assets (id, asset_code, qr_code, rfid_code, asset_name, category, description, serial_number, condition, status, current_location_id, expedition_id, purchase_date, last_maintenance_date, next_maintenance_date) VALUES
('44444444-4444-4444-4444-444444444401', 'AST-GEN-01', 'QR-POLARX-GEN-01', 'RFID-868-GEN-01', 'Main 500kVA Arctic Generator Unit A', 'Power Generation', 'Heavy diesel genset with dual-fuel intake and arctic winterization pre-heaters.', 'CUMMINS-QSK19-8821', 'OPTIMAL', 'OPERATIONAL', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '2023-03-10', '2026-08-15', '2026-11-15'),
('44444444-4444-4444-4444-444444444402', 'AST-GEN-02', 'QR-POLARX-GEN-02', 'RFID-868-GEN-02', 'Auxiliary 250kVA Generator Unit B', 'Power Generation', 'Emergency backup power generator with automated bus-tie synchronization.', 'VOLVO-PENTA-D13-412', 'GOOD', 'OPERATIONAL', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '2023-05-12', '2026-07-20', '2026-10-20'),
('44444444-4444-4444-4444-444444444403', 'AST-SNOW-01', 'QR-POLARX-SNOW-01', 'RFID-868-SNOW-01', 'PistenBully 300 Polar Snowcat', 'Surface Heavy Equipment', 'High-altitude rubber-tracked traverse vehicle with 8-ton towing hitch.', 'KASSBOHRER-PB300-994', 'GOOD', 'DEPLOYED_FIELD', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222201', '2022-11-04', '2026-06-10', '2026-12-10'),
('44444444-4444-4444-4444-444444444404', 'AST-SNOW-02', 'QR-POLARX-SNOW-02', 'RFID-868-SNOW-02', 'Prinoth Everest Heavy Ice Tractor', 'Surface Heavy Equipment', 'Heavy glacier dozer equipped with high-torque front blade and ice auger mount.', 'PRINOTH-EV-5510', 'FAIR', 'UNDER_MAINTENANCE', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '2021-08-19', '2026-09-01', '2026-10-01'),
('44444444-4444-4444-4444-444444444405', 'AST-LAB-01', 'QR-POLARX-LAB-01', 'RFID-868-LAB-01', 'Thermo Fisher Cryo-Microtome System', 'Scientific Core Instrumentation', 'Ultra-low temperature microtome for slicing sub-glacial ice core samples.', 'TF-CRYO-902-A', 'OPTIMAL', 'OPERATIONAL', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '2024-01-15', '2026-05-18', '2026-11-18'),
('44444444-4444-4444-4444-444444444406', 'AST-LAB-02', 'QR-POLARX-LAB-02', 'RFID-868-LAB-02', 'Picarro G2131-i Isotopic Carbon Analyzer', 'Scientific Core Instrumentation', 'Cavity Ring-Down Spectrometer for measuring CO2 and CH4 in polar air pockets.', 'PICARRO-CRDS-114', 'OPTIMAL', 'OPERATIONAL', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222202', '2024-04-20', '2026-06-01', '2026-12-01'),
('44444444-4444-4444-4444-444444444407', 'AST-MED-01', 'QR-POLARX-MED-01', 'RFID-868-MED-01', 'Zoll X Series Defibrillator & Trauma Monitor', 'Medical Bio-Lab', 'Military-grade vital signs monitor with telemetry link to naval telehealth.', 'ZOLL-X-99812', 'OPTIMAL', 'OPERATIONAL', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '2023-09-10', '2026-04-12', '2026-10-12'),
('44444444-4444-4444-4444-444444444408', 'AST-MED-02', 'QR-POLARX-MED-02', 'RFID-868-MED-02', 'Portable Hyperbaric Oxygen Chamber', 'Medical Bio-Lab', 'Inflatable soft-sided hyperbaric chamber for acute high-altitude & cold trauma.', 'OXY-POLAR-HP3', 'GOOD', 'OPERATIONAL', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222201', '2022-12-01', '2026-02-10', '2026-11-10'),
('44444444-4444-4444-4444-444444444409', 'AST-LIFE-01', 'QR-POLARX-LIFE-01', 'RFID-868-LIFE-01', 'Reverse Osmosis Snow Melter & Water Plant', 'Life Support Systems', 'High-efficiency thermal heat exchange water filtration plant yielding 4000L/day.', 'POLAR-RO-4000', 'OPTIMAL', 'OPERATIONAL', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '2023-02-14', '2026-08-01', '2026-12-01'),
('44444444-4444-4444-4444-444444444410', 'AST-VEH-01', 'QR-POLARX-VEH-01', 'RFID-868-VEH-01', 'Lynx Commander 900 ACE Expedition Snowmobile', 'Field Traverse Vehicles', 'Heavy-duty 4-stroke snowmobile with cargo sled hitch and survival kit pack.', 'BRP-LYNX-8819', 'OPTIMAL', 'DEPLOYED_FIELD', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222201', '2024-02-10', '2026-07-15', '2026-11-15'),
('44444444-4444-4444-4444-444444444411', 'AST-VEH-02', 'QR-POLARX-VEH-02', 'RFID-868-VEH-02', 'Yamaha VK Professional II Snowmobile', 'Field Traverse Vehicles', 'Utility dual-track work snowmobile with winch and GPS distress beacon.', 'YAM-VK-PRO-44', 'FAIR', 'OPERATIONAL', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222201', '2021-06-20', '2026-05-10', '2026-10-10'),
('44444444-4444-4444-4444-444444444412', 'AST-COM-01', 'QR-POLARX-COM-01', 'RFID-868-COM-01', 'Cobham Sailor 900 VSAT Dome Terminal', 'Communications Array', 'C-band/Ku-band stabilized satellite tracking radome for broadband telemetry.', 'COBHAM-S900-33', 'OPTIMAL', 'OPERATIONAL', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '2023-01-30', '2026-03-15', '2026-09-15'),
('44444444-4444-4444-4444-444444444413', 'AST-SAR-01', 'QR-POLARX-SAR-01', 'RFID-868-SAR-01', 'Crevasse Extrication Tripod & Winch System', 'Safety & SAR Gear', 'Certified 2.5-ton titanium tripod rescue kit with high-tensile aramid cables.', 'SAR-EXT-TITAN-1', 'OPTIMAL', 'OPERATIONAL', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '2024-03-01', '2026-01-10', '2027-01-10'),
('44444444-4444-4444-4444-444444444414', 'AST-DRONE-01', 'QR-POLARX-DRONE-01', 'RFID-868-DRONE-01', 'DJI Matrice 350 RTK Thermal Polar Drone', 'Scientific Core Instrumentation', 'Sub-zero rated quadcopter equipped with LiDAR and FLIR radiometric sensor.', 'DJI-M350-POLAR-9', 'OPTIMAL', 'OPERATIONAL', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222202', '2024-05-15', '2026-08-01', '2026-11-01'),
('44444444-4444-4444-4444-444444444415', 'AST-DRILL-01', 'QR-POLARX-DRILL-01', 'RFID-868-DRILL-01', 'Hans Tausen Intermediate Deep Ice Core Drill', 'Scientific Core Instrumentation', 'Electro-mechanical ice coring drill system capable of 500m core recovery.', 'HT-CORE-500M', 'GOOD', 'OPERATIONAL', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '2023-10-10', '2026-07-01', '2026-12-01')
ON CONFLICT (id) DO NOTHING;

-- Insert 10 Cargo Consignments
INSERT INTO public.cargo (id, cargo_code, expedition_id, origin, destination, carrier, transport_mode, departure_date, expected_arrival, status, weight, priority, manifest_url) VALUES
('55555555-5555-5555-5555-555555555501', 'CRG-2026-001', '22222222-2222-2222-2222-222222222201', 'Cape Town Port Hub', 'Bharati Research Station', 'SA Agulhas II Polar Vessel', 'POLAR_RESEARCH_VESSEL', '2026-11-05 08:00:00Z', '2026-11-20 14:00:00Z', 'IN_TRANSIT', 14500.0, 'HIGH', 'https://polarx.ncpor.gov.in/manifests/CRG-2026-001.pdf'),
('55555555-5555-5555-5555-555555555502', 'CRG-2026-002', '22222222-2222-2222-2222-222222222201', 'Goa NCPOR HQ', 'Cape Town Logistics Berth', 'Mediterranean Shipping Co', 'POLAR_RESEARCH_VESSEL', '2026-10-15 06:00:00Z', '2026-11-01 18:00:00Z', 'DELIVERED', 8200.0, 'STANDARD', 'https://polarx.ncpor.gov.in/manifests/CRG-2026-002.pdf'),
('55555555-5555-5555-5555-555555555503', 'CRG-2026-003', '22222222-2222-2222-2222-222222222201', 'Bharati Helipad', 'Larsemann Depot Delta', 'Kamov Ka-32 Helicopter', 'TWIN_OTTER_FLIGHT', '2026-11-22 09:30:00Z', '2026-11-22 11:00:00Z', 'MANIFESTED', 1200.0, 'CRITICAL', 'https://polarx.ncpor.gov.in/manifests/CRG-2026-003.pdf'),
('55555555-5555-5555-5555-555555555504', 'CRG-2026-004', '22222222-2222-2222-2222-222222222201', 'Bharati Base', 'Maitri Inland Station', 'PistenBully Traverse Train Alpha', 'SNOW_OVERLAND_TRAVERSE', '2026-12-01 04:00:00Z', '2026-12-08 19:00:00Z', 'MANIFESTED', 18500.0, 'HIGH', 'https://polarx.ncpor.gov.in/manifests/CRG-2026-004.pdf'),
('55555555-5555-5555-5555-555555555505', 'CRG-2026-005', '22222222-2222-2222-2222-222222222202', 'Oslo Gardermoen Cargo', 'Longyearbyen Airstrip', 'SAS Polar Cargo 737-800', 'SKI_AIRCRAFT_LC130', '2026-06-10 10:00:00Z', '2026-06-10 14:30:00Z', 'DELIVERED', 2400.0, 'STANDARD', 'https://polarx.ncpor.gov.in/manifests/CRG-2026-005.pdf'),
('55555555-5555-5555-5555-555555555506', 'CRG-2026-006', '22222222-2222-2222-2222-222222222202', 'Longyearbyen Port', 'Himadri Base Marine Jetty', 'MS Polarsyssel Fjord Patrol', 'POLAR_RESEARCH_VESSEL', '2026-06-12 07:00:00Z', '2026-06-12 18:00:00Z', 'DELIVERED', 3100.0, 'STANDARD', 'https://polarx.ncpor.gov.in/manifests/CRG-2026-006.pdf'),
('55555555-5555-5555-5555-555555555507', 'CRG-2026-007', '22222222-2222-2222-2222-222222222201', 'Cape Town Logistics Berth', 'Bharati Research Station', 'Vasiliy Golovnin Icebreaker', 'ICEBREAKER_CONVOY', '2026-11-10 12:00:00Z', '2026-11-28 16:00:00Z', 'IN_TRANSIT', 32000.0, 'HIGH', 'https://polarx.ncpor.gov.in/manifests/CRG-2026-007.pdf'),
('55555555-5555-5555-5555-555555555508', 'CRG-2026-008', '22222222-2222-2222-2222-222222222201', 'Maitri Airfield Drop Point', 'Maitri Research Base', 'Basler BT-67 Ski Aircraft', 'TWIN_OTTER_FLIGHT', '2026-11-18 11:00:00Z', '2026-11-18 13:30:00Z', 'MANIFESTED', 1800.0, 'CRITICAL', 'https://polarx.ncpor.gov.in/manifests/CRG-2026-008.pdf'),
('55555555-5555-5555-5555-555555555509', 'CRG-2026-009', '22222222-2222-2222-2222-222222222201', 'Larsemann Depot Delta', 'Bharati Base Workshop', 'Overland Sled Convoy Bravo', 'SNOW_OVERLAND_TRAVERSE', '2026-11-15 08:00:00Z', '2026-11-15 16:00:00Z', 'UNLOADED', 4500.0, 'STANDARD', 'https://polarx.ncpor.gov.in/manifests/CRG-2026-009.pdf'),
('55555555-5555-5555-5555-555555555510', 'CRG-2026-010', '22222222-2222-2222-2222-222222222202', 'Tromsø Polar Lab', 'Himadri Station', 'Air Greenland Charter', 'TWIN_OTTER_FLIGHT', '2026-07-01 09:00:00Z', '2026-07-01 15:00:00Z', 'MANIFESTED', 950.0, 'ROUTINE', 'https://polarx.ncpor.gov.in/manifests/CRG-2026-010.pdf')
ON CONFLICT (id) DO NOTHING;

-- Insert Cargo Items
INSERT INTO public.cargo_items (id, cargo_id, asset_id, item_name, category, quantity, unit, weight, condition) VALUES
('66666666-6666-6666-6666-666666666601', '55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444401', 'Main Genset Replacement Fuel Injectors', 'Power Generation', 12, 'sets', 120.0, 'CRATE_SEALED'),
('66666666-6666-6666-6666-666666666602', '55555555-5555-5555-5555-555555555501', NULL, 'Polar Special Fuel Drums (Jet A-1 / Arctic)', 'Polar Fuel & Lubricants', 40, 'drums', 8000.0, 'CERTIFIED_CONTAINER'),
('66666666-6666-6666-6666-666666666603', '55555555-5555-5555-5555-555555555503', '44444444-4444-4444-4444-444444444407', 'Emergency Cardiac Trauma Drugs & Blood Plasma', 'Medical & Pharmaceuticals', 8, 'cases', 95.0, 'TEMP_CONTROLLED_COOLER')
ON CONFLICT (id) DO NOTHING;

-- Insert 20 Inventory Items
INSERT INTO public.inventory (id, location_id, expedition_id, item_code, item_name, category, quantity, unit, minimum_quantity, maximum_quantity, consumption_rate, last_updated) VALUES
('77777777-7777-7777-7777-777777777701', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 'INV-FUEL-001', 'Arctic Grade Jet A-1 Fuel (Main Genset)', 'Polar Fuel & Lubricants', 42000, 'Liters', 15000, 60000, 320.0, now()),
('77777777-7777-7777-7777-777777777702', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 'INV-FUEL-002', 'Synthetic Low-Temp Engine Lubricant 0W-30', 'Polar Fuel & Lubricants', 850, 'Liters', 300, 1500, 4.5, now()),
('77777777-7777-7777-7777-777777777703', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 'INV-RAT-001', 'Freeze-Dried High-Calorie Polar Rations', 'Rations & Provisions', 1450, 'Packs', 500, 2500, 18.0, now()),
('77777777-7777-7777-7777-777777777704', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 'INV-RAT-002', 'Canned Protein & Vacuum-Packed Meats', 'Rations & Provisions', 620, 'Kilograms', 250, 1000, 5.2, now()),
('77777777-7777-7777-7777-777777777705', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 'INV-MED-001', 'Medical Oxygen Cylinders (50L / 200 Bar)', 'Medical & Pharmaceuticals', 14, 'Cylinders', 8, 30, 0.15, now()),
('77777777-7777-7777-7777-777777777706', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 'INV-MED-002', 'Broad Spectrum IV Antibiotics & Analgesics', 'Medical & Pharmaceuticals', 180, 'Vials', 60, 300, 1.2, now()),
('77777777-7777-7777-7777-777777777707', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 'INV-MED-003', 'Frostbite Treatment & Vasodilator Injectables', 'Medical & Pharmaceuticals', 45, 'Kits', 20, 100, 0.4, now()),
('77777777-7777-7777-7777-777777777708', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 'INV-SPARE-001', 'PistenBully Heavy Track Grousers & Pins', 'Mechanical & Spares', 36, 'Units', 20, 80, 0.3, now()),
('77777777-7777-7777-7777-777777777709', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 'INV-SPARE-002', 'Arctic Alternator & Starter Motors 24V', 'Mechanical & Spares', 6, 'Units', 3, 12, 0.05, now()),
('77777777-7777-7777-7777-777777777710', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 'INV-SCI-001', 'Ice Core Polycarbonate Storage Tubes (1m)', 'Scientific Reagents & Core Kits', 240, 'Tubes', 100, 500, 3.5, now()),
('77777777-7777-7777-7777-777777777711', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 'INV-SCI-002', 'Ultra-Pure Deionized Water & Buffer Ampoules', 'Scientific Reagents & Core Kits', 120, 'Liters', 40, 200, 1.0, now()),
('77777777-7777-7777-7777-777777777712', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 'INV-SURV-001', 'Extreme Cold -50°C Down Parka & Bib Overalls', 'Survival & Cold Weather Gear', 28, 'Suits', 15, 50, 0.1, now()),
('77777777-7777-7777-7777-777777777713', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 'INV-SURV-002', 'Kevlar Crevasse Rescue Harnesses & Ropes', 'Survival & Cold Weather Gear', 18, 'Sets', 10, 35, 0.05, now()),
('77777777-7777-7777-7777-777777777714', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222201', 'INV-FUEL-003', 'Maitri Reserve Diesel Fuel Tank Block', 'Polar Fuel & Lubricants', 19500, 'Liters', 8000, 30000, 160.0, now()),
('77777777-7777-7777-7777-777777777715', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222201', 'INV-RAT-003', 'Hydroponic Vitamin Nutrient Salt Concentrates', 'Rations & Provisions', 85, 'Kilograms', 30, 150, 0.8, now()),
('77777777-7777-7777-7777-777777777716', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222202', 'INV-ARC-001', 'Himadri Station Bio-Safe Heating Pellets', 'Polar Fuel & Lubricants', 4800, 'Kilograms', 1500, 8000, 45.0, now()),
('77777777-7777-7777-7777-777777777717', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222202', 'INV-ARC-002', 'Arctic Marine Plankton Sampling Nets (200µm)', 'Scientific Reagents & Core Kits', 12, 'Units', 5, 25, 0.1, now()),
('77777777-7777-7777-7777-777777777718', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222201', 'INV-DEPOT-001', 'Depot Delta Field Emergency Survival Rations', 'Rations & Provisions', 320, 'Packs', 120, 600, 2.0, now()),
('77777777-7777-7777-7777-777777777719', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222201', 'INV-DEPOT-002', 'Emergency Snowcat Drum Fuel (Jet A-1)', 'Polar Fuel & Lubricants', 7800, 'Liters', 4000, 12000, 80.0, now()),
('77777777-7777-7777-7777-777777777720', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 'INV-SPARE-003', 'High-Gain Iridium Sat-Phone Rechargeable Batteries', 'Communications Array', 19, 'Units', 12, 40, 0.2, now())
ON CONFLICT (id) DO NOTHING;

-- Insert Inventory Transactions
INSERT INTO public.inventory_transactions (id, inventory_id, transaction_type, quantity, previous_quantity, new_quantity, reason) VALUES
('88888888-8888-8888-8888-888888888801', '77777777-7777-7777-7777-777777777701', 'CONSUME', 320, 42320, 42000, 'Daily 24-hr station power generation consumption'),
('88888888-8888-8888-8888-888888888802', '77777777-7777-7777-7777-777777777703', 'CONSUME', 18, 1468, 1450, 'Winter-over team galley disbursement'),
('88888888-8888-8888-8888-888888888803', '77777777-7777-7777-7777-777777777708', 'CONSUME', 2, 38, 36, 'PistenBully track replacement overhaul')
ON CONFLICT (id) DO NOTHING;

-- Insert Asset Movements
INSERT INTO public.asset_movements (id, asset_id, from_location_id, to_location_id, movement_type, latitude, longitude) VALUES
('99999999-9999-9999-9999-999999999901', '44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111104', 'FIELD_DEPLOYMENT', -69.4120, 76.2200),
('99999999-9999-9999-9999-999999999902', '44444444-4444-4444-4444-444444444410', '11111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111104', 'DISPATCH', -69.4120, 76.2200)
ON CONFLICT (id) DO NOTHING;

-- Insert Maintenance Records
INSERT INTO public.maintenance_records (id, asset_id, maintenance_type, description, maintenance_date, next_due_date, cost, status) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', 'SCHEDULED_PM', '500-hour oil & fuel filter replacement, valve lash adjustment, turbo check.', '2026-08-15', '2026-11-15', 1250.0, 'COMPLETED'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', '44444444-4444-4444-4444-444444444404', 'EMERGENCY_REPAIR', 'Hydraulic track tensioner seal blown during -42C cold start.', '2026-09-01', '2026-10-01', 3400.0, 'IN_PROGRESS')
ON CONFLICT (id) DO NOTHING;

-- Insert 3 Emergency Incidents
INSERT INTO public.emergency_incidents (id, incident_code, expedition_id, incident_type, severity, title, description, location_id, latitude, longitude, status, reported_at) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'EMG-2026-001', '22222222-2222-2222-2222-222222222201', 'CREVASSE_FALL', 'CRITICAL', 'Field Traverse Snowcat Sled Track Breach', 'Rear sled of traverse team slipped into concealed 18m crevasse 14km south-west of Depot Delta. 2 personnel secured on belay ropes; extraction winch active.', '11111111-1111-1111-1111-111111111104', -69.4520, 76.1100, 'SAR_DEPLOYED', now() - interval '2 hours'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'EMG-2026-002', '22222222-2222-2222-2222-222222222201', 'BLIZZARD_WHITEOUT_ISOLATION', 'WARNING', 'Sudden Catabatic Storm Warning (Wind gusts > 95 kts)', 'Larsemann Hills sector under Condition 1 whiteout. All field sorties recalled to Bharati Base. Emergency shelter heaters running on backup loop.', '11111111-1111-1111-1111-111111111101', -69.4069, 76.1950, 'ACTIVE', now() - interval '5 hours'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'EMG-2026-003', '22222222-2222-2222-2222-222222222202', 'MEDICAL_TRAUMA', 'WARNING', 'Acute Hypothermic Frostnip Grade 2 in Fjord Sortie', 'Field glaciologist reported severe numbness and localized tissue freezing during glacier runoff collection.', '11111111-1111-1111-1111-111111111103', 78.9236, 11.9272, 'CONTAINED', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert Emergency Resources
INSERT INTO public.emergency_resources (id, incident_id, resource_type, resource_name, quantity, assigned_to, status) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'PERSONNEL', 'Tsering Dorjee (SAR Lead Navigator)', 1, 'Crevasse Extrication Team A', 'ON_SCENE'),
('cccccccc-cccc-cccc-cccc-cccccccccccb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'SAR_EQUIPMENT', 'Titanium Rescue Tripod & 2.5T Winch', 1, 'Crevasse Extrication Team A', 'ON_SCENE'),
('cccccccc-cccc-cccc-cccc-ccccccccccc0', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'VEHICLE', 'Lynx Commander 900 ACE (Med-Evac Sled)', 1, 'Dr. Meera Nambiar', 'EN_ROUTE')
ON CONFLICT (id) DO NOTHING;

-- Insert Alerts
INSERT INTO public.alerts (id, alert_type, severity, title, message, entity_type, entity_id, expedition_id, status) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddd01', 'DEFCON_EMERGENCY_ESCALATION', 'CRITICAL', 'SAR Alert: Active Crevasse Extraction In Progress', 'Incident EMG-2026-001 active near Depot Delta. SAR Team A on scene with titanium hoist.', 'emergency_incidents', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', '22222222-2222-2222-2222-222222222201', 'ACTIVE'),
('dddddddd-dddd-dddd-dddd-dddddddddd02', 'LOW_STOCK_DEPLETION', 'WARNING', 'PistenBully Track Grousers Below Safe Threshold', 'Current count is 36 units against threshold of 20 with heavy traverse scheduled.', 'inventory', '77777777-7777-7777-7777-777777777708', '22222222-2222-2222-2222-222222222201', 'ACTIVE'),
('dddddddd-dddd-dddd-dddd-dddddddddd03', 'WEATHER_ANOMALY', 'WARNING', 'Condition 1 Blizzard Approaching Larsemann Hills', 'Catabatic wind gusts exceeding 95 knots predicted within 3 hours. All field movement restricted.', 'locations', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 'ACTIVE'),
('dddddddd-dddd-dddd-dddd-dddddddddd04', 'MAINTENANCE_OVERDUE', 'INFO', 'Generator B Scheduled PM Check Due Soon', 'Volvo-Penta 250kVA genset requires 500-hr lubrication check in 28 days.', 'assets', '44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222201', 'ACKNOWLEDGED')
ON CONFLICT (id) DO NOTHING;

-- Insert AI Insights
INSERT INTO public.ai_insights (id, expedition_id, insight_type, title, description, recommendation, confidence, severity, status) VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01', '22222222-2222-2222-2222-222222222201', 'CONSUMPTION_FORECAST', 'Jet A-1 Fuel Consumption Projection: 131 Days Autonomy Remaining', 'At current burn rate of 320L/day for station heating and genset load, stock of 42,000L provides 131 days remaining before reaching 15,000L minimum buffer.', 'Schedule Agulhas II tanker top-up during Voyage 2 window (Jan 2027) to maintain safety buffer through polar winter.', 0.94, 'INFO', 'NEW'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02', '22222222-2222-2222-2222-222222222201', 'MAINTENANCE_PREDICTION', 'Snowcat Track Tensioner Wear Degradation in Low Temperatures', 'Prinoth Everest dozer experienced early seal fatigue at -42°C. Fleet telemetry indicates PistenBully 300 may suffer similar seal degradation after 140km traverse.', 'Pre-heat hydraulic oil circuit to minimum -15°C prior to traverse start and dispatch 2 replacement seal kits.', 0.88, 'WARNING', 'NEW'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03', '22222222-2222-2222-2222-222222222202', 'ROUTE_OPTIMIZATION', 'Kongsfjorden Fjord Ice Thickness Favorable for Direct Boat Sortie', 'Satellite radar backscatter shows 85% open lead water between Ny-Ålesund and glacier terminus, reducing traverse time by 4 hours.', 'Divert Marine Sortie Delta along coastal lead rather than inland snowmobile trail.', 0.91, 'INFO', 'NEW')
ON CONFLICT (id) DO NOTHING;

-- Insert Initial Activity Logs
INSERT INTO public.activity_logs (id, action, entity_type, entity_id, new_data, device_id) VALUES
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'INITIAL_SYSTEM_BOOT', 'system', NULL, '{"status": "ONLINE", "mode": "POLARX_DUAL_STORE", "version": "2.4.0"}', 'TERMINAL_BHARATI_01'),
('ffffffff-ffff-ffff-ffff-fffffffffffe', 'EMERGENCY_DISPATCH', 'emergency_incidents', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', '{"incidentCode": "EMG-2026-001", "action": "SAR_TEAM_DEPLOYED"}', 'SAR_CONSOLE_01')
ON CONFLICT (id) DO NOTHING;
