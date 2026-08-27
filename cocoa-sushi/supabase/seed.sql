-- ============================================================
-- DATOS DE PRUEBA — COCOA SUSHI
-- ============================================================

-- Configuración del restaurante
INSERT INTO restaurant_settings (key, value) VALUES
('restaurant', '{"name":"Cocoa Sushi","address":"Barrio El Hoyón, San Isidro del General, Costa Rica","phone":"+506 2700-0000","whatsapp":"+50627000000","instagram":"@cocoasushi"}'),
('hours', '{"monday":{"open":false},"tuesday":{"open":true,"from":"12:00","to":"21:00"},"wednesday":{"open":true,"from":"12:00","to":"21:00"},"thursday":{"open":true,"from":"12:00","to":"21:00"},"friday":{"open":true,"from":"12:00","to":"22:00"},"saturday":{"open":true,"from":"12:00","to":"22:00"},"sunday":{"open":true,"from":"12:00","to":"20:00"}}'),
('booking', '{"durationMinutes":150,"noShowToleranceMinutes":15,"noShowAutomatic":true,"intervalMinutes":30,"minAdvanceHours":1,"maxAdvanceDays":30,"maxPartySize":8,"allowCombinedTables":false}'),
('notifications', '{"confirmationEnabled":true,"reminderEnabled":true,"reminderHoursBefore":24,"whatsappApiEnabled":false,"whatsappApiToken":"","whatsappPhoneId":""}');

-- Mesas — Terraza
INSERT INTO tables (code, location, capacity, sort_order) VALUES
('T01','terraza',2,1),
('T02','terraza',2,2),
('T03','terraza',4,3),
('T04','terraza',4,4),
('T05','terraza',6,5),
('T06','terraza',8,6);

-- Mesas — Salón
INSERT INTO tables (code, location, capacity, sort_order) VALUES
('S01','salon',2,7),
('S02','salon',2,8),
('S03','salon',4,9),
('S04','salon',4,10),
('S05','salon',6,11),
('S06','salon',8,12);

