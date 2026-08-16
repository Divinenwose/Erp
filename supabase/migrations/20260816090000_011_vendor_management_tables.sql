/*
  # Create missing Administration vendor-management tables

  ## Problem
  Four Administration pages under vendor-management/ (Cleaning Vendors,
  Maintenance Vendors, Internet Providers, Electricity Providers) have
  complete, working CRUD UIs (forms, list views, CSV export, status
  updates) that query app-specific tables — cleaning_vendors,
  maintenance_vendors, internet_providers, electricity_providers — but
  none of these tables were ever created by any migration. Every query
  against them fails (relation does not exist), which the pages handle
  defensively (`data ?? []`), so they silently show "no vendors" rather
  than crashing — but the feature has never actually worked.

  This migration creates exactly the columns each page's own Zod form
  schema and Supabase calls already expect — nothing invented beyond
  what the existing, already-shipped code requires.

  ## What this migration deliberately does NOT do
  - Does not touch the existing `vendors` table (used by Procurement) or
    any other existing table.
  - Does not modify or delete any existing migration file.
  - Does not change RLS on any existing table.
  - Does not grant any new RBAC permission (vendors.cleaning.view etc.
    already exist from prior migrations).

  ## Idempotency
  All statements use `IF NOT EXISTS` / `CREATE POLICY ... ` guarded by a
  DO block checking pg_policies, matching the existing convention in
  20260712014500_006_administration_module.sql.
*/

CREATE TABLE IF NOT EXISTS cleaning_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  service_type text,
  contract_start date,
  contract_end date,
  monthly_cost numeric(12,2),
  rating integer,
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  service_type text,
  contract_start date,
  contract_end date,
  monthly_cost numeric(12,2),
  rating integer,
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS internet_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  plan_type text,
  bandwidth text,
  contract_start date,
  contract_end date,
  monthly_cost numeric(12,2),
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS electricity_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  plan_type text,
  contract_start date,
  contract_end date,
  monthly_cost numeric(12,2),
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cleaning_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE internet_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE electricity_providers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cleaning_vendors_company ON cleaning_vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vendors_company ON maintenance_vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_internet_providers_company ON internet_providers(company_id);
CREATE INDEX IF NOT EXISTS idx_electricity_providers_company ON electricity_providers(company_id);

-- Company-scoped RLS, matching the existing convention used for
-- maintenance_requests/utilities in 20260712014500_006_administration_module.sql
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cleaning_vendors', 'maintenance_vendors', 'internet_providers', 'electricity_providers']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'Users can view own company data') THEN
      EXECUTE format('CREATE POLICY "Users can view own company data" ON %I FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'Users can insert own company data') THEN
      EXECUTE format('CREATE POLICY "Users can insert own company data" ON %I FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'Users can update own company data') THEN
      EXECUTE format('CREATE POLICY "Users can update own company data" ON %I FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'Users can delete own company data') THEN
      EXECUTE format('CREATE POLICY "Users can delete own company data" ON %I FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))', t);
    END IF;
  END LOOP;
END $$;
