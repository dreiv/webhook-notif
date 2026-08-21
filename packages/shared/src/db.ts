import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/webhooks",
});

// Minimal schema, created on boot. Fine for a tutorial repo; use real
// migrations (e.g. node-pg-migrate) once this grows past a toy project.
export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type TEXT NOT NULL,
      target_url TEXT NOT NULL,
      secret TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES events(id),
      subscription_id UUID NOT NULL REFERENCES subscriptions(id),
      status TEXT NOT NULL DEFAULT 'pending',
      status_code INT,
      attempt INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}
