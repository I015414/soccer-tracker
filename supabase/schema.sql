-- Soccer Practice at Ellis — Supabase Schema
-- Run this entire file in the Supabase SQL Editor after creating your project.
-- Replace davidsap01@hotmail.com with your actual admin email before running.

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE rent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from DATE NOT NULL,
  monthly_amount DECIMAL(10,2) NOT NULL,
  admin_contribution DECIMAL(10,2) NOT NULL DEFAULT 48.00,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL,
  player_email TEXT,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('monthly', 'on_demand')),
  period_start DATE,
  payment_date TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('signupgenius', 'venmo', 'zelle', 'cash')),
  signupgenius_key TEXT UNIQUE,
  venmo_transaction_id TEXT UNIQUE,
  zelle_key TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE initial_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE initial_balance ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "read_payments"
  ON payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "read_rent_config"
  ON rent_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "read_initial_balance"
  ON initial_balance FOR SELECT TO authenticated USING (true);

-- Only admin can write (replace email below)
CREATE POLICY "admin_insert_payments"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (auth.email() = 'davidsap01@hotmail.com');

CREATE POLICY "admin_update_payments"
  ON payments FOR UPDATE TO authenticated
  USING (auth.email() = 'davidsap01@hotmail.com')
  WITH CHECK (auth.email() = 'davidsap01@hotmail.com');

CREATE POLICY "admin_delete_payments"
  ON payments FOR DELETE TO authenticated
  USING (auth.email() = 'davidsap01@hotmail.com');

CREATE POLICY "admin_insert_rent_config"
  ON rent_config FOR INSERT TO authenticated
  WITH CHECK (auth.email() = 'davidsap01@hotmail.com');

CREATE POLICY "admin_update_rent_config"
  ON rent_config FOR UPDATE TO authenticated
  USING (auth.email() = 'davidsap01@hotmail.com')
  WITH CHECK (auth.email() = 'davidsap01@hotmail.com');

CREATE POLICY "admin_delete_rent_config"
  ON rent_config FOR DELETE TO authenticated
  USING (auth.email() = 'davidsap01@hotmail.com');

CREATE POLICY "admin_insert_initial_balance"
  ON initial_balance FOR INSERT TO authenticated
  WITH CHECK (auth.email() = 'davidsap01@hotmail.com');

CREATE POLICY "admin_update_initial_balance"
  ON initial_balance FOR UPDATE TO authenticated
  USING (auth.email() = 'davidsap01@hotmail.com')
  WITH CHECK (auth.email() = 'davidsap01@hotmail.com');

CREATE POLICY "admin_delete_initial_balance"
  ON initial_balance FOR DELETE TO authenticated
  USING (auth.email() = 'davidsap01@hotmail.com');

-- ============================================================
-- SEED: initial rent config (update amount/date as needed)
-- ============================================================
INSERT INTO rent_config (effective_from, monthly_amount, admin_contribution)
VALUES ('2026-01-21', 1100.00, 48.00);

-- ============================================================
-- GRANTS  (run after creating tables — required in addition to RLS)
-- ============================================================
GRANT SELECT ON payments TO anon, authenticated;
GRANT SELECT ON rent_config TO anon, authenticated;
GRANT SELECT ON initial_balance TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON payments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON rent_config TO authenticated;
GRANT INSERT, UPDATE, DELETE ON initial_balance TO authenticated;
