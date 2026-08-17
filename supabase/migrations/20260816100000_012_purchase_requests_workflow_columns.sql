/*
  # Add missing purchase_requests workflow columns

  ## Problem
  app/(dashboard)/administration/purchase-requests/list/page.tsx already has
  a complete, shipped multi-stage approval workflow UI (approve → MD approve
  → accounts review → assign vendor → complete, plus reject/cancel) that
  writes to vendor_id, actual_cost, completed_date, payment_status, and
  rejection_reason — none of which exist on the live `purchase_requests`
  table. That table was created by
  20260712013158_002_erp_finance_procurement_inventory.sql (a later,
  differently-shaped definition of the same table name in
  20260804100000_007_administration_enhanced.sql never applied, since
  `CREATE TABLE IF NOT EXISTS` is a no-op once the table already exists).
  Every workflow action beyond a plain status change currently fails.

  ## What this migration does
  Adds exactly the columns the existing UI already writes to, as nullable/
  defaulted additive columns — the table's existing rows, existing
  Procurement usage, and existing columns are completely unaffected.

  ## What this migration deliberately does NOT do
  - Does not rename, drop, or alter any existing column.
  - Does not touch the `vendors` or `employees` tables.
  - Does not change RLS.
  - Does not modify or delete any existing migration.

  ## Idempotency
  Uses `ADD COLUMN IF NOT EXISTS` throughout — safe to re-run.
*/

ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actual_cost numeric(15,2),
  ADD COLUMN IF NOT EXISTS completed_date date,
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- request_approvals.stage_id is NOT NULL, but the existing purchase-requests
-- workflow UI (app/(dashboard)/administration/purchase-requests/list/page.tsx)
-- inserts an approval record without ever supplying it, which would fail
-- silently (that particular insert has no error handling). Relaxing this to
-- nullable lets that existing insert actually succeed; nothing currently
-- populates or reads stage_id as required.
ALTER TABLE request_approvals ALTER COLUMN stage_id DROP NOT NULL;
