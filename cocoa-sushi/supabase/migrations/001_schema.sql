-- ============================================================
--  COCOA SUSHI — Esquema completo PostgreSQL (Supabase)
--  Zona horaria: America/Costa_Rica (UTC-6, sin DST)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- pg_cron se habilita en Supabase: Database > Extensions > pg_cron

-- ─── 1. CONFIGURACIÓN ────────────────────────────────────────
CREATE TABLE restaurant_settings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT UNIQUE NOT NULL,
  value       JSONB NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO restaurant_settings (key, value, description) VALUES
('general',       '{"name":"Cocoa Sushi","address":"Barrio El Hoyón, San Isidro del General, Costa Rica","phone":"+506 2771-0000","whatsapp":"+506 8888-0000","instagram":"@cocoa.sushi.cr"}', 'Info general'),
('hours',         '{"monday":{"open":false},"tuesday":{"open":false},"wednesday":{"open":true,"from":"12:00","to":"21:30"},"thursday":{"open":true,"from":"12:00","to":"21:30"},"friday":{"open":true,"from":"12:00","to":"22:00"},"saturday":{"open":true,"from":"12:00","to":"22:00"},"sunday":{"open":true,"from":"12:00","to":"21:00"}}', 'Horarios'),
('reservations', '{"duration_minutes":150,"tolerance_minutes":15,"max_party_size":20,"min_advance_hours":1,"max_advance_days":60,"slot_interval_minutes":30,"noshow_auto":true}', 'Config de reservas'),
('notifications','{"confirm_whatsapp":true,"confirm_email":false,"reminder_hours":2,"reminder_whatsapp":true}', 'Notificaciones');

-- ─── 2. ADMIN USERS ──────────────────────────────────────────
CREATE TABLE admin_users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','manager','staff')),
  auth_id    UUID UNIQUE,
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. MESAS ────────────────────────────────────────────────
CREATE TABLE tables (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code       TEXT UNIQUE NOT NULL,
  location   TEXT NOT NULL CHECK (location IN ('terraza','salon')),
  capacity   INT NOT NULL CHECK (capacity > 0),
  status     TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','blocked')),
  notes      TEXT,
  sort_order INT DEFAULT 0,
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO tables (code, location, capacity, sort_order) VALUES
('T01','terraza',2,1),('T02','terraza',2,2),
('T03','terraza',4,3),('T04','terraza',4,4),
('T05','terraza',6,5),('T06','terraza',8,6),
('S01','salon',2,7),('S02','salon',2,8),
('S03','salon',4,9),('S04','salon',4,10),
('S05','salon',6,11),('S06','salon',8,12);

-- ─── 4. FECHAS BLOQUEADAS ────────────────────────────────────
CREATE TABLE blocked_dates (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date       DATE NOT NULL,
  time_from  TIME,
  time_to    TIME,
  location   TEXT CHECK (location IN ('terraza','salon','all')),
  table_id   UUID REFERENCES tables(id) ON DELETE CASCADE,
  reason     TEXT,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. CLIENTES ─────────────────────────────────────────────
CREATE TABLE customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  notes       TEXT,
  visit_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone)
);

-- ─── 6. RESERVAS ─────────────────────────────────────────────
CREATE TABLE reservations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_code      TEXT UNIQUE NOT NULL,
  customer_id           UUID REFERENCES customers(id),
  date                  DATE NOT NULL,
  reserved_time         TIME NOT NULL,
  party_size            INT NOT NULL CHECK (party_size > 0),
  location              TEXT NOT NULL CHECK (location IN ('terraza','salon')),
  table_id              UUID REFERENCES tables(id),
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','arrived','finished','cancelled','noshow')),
  arrival_time          TIMESTAMPTZ,
  expected_release_time TIMESTAMPTZ,
  actual_release_time   TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancel_reason         TEXT,
  noshow_at             TIMESTAMPTZ,
  source                TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web','whatsapp','instagram','phone','presencial','admin')),
  special_request       TEXT,
  occasion              TEXT,
  admin_notes           TEXT,
  created_by            UUID REFERENCES admin_users(id),
  confirmed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_res_date       ON reservations(date);
CREATE INDEX idx_res_table_date ON reservations(table_id, date);
CREATE INDEX idx_res_status     ON reservations(status);
CREATE INDEX idx_res_code       ON reservations(reservation_code);

-- ─── 7. HISTORIAL ────────────────────────────────────────────
CREATE TABLE reservation_history (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  action         TEXT NOT NULL,
  old_values     JSONB,
  new_values     JSONB,
  performed_by   UUID REFERENCES admin_users(id),
  performed_at   TIMESTAMPTZ DEFAULT NOW(),
  notes          TEXT
);

-- ─── 8. NOTIFICACIONES ───────────────────────────────────────
CREATE TABLE notifications (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  type           TEXT NOT NULL,
  channel        TEXT NOT NULL,
  recipient      TEXT NOT NULL,
  message        TEXT,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  sent_at        TIMESTAMPTZ,
  error          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 9. FUNCIONES ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_reservation_code(p_date DATE) RETURNS TEXT AS $$
DECLARE v_ds TEXT; v_n INT; BEGIN
  v_ds := TO_CHAR(p_date, 'YYYYMMDD');
  SELECT COUNT(*)+1 INTO v_n FROM reservations WHERE reservation_code LIKE 'CS-'||v_ds||'-%';
  RETURN 'CS-'||v_ds||'-'||LPAD(v_n::TEXT,4,'0');
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_table_available(
  p_table_id UUID, p_date DATE, p_time TIME,
  p_duration_min INT DEFAULT 150, p_exclude_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE v_start TIMESTAMPTZ; v_end TIMESTAMPTZ; v_count INT; BEGIN
  v_start := (p_date||CHR(32)||p_time)::TIMESTAMPTZ AT TIME ZONE 'America/Costa_Rica';
  v_end   := v_start + (p_duration_min||CHR(32)||'minutes')::INTERVAL;
  SELECT COUNT(*) INTO v_count FROM reservations r
  WHERE r.table_id = p_table_id AND r.date = p_date
    AND r.status NOT IN ('cancelled','noshow','finished')
    AND (p_exclude_id IS NULL OR r.id != p_exclude_id)
    AND (p_date||CHR(32)||r.reserved_time)::TIMESTAMPTZ AT TIME ZONE 'America/Costa_Rica' < v_end
    AND (p_date||CHR(32)||r.reserved_time)::TIMESTAMPTZ AT TIME ZONE 'America/Costa_Rica'
        + (p_duration_min||CHR(32)||'minutes')::INTERVAL > v_start;
  RETURN v_count = 0;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_reservation(
  p_customer_name TEXT, p_customer_phone TEXT, p_customer_email TEXT,
  p_date DATE, p_time TIME, p_party_size INT, p_location TEXT,
  p_table_id UUID, p_source TEXT DEFAULT 'web',
  p_special_request TEXT DEFAULT NULL, p_occasion TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_cust_id UUID; v_res reservations%ROWTYPE; v_code TEXT; v_dur INT;
BEGIN
  SELECT (value->>'duration_minutes')::INT INTO v_dur FROM restaurant_settings WHERE key='reservations';
  v_dur := COALESCE(v_dur, 150);
  PERFORM 1 FROM tables WHERE id = p_table_id FOR UPDATE NOWAIT;
  IF NOT is_table_available(p_table_id, p_date, p_time, v_dur) THEN
    RETURN jsonb_build_object('success',false,'error','Mesa no disponible para ese horario');
  END IF;
  INSERT INTO customers (name,phone,email) VALUES (p_customer_name,p_customer_phone,p_customer_email)
  ON CONFLICT (phone) DO UPDATE SET name=EXCLUDED.name,email=COALESCE(EXCLUDED.email,customers.email),visit_count=customers.visit_count+1
  RETURNING id INTO v_cust_id;
  v_code := generate_reservation_code(p_date);
  INSERT INTO reservations (reservation_code,customer_id,date,reserved_time,party_size,location,table_id,status,source,special_request,occasion,created_by,confirmed_at)
  VALUES (v_code,v_cust_id,p_date,p_time,p_party_size,p_location,p_table_id,'confirmed',p_source,p_special_request,p_occasion,p_created_by,NOW())
  RETURNING * INTO v_res;
  INSERT INTO reservation_history(reservation_id,action,new_values,performed_by)
  VALUES(v_res.id,'created',jsonb_build_object('code',v_code,'table',p_table_id,'date',p_date,'time',p_time),p_created_by);
  RETURN jsonb_build_object('success',true,'reservation_id',v_res.id,'reservation_code',v_code,'customer_id',v_cust_id);
EXCEPTION
  WHEN lock_not_available THEN RETURN jsonb_build_object('success',false,'error','Mesa siendo reservada simultáneamente. Intentá de nuevo.');
  WHEN OTHERS THEN RETURN jsonb_build_object('success',false,'error',SQLERRM);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_arrival(p_reservation_id UUID, p_admin_id UUID DEFAULT NULL) RETURNS JSONB AS $$
DECLARE v_res reservations%ROWTYPE; v_dur INT; v_arr TIMESTAMPTZ; v_rel TIMESTAMPTZ; BEGIN
  SELECT * INTO v_res FROM reservations WHERE id=p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Reserva no encontrada'); END IF;
  IF v_res.status NOT IN ('pending','confirmed') THEN RETURN jsonb_build_object('success',false,'error','Estado inválido: '||v_res.status); END IF;
  SELECT (value->>'duration_minutes')::INT INTO v_dur FROM restaurant_settings WHERE key='reservations';
  v_dur:=COALESCE(v_dur,150); v_arr:=NOW(); v_rel:=v_arr+(v_dur||CHR(32)||'minutes')::INTERVAL;
  UPDATE reservations SET status='arrived',arrival_time=v_arr,expected_release_time=v_rel,updated_at=NOW() WHERE id=p_reservation_id;
  INSERT INTO reservation_history(reservation_id,action,new_values,performed_by) VALUES(p_reservation_id,'arrived',jsonb_build_object('arrival_time',v_arr,'expected_release',v_rel),p_admin_id);
  RETURN jsonb_build_object('success',true,'arrival_time',v_arr,'release_time',v_rel);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION finish_reservation(p_reservation_id UUID, p_admin_id UUID DEFAULT NULL) RETURNS JSONB AS $$
BEGIN
  UPDATE reservations SET status='finished',actual_release_time=NOW(),updated_at=NOW() WHERE id=p_reservation_id AND status='arrived';
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Reserva no está en estado arrived'); END IF;
  INSERT INTO reservation_history(reservation_id,action,new_values,performed_by) VALUES(p_reservation_id,'finished',jsonb_build_object('released_at',NOW()),p_admin_id);
  RETURN jsonb_build_object('success',true);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_noshow(p_reservation_id UUID, p_admin_id UUID DEFAULT NULL) RETURNS JSONB AS $$
BEGIN
  UPDATE reservations SET status='noshow',noshow_at=NOW(),updated_at=NOW() WHERE id=p_reservation_id AND status IN ('pending','confirmed');
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','No se puede marcar No Show'); END IF;
  INSERT INTO reservation_history(reservation_id,action,new_values,performed_by) VALUES(p_reservation_id,'noshow',jsonb_build_object('noshow_at',NOW()),p_admin_id);
  RETURN jsonb_build_object('success',true);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 10. AUTO-RELEASE (cron job) ─────────────────────────────
CREATE OR REPLACE FUNCTION auto_release_tables() RETURNS void AS $$
DECLARE v_tol INT; v_auto BOOL; BEGIN
  SELECT (value->>'tolerance_minutes')::INT INTO v_tol FROM restaurant_settings WHERE key='reservations'; v_tol:=COALESCE(v_tol,15);
  SELECT (value->>'noshow_auto')::BOOL   INTO v_auto FROM restaurant_settings WHERE key='reservations';
  UPDATE reservations SET status='finished',actual_release_time=NOW(),updated_at=NOW() WHERE status='arrived' AND expected_release_time < NOW();
  IF v_auto THEN
    WITH ns AS (
      UPDATE reservations SET status='noshow',noshow_at=NOW(),updated_at=NOW()
      WHERE status IN ('pending','confirmed')
        AND (date::TEXT||CHR(32)||reserved_time::TEXT)::TIMESTAMPTZ AT TIME ZONE 'America/Costa_Rica'+(v_tol||CHR(32)||'minutes')::INTERVAL < NOW()
      RETURNING id
    )
    INSERT INTO reservation_history(reservation_id,action,new_values) SELECT id,'noshow',jsonb_build_object('auto',true) FROM ns;
  END IF;
END; $$ LANGUAGE plpgsql;

-- Registrar cron job (descomentar en producción después de habilitar pg_cron)
-- SELECT cron.schedule('auto-release', '* * * * *', 'SELECT auto_release_tables()');

-- ─── 11. TRIGGER updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION upd_ts() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at=NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_res_upd BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION upd_ts();

-- ─── 12. VISTA ESTADO DE MESAS ───────────────────────────────
CREATE OR REPLACE VIEW v_table_status AS
SELECT t.id, t.code, t.location, t.capacity, t.notes, t.sort_order,
  CASE WHEN t.status='blocked' THEN 'blocked'
       WHEN r.id IS NOT NULL AND r.status='arrived' THEN 'occupied'
       WHEN r.id IS NOT NULL THEN 'reserved'
       ELSE 'available' END AS current_status,
  r.id AS reservation_id, r.reservation_code, r.customer_name,
  r.party_size, r.reserved_time, r.arrival_time, r.expected_release_time
FROM tables t
LEFT JOIN LATERAL (
  SELECT r2.id, r2.reservation_code, r2.status, r2.party_size,
         r2.reserved_time, r2.arrival_time, r2.expected_release_time,
         c.name AS customer_name
  FROM reservations r2 JOIN customers c ON c.id=r2.customer_id
  WHERE r2.table_id=t.id AND r2.date=(CURRENT_TIMESTAMP AT TIME ZONE 'America/Costa_Rica')::DATE
    AND r2.status NOT IN ('cancelled','noshow','finished')
  ORDER BY r2.reserved_time LIMIT 1
) r ON true
WHERE t.active=true ORDER BY t.sort_order;

-- ─── 13. RLS ─────────────────────────────────────────────────
ALTER TABLE reservations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables              ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;

-- Lectura pública para disponibilidad
CREATE POLICY "public_read_tables"    ON tables              FOR SELECT USING (active=true);
CREATE POLICY "public_read_settings"  ON restaurant_settings FOR SELECT USING (true);
CREATE POLICY "public_read_blocked"   ON blocked_dates       FOR SELECT USING (true);

-- Administradores (autenticados con Supabase Auth) tienen acceso total
CREATE POLICY "admin_all_reservations" ON reservations       FOR ALL USING (auth.role()='authenticated');
CREATE POLICY "admin_all_customers"    ON customers          FOR ALL USING (auth.role()='authenticated');
CREATE POLICY "admin_all_tables"       ON tables             FOR ALL USING (auth.role()='authenticated');
CREATE POLICY "admin_all_settings"     ON restaurant_settings FOR ALL USING (auth.role()='authenticated');
CREATE POLICY "admin_all_blocked"      ON blocked_dates       FOR ALL USING (auth.role()='authenticated');
CREATE POLICY "admin_all_admins"       ON admin_users         FOR ALL USING (auth.role()='authenticated');
CREATE POLICY "admin_all_history"      ON reservation_history FOR ALL USING (auth.role()='authenticated');
CREATE POLICY "admin_all_notif"        ON notifications       FOR ALL USING (auth.role()='authenticated');
