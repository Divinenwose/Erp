/*
  # Add asset_movements and vendor_quotations tables

  ## Problem
  Two Administration pages had no backing table at all and were built
  entirely on mock/static data:

  - app/(dashboard)/administration/assets/movement-history/page.tsx
  - app/(dashboard)/administration/vendor-management/quotations/page.tsx

  No existing table correctly represents either feature. `stock_movements`
  (20260712013158_002_erp_finance_procurement_inventory.sql) tracks
  inventory/warehouse stock, not fixed assets — forcing asset movement
  tracking onto it would conflate two unrelated domains. No table anywhere
  represents vendor price quotations.

  ## What this migration does
  Creates two new, additive tables:

  1. `asset_movements` — one row per recorded move of a row in the existing
     `assets` table (20260712013228_003_erp_crm_projects_assets.sql),
     referencing it by `asset_id`.
  2. `vendor_quotations` — one row per vendor price quotation, referencing
     the existing generic `vendors` table
     (20260712013158_002_erp_finance_procurement_inventory.sql), which is
     the one vendor table every vendor category can be found in (the
     category-specific tables added in
     20260816090000_011_vendor_management_tables.sql — cleaning_vendors,
     maintenance_vendors, internet_providers, electricity_providers — do
     not share a common parent table a single FK could reference).

  Both follow the same company-scoped RLS convention already used for the
  vendor-management tables in 20260816090000_011_vendor_management_tables.sql.

  ## What this migration deliberately does NOT do
  - Does not touch `stock_movements`, `assets`, `vendors`, or any other
    existing table.
  - Does not modify RLS on any existing table.
  - Does not modify or delete any existing migration.

  ## Idempotency
  `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and
  conditional policy creation (checked via pg_policies) throughout — safe
  to re-run.
*/

CREATE TABLE IF NOT EXISTS asset_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  from_location text,
  to_location text,
  moved_by text,
  reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendor_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  quotation_number text,
  description text NOT NULL,
  amount numeric(15,2) DEFAULT 0,
  valid_until date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE asset_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_quotations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_asset_movements_company ON asset_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_asset_movements_asset ON asset_movements(asset_id);
CREATE INDEX IF NOT EXISTS idx_vendor_quotations_company ON vendor_quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_vendor_quotations_vendor ON vendor_quotations(vendor_id);

-- Company-scoped RLS, matching the existing convention used in
-- 20260816090000_011_vendor_management_tables.sql
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['asset_movements', 'vendor_quotations']
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
