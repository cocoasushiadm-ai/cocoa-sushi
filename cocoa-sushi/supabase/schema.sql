-- ============================================================
-- COCOA SUSHI — SISTEMA DE RESERVAS — SCHEMA COMPLETO
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Perfiles de administradores (vinculados a auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','manager','staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mesas
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  location TEXT NOT NULL CHECK (location IN ('terraza','salon')),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','blocked')),
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  total_reservations INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reservas
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_code TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  table_id UUID REFERENCES tables(id),
  date DATE NOT NULL,
  reserved_time TIME NOT NULL,
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  location TEXT NOT NULL CHECK (location IN ('terraza','salon')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','arrived','no_show','finished','cancelled')),
  source TEXT NOT NULL DEFAULT 'web'
    CHECK (source IN ('web','whatsapp','instagram','phone','admin','presencial')),
  special_request TEXT,
  occasion TEXT,
  internal_notes TEXT,
  confirmed_at TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  expected_release_time TIMESTAMPTZ,
  actual_release_time TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  no_show_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Historial de cambios
CREATE TABLE reservation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  details JSONB DEFAULT '{}',
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bloqueos de fechas/horarios
CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT CHECK (location IN ('terraza','salon')),
  table_id UUID REFERENCES tables(id),
  reason TEXT NOT NULL DEFAULT 'cerrado',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuración
CREATE TABLE restaurant_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Índices
CREATE INDEX idx_res_date ON reservations(date);
CREATE INDEX idx_res_status ON reservations(status);
CREATE INDEX idx_res_table_date ON reservations(table_id, date);
CREATE INDEX idx_res_code ON reservations(reservation_code);
CREATE INDEX idx_blocked_date ON blocked_dates(date);
CREATE INDEX idx_cust_phone ON customers(phone);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_res_updated BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tbl_updated BEFORE UPDATE ON tables FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_cust_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Generar código de reserva
CREATE OR REPLACE FUNCTION generate_reservation_code(p_date DATE)
RETURNS TEXT AS $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*)+1 INTO v_count FROM reservations WHERE date = p_date;
  RETURN 'CS-' || TO_CHAR(p_date,'YYYYMMDD') || '-' || LPAD(v_count::TEXT,3,'0');
END; $$ LANGUAGE plpgsql;

-- Verificar disponibilidad de mesa
CREATE OR REPLACE FUNCTION is_table_available(
  p_table_id UUID, p_date DATE, p_time TIME,
  p_duration_minutes INTEGER DEFAULT 150,
  p_exclude_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end   TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  v_start := (p_date::TEXT||' '||p_time::TEXT)::TIMESTAMP AT TIME ZONE 'America/Costa_Rica';
  v_end   := v_start + (p_duration_minutes||' minutes')::INTERVAL;
  SELECT COUNT(*) INTO v_count FROM reservations r
  WHERE r.table_id = p_table_id AND r.date = p_date
    AND r.status NOT IN ('cancelled','no_show','finished')
    AND (p_exclude_id IS NULL OR r.id != p_exclude_id)
    AND COALESCE(r.arrival_time,
        (r.date::TEXT||' '||r.reserved_time::TEXT)::TIMESTAMP AT TIME ZONE 'America/Costa_Rica'
        ) < v_end
    AND COALESCE(r.expected_release_time,
        (r.date::TEXT||' '||r.reserved_time::TEXT)::TIMESTAMP AT TIME ZONE 'America/Costa_Rica'
        + (p_duration_minutes||' minutes')::INTERVAL
        ) > v_start;
  RETURN v_count = 0;
END; $$ LANGUAGE plpgsql;

-- Liberar mesas automáticamente (llamar con pg_cron o endpoint)
CREATE OR REPLACE FUNCTION auto_release_tables() RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE reservations SET status='finished', actual_release_time=NOW()
  WHERE status='arrived' AND expected_release_time <= NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO reservation_history(reservation_id,action,previous_status,new_status,details)
  SELECT id,'auto_finished','arrived','finished',
         jsonb_build_object('released_at',actual_release_time)
  FROM reservations
  WHERE status='finished' AND actual_release_time >= NOW()-INTERVAL'5 minutes'
    AND actual_release_time <= NOW();
  RETURN v_count;
END; $$ LANGUAGE plpgsql;

-- RLS: solo service_role (API) y auth (admins lectores)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all" ON profiles FOR ALL TO service_role USING (true);
CREATE POLICY "service_all" ON tables FOR ALL TO service_role USING (true);
CREATE POLICY "service_all" ON customers FOR ALL TO service_role USING (true);
CREATE POLICY "service_all" ON reservations FOR ALL TO service_role USING (true);
CREATE POLICY "service_all" ON reservation_history FOR ALL TO service_role USING (true);
CREATE POLICY "service_all" ON blocked_dates FOR ALL TO service_role USING (true);
CREATE POLICY "service_all" ON restaurant_settings FOR ALL TO service_role USING (true);

CREATE POLICY "auth_read_tables" ON tables FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_res" ON reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_cust" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_hist" ON reservation_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_sets" ON restaurant_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_blk" ON blocked_dates FOR SELECT TO authenticated USING (true);

