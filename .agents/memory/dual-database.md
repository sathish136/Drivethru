---
name: Dual Database Setup
description: The app uses APP_DATABASE_URL (external PostgreSQL) as primary, not DATABASE_URL (Replit). Querying DATABASE_URL via psql will show WRONG data.
---

## Rule
Always use `psql "$APP_DATABASE_URL"` or Drizzle (which prefers `APP_DATABASE_URL`) when checking real app data. Never use plain `psql "$DATABASE_URL"` — that hits the Replit local DB which is NOT used by the running app.

**Why:** The `lib/db/src/index.ts` connection priority is: `APP_DATABASE_URL` → `DATABASE_URL` → `COLOMBO_DB_URL`. Since `APP_DATABASE_URL` is set to an external PostgreSQL server (`122.165.225.42`), the app always uses that. The Replit `DATABASE_URL` is the local heliumdb which has a different (stale) dataset.

**How to apply:** When diagnosing DB issues, run queries against `$APP_DATABASE_URL`. When updating records (like resetting passwords), update `$APP_DATABASE_URL`.

## Password hashing
hashPassword uses SHA-256 with salt `salt_po_2024`: `sha256(password + "salt_po_2024")`.  
Hash for `admin123`: `48f210e5870953466898487e23c72abcae32c0116d46ce298cbd9357f5776169`
