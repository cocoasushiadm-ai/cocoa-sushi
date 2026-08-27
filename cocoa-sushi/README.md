# Cocoa Sushi — Sistema de Reservaciones

Sistema web completo para gestionar reservas del restaurante Cocoa Sushi.

## Tecnología

| Capa | Tecnología |
|------|------------|
| Frontend + API | Next.js 14 (App Router) |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth (JWT) |
| Estilos | Tailwind CSS |
| Deployment | Vercel + Supabase |

---

## Guía de instalación (15 minutos)

### Paso 1 — Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → **New project**
2. Elegir región: **South America (São Paulo)** para menor latencia desde CR
3. Guardar la contraseña del proyecto
4. Esperar que se aprovisione (~2 min)

### Paso 2 — Crear la base de datos

1. En el panel de Supabase → **SQL Editor**
2. Copiar el contenido de `supabase/schema.sql` y ejecutarlo
3. Copiar el contenido de `supabase/seed.sql` y ejecutarlo

### Paso 3 — Crear usuario administrador

En Supabase → **Authentication** → **Users** → **Add user**:
```
Email: admin@cocoasushi.com
Password: [elige una contraseña segura]
```

Luego en SQL Editor:
```sql
INSERT INTO profiles (id, name, role)
SELECT id, 'Administrador', 'admin'
FROM auth.users WHERE email = 'admin@cocoasushi.com';
```

### Paso 4 — Configurar variables de entorno

Copiar `.env.example` como `.env.local`:
```bash
cp .env.example .env.local
```

En Supabase → **Settings** → **API**, copiar:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
- `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nunca exponerlo al cliente)

### Paso 5 — Instalar y ejecutar localmente

```bash
npm install
npm run dev
```

Abrir: http://localhost:3000

---

## Deploy en Vercel (producción)

### Opción A — Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Opción B — Desde GitHub

1. Subir el proyecto a un repositorio GitHub
2. En [vercel.com](https://vercel.com) → **Import project** → seleccionar el repo
3. Agregar las variables de entorno en Vercel Dashboard → Settings → Environment Variables

### Variables de entorno en Vercel

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_BASE_URL=https://tu-dominio.vercel.app
CRON_SECRET=una_clave_aleatoria_segura
TZ=America/Costa_Rica
```

### Cron Job (liberación automática de mesas)

El archivo `vercel.json` ya configura un cron cada minuto que llama a `/api/admin/release`.  
Requiere el plan Vercel Pro o superior para crons. En el plan Hobby, ejecutar manualmente o usar:
- [Upstash](https://upstash.com) — QStash para llamadas HTTP gratuitas
- [Supabase Cron](https://supabase.com/docs/guides/database/postgres/extensions/pg_cron)

Para pg_cron en Supabase (recomendado — gratis):
```sql
-- Habilitar extensión en Supabase SQL Editor
SELECT cron.schedule('release-tables', '* * * * *', 'SELECT auto_release_tables()');
```

---

## WhatsApp Business Cloud API

Para envío automático de confirmaciones:

1. Crear cuenta en [Meta for Developers](https://developers.facebook.com)
2. Crear una aplicación → WhatsApp → configurar número de teléfono
3. Obtener `Phone Number ID` y `API Token` (Bearer)
4. Agregar las credenciales en el panel de Configuración del admin
5. El sistema usará la API para enviar mensajes automáticamente

**Sin API configurada:** el sistema genera un enlace `wa.me/?text=...` con el mensaje prellenado. El administrador lo puede abrir y enviar manualmente.

---

## Estructura de carpetas

```
cocoa-sushi/
├── supabase/
│   ├── schema.sql          ← Tablas, índices, funciones, RLS
│   └── seed.sql            ← Datos iniciales (mesas, configuración)
├── src/
│   ├── app/
│   │   ├── page.tsx        ← Reserva pública (flujo paso a paso)
│   │   ├── confirmacion/   ← Confirmación al cliente
│   │   ├── gestionar/      ← Cliente cancela/consulta su reserva
│   │   ├── admin/
│   │   │   ├── dashboard/  ← Dashboard con stats y reservas del día
│   │   │   ├── reservas/   ← Tabla completa con acciones
│   │   │   ├── mapa/       ← Vista de mesas en tiempo real
│   │   │   ├── mesas/      ← Configurar/bloquear mesas
│   │   │   └── configuracion/ ← Horarios, parámetros, WhatsApp
│   │   └── api/
│   │       ├── availability/   ← GET slots disponibles
│   │       ├── reservations/   ← CRUD reservas
│   │       ├── tables/         ← CRUD mesas
│   │       └── admin/          ← Stats, settings, auto-release
│   ├── lib/
│   │   ├── availability.ts ← Lógica de disponibilidad (CORE)
│   │   ├── supabase.ts     ← Cliente browser
│   │   ├── supabase-server.ts ← Cliente server (service role)
│   │   └── utils.ts        ← Helpers, formateo, WhatsApp
│   ├── types/index.ts      ← TypeScript types
│   └── components/
│       └── admin/          ← Sidebar, modales, etc.
├── middleware.ts           ← Protección de rutas /admin
└── vercel.json             ← Cron para liberación automática
```

---

## Reglas de negocio implementadas

| Regla | Implementación |
|-------|---------------|
| Duración 2h30m | `durationMinutes: 150` en settings + `is_table_available()` en DB |
| No doble-booking | Verificación en `availability.ts` antes de crear |
| No Show 15 min | Timer en frontend + endpoint `/api/reservations/[id]/noshow` |
| Liberación automática | `auto_release_tables()` → pg_cron o Vercel Cron |
| Asignación óptima | Mesa de capacidad más cercana al grupo (`assignBestTable`) |
| Tolerancia No Show | Configurable desde panel admin |
| Zona horaria CR | `TZ=America/Costa_Rica` en todas las operaciones |

---

## URLs del sistema

| URL | Descripción |
|-----|-------------|
| `/` | Reserva pública (flujo de 5 pasos) |
| `/confirmacion` | Confirmación con código y enlace WhatsApp |
| `/gestionar` | Cliente consulta/cancela su reserva |
| `/admin/dashboard` | Dashboard con stats del día |
| `/admin/reservas` | Tabla completa de reservas |
| `/admin/mapa` | Mapa visual de mesas en tiempo real |
| `/admin/mesas` | Configurar/bloquear mesas |
| `/admin/configuracion` | Horarios, WhatsApp, parámetros |

---

## Expansiones futuras (arquitectura preparada)

- **Lista de espera** → tabla `waitlist` con lógica de promoción automática
- **Clientes frecuentes** → ya tiene `total_reservations` y `no_shows` en `customers`
- **Estadísticas** → consultas SQL sobre `reservations` y `reservation_history`
- **Roles múltiples** → `profiles.role` con middleware por rol
- **Plano visual** → drag & drop sobre el mapa de mesas existente
- **QR code** → enlace directo a `/reservar?table=T04`
- **Recordatorios automáticos** → Supabase Edge Functions con cron

