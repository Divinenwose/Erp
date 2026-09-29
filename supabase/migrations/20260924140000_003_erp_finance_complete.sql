/*
# Complete Finance & Accounting Module Schema

## New Tables for Complete Finance Module
1. `cash_flow_entries` - Cash inflow/outflow tracking
2. `cash_book` - Daily cash book entries
3. `petty_cash_funds` - Petty cash fund management
4. `petty_cash_transactions` - Petty cash transactions
5. `payment_vouchers` - Payment voucher management
6. `reimbursements` - Employee reimbursements
7. `bank_accounts` - Bank account management
8. `bank_reconciliations` - Bank reconciliation
9. `tax_filings` - Tax compliance tracking
10. `tax_payments` - Tax payment records
11. `financial_periods` - Financial period management
12. `trial_balance` - Trial balance records
13. `financial_statements` - Generated financial statements
14. `audit_logs` - Finance audit trail
15. `approval_workflows` - Approval workflow definitions
16. `approval_requests` - Approval request records
17. `payment_schedules` - Scheduled payments
18. `receivables_aging` - AR aging buckets
19. `departmental_expenditure` - Department spending tracking
20. `payroll_integration` - Payroll finance integration
*/

-- Cash Flow Entries
CREATE TABLE IF NOT EXISTS cash_flow_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  flow_type text NOT NULL, -- 'inflow' or 'outflow'
  category text NOT NULL, -- 'operating', 'investing', 'financing'
  subcategory text,
  amount numeric(15,2) NOT NULL,
  currency text DEFAULT 'USD',
  description text,
  reference_type text, -- 'invoice', 'expense', 'payment', etc.
  reference_id uuid,
  bank_account_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cash_flow_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cash_flow_company ON cash_flow_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_date ON cash_flow_entries(entry_date);

-- Cash Book
CREATE TABLE IF NOT EXISTS cash_book (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  entry_number text,
  description text NOT NULL,
  debit_amount numeric(15,2) DEFAULT 0,
  credit_amount numeric(15,2) DEFAULT 0,
  balance numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  reference_type text,
  reference_id uuid,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cash_book ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cash_book_company ON cash_book(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_book_date ON cash_book(entry_date);

-- Petty Cash Funds
CREATE TABLE IF NOT EXISTS petty_cash_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fund_number text,
  fund_name text NOT NULL,
  custodian_id uuid REFERENCES employees(id),
  department_id uuid REFERENCES departments(id),
  initial_amount numeric(15,2) NOT NULL,
  current_balance numeric(15,2) NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'active', -- 'active', 'inactive', 'closed'
  replenishment_threshold numeric(15,2),
  last_replenished_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE petty_cash_funds ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_petty_cash_company ON petty_cash_funds(company_id);

-- Petty Cash Transactions
CREATE TABLE IF NOT EXISTS petty_cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL REFERENCES petty_cash_funds(id) ON DELETE CASCADE,
  transaction_number text,
  transaction_date date NOT NULL,
  transaction_type text NOT NULL, -- 'disbursement', 'replenishment', 'receipt'
  amount numeric(15,2) NOT NULL,
  description text NOT NULL,
  category text,
  recipient_id uuid REFERENCES employees(id),
  receipt_url text,
  approved_by uuid REFERENCES employees(id),
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE petty_cash_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_petty_trans_company ON petty_cash_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_petty_trans_fund ON petty_cash_transactions(fund_id);

-- Payment Vouchers
CREATE TABLE IF NOT EXISTS payment_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  voucher_number text NOT NULL,
  voucher_date date NOT NULL,
  payee_name text NOT NULL,
  payee_type text NOT NULL, -- 'vendor', 'employee', 'other'
  payee_id uuid,
  amount numeric(15,2) NOT NULL,
  currency text DEFAULT 'USD',
  payment_method text, -- 'cash', 'bank_transfer', 'check', 'card'
  bank_account_id uuid,
  description text NOT NULL,
  category text,
  reference_type text,
  reference_id uuid,
  status text DEFAULT 'draft', -- 'draft', 'pending', 'approved', 'paid', 'cancelled'
  approved_by uuid REFERENCES employees(id),
  approved_at timestamptz,
  paid_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_vouchers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_company ON payment_vouchers(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_status ON payment_vouchers(status);

-- Reimbursements
CREATE TABLE IF NOT EXISTS reimbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reimbursement_number text NOT NULL,
  employee_id uuid NOT NULL REFERENCES employees(id),
  claim_date date NOT NULL,
  total_amount numeric(15,2) NOT NULL,
  currency text DEFAULT 'USD',
  description text,
  expense_category text,
  status text DEFAULT 'draft', -- 'draft', 'submitted', 'pending', 'approved', 'rejected', 'paid'
  submitted_at timestamptz,
  approved_by uuid REFERENCES employees(id),
  approved_at timestamptz,
  rejection_reason text,
  paid_amount numeric(15,2),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_reimbursements_company ON reimbursements(company_id);
CREATE INDEX IF NOT EXISTS idx_reimbursements_employee ON reimbursements(employee_id);

CREATE TABLE IF NOT EXISTS reimbursement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reimbursement_id uuid NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
  expense_date date NOT NULL,
  description text NOT NULL,
  amount numeric(15,2) NOT NULL,
  category text,
  receipt_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reimbursement_items ENABLE ROW LEVEL SECURITY;

-- Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_number text NOT NULL,
  account_name text NOT NULL,
  bank_name text NOT NULL,
  account_type text NOT NULL, -- 'checking', 'savings', 'credit_card'
  currency text DEFAULT 'USD',
  current_balance numeric(15,2) DEFAULT 0,
  opening_balance numeric(15,2) DEFAULT 0,
  status text DEFAULT 'active',
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);

-- Bank Reconciliations
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  reconciliation_date date NOT NULL,
  statement_balance numeric(15,2) NOT NULL,
  book_balance numeric(15,2) NOT NULL,
  difference numeric(15,2) DEFAULT 0,
  status text DEFAULT 'draft', -- 'draft', 'in_progress', 'completed'
  reconciled_by uuid REFERENCES auth.users(id),
  reconciled_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bank_recon_company ON bank_reconciliations(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_recon_account ON bank_reconciliations(bank_account_id);

CREATE TABLE IF NOT EXISTS bank_reconciliation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reconciliation_id uuid NOT NULL REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  item_type text NOT NULL, -- 'outstanding_check', 'deposit_in_transit', 'bank_charge', 'error'
  description text NOT NULL,
  amount numeric(15,2) NOT NULL,
  reference_type text,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bank_reconciliation_items ENABLE ROW LEVEL SECURITY;

-- Tax Filings
CREATE TABLE IF NOT EXISTS tax_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tax_type text NOT NULL, -- 'income_tax', 'sales_tax', 'payroll_tax', 'vat', 'other'
  filing_period text NOT NULL, -- 'monthly', 'quarterly', 'annual'
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  filed_date date,
  status text DEFAULT 'pending', -- 'pending', 'filed', 'paid', 'overdue'
  total_tax numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  filed_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tax_filings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tax_filings_company ON tax_filings(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_filings_type ON tax_filings(tax_type);

-- Tax Payments
CREATE TABLE IF NOT EXISTS tax_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tax_filing_id uuid REFERENCES tax_filings(id),
  payment_date date NOT NULL,
  amount numeric(15,2) NOT NULL,
  currency text DEFAULT 'USD',
  payment_method text,
  reference_number text,
  bank_account_id uuid REFERENCES bank_accounts(id),
  status text DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tax_payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tax_payments_company ON tax_payments(company_id);

-- Financial Periods
CREATE TABLE IF NOT EXISTS financial_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_name text NOT NULL,
  period_type text NOT NULL, -- 'monthly', 'quarterly', 'annual'
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean DEFAULT false,
  is_closed boolean DEFAULT false,
  closed_by uuid REFERENCES auth.users(id),
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE financial_periods ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_financial_periods_company ON financial_periods(company_id);

-- Trial Balance
CREATE TABLE IF NOT EXISTS trial_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  financial_period_id uuid REFERENCES financial_periods(id),
  as_of_date date NOT NULL,
  account_id uuid REFERENCES chart_of_accounts(id),
  account_number text,
  account_name text,
  debit_balance numeric(15,2) DEFAULT 0,
  credit_balance numeric(15,2) DEFAULT 0,
  generated_at timestamptz DEFAULT now()
);

ALTER TABLE trial_balance ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_trial_balance_company ON trial_balance(company_id);
CREATE INDEX IF NOT EXISTS idx_trial_balance_period ON trial_balance(financial_period_id);

-- Financial Statements
CREATE TABLE IF NOT EXISTS financial_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  financial_period_id uuid REFERENCES financial_periods(id),
  statement_type text NOT NULL, -- 'income_statement', 'balance_sheet', 'cash_flow', 'equity_statement'
  statement_date date NOT NULL,
  generated_at timestamptz DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id),
  data jsonb,
  status text DEFAULT 'generated'
);

ALTER TABLE financial_statements ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_financial_statements_company ON financial_statements(company_id);

-- Finance Audit Logs
CREATE TABLE IF NOT EXISTS finance_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entity_type text NOT NULL, -- 'invoice', 'expense', 'journal_entry', 'payment', etc.
  entity_id uuid,
  action text NOT NULL, -- 'created', 'updated', 'deleted', 'approved', 'rejected', 'posted'
  previous_values jsonb,
  new_values jsonb,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

ALTER TABLE finance_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_finance_audit_company ON finance_audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_finance_audit_entity ON finance_audit_logs(entity_type, entity_id);

-- Approval Workflows
CREATE TABLE IF NOT EXISTS approval_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  workflow_name text NOT NULL,
  workflow_type text NOT NULL, -- 'payment', 'expense', 'invoice', 'budget', 'tax_filing'
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_approval_workflows_company ON approval_workflows(company_id);

CREATE TABLE IF NOT EXISTS approval_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  step_name text NOT NULL,
  approval_type text NOT NULL, -- 'role', 'user', 'department_head'
  approver_role text,
  approver_id uuid REFERENCES employees(id),
  department_id uuid REFERENCES departments(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE approval_workflow_steps ENABLE ROW LEVEL SECURITY;

-- Approval Requests
CREATE TABLE IF NOT EXISTS approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES approval_workflows(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  requested_by uuid REFERENCES auth.users(id),
  current_step integer,
  status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  notes text
);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_approval_requests_company ON approval_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS approval_request_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  approval_request_id uuid NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  action text NOT NULL, -- 'approved', 'rejected', 'commented'
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz DEFAULT now(),
  comments text
);

ALTER TABLE approval_request_actions ENABLE ROW LEVEL SECURITY;

-- Payment Schedules
CREATE TABLE IF NOT EXISTS payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  schedule_type text NOT NULL, -- 'recurring', 'one_time'
  reference_type text,
  reference_id uuid,
  payee_name text NOT NULL,
  amount numeric(15,2) NOT NULL,
  currency text DEFAULT 'USD',
  frequency text, -- 'daily', 'weekly', 'monthly', 'quarterly', 'annually'
  next_payment_date date NOT NULL,
  end_date date,
  bank_account_id uuid REFERENCES bank_accounts(id),
  status text DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled'
  last_payment_date date,
  total_payments integer DEFAULT 0,
  completed_payments integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_payment_schedules_company ON payment_schedules(company_id);

-- Receivables Aging
CREATE TABLE IF NOT EXISTS receivables_aging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id),
  as_of_date date NOT NULL,
  current numeric(15,2) DEFAULT 0,
  days_1_30 numeric(15,2) DEFAULT 0,
  days_31_60 numeric(15,2) DEFAULT 0,
  days_61_90 numeric(15,2) DEFAULT 0,
  days_91_plus numeric(15,2) DEFAULT 0,
  total_outstanding numeric(15,2) DEFAULT 0,
  generated_at timestamptz DEFAULT now()
);

ALTER TABLE receivables_aging ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_receivables_aging_company ON receivables_aging(company_id);
CREATE INDEX IF NOT EXISTS idx_receivables_aging_date ON receivables_aging(as_of_date);

-- Departmental Expenditure
CREATE TABLE IF NOT EXISTS departmental_expenditure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id),
  financial_period_id uuid REFERENCES financial_periods(id),
  budget_id uuid REFERENCES budgets(id),
  allocated_amount numeric(15,2) DEFAULT 0,
  actual_spent numeric(15,2) DEFAULT 0,
  committed_amount numeric(15,2) DEFAULT 0,
  available_amount numeric(15,2) DEFAULT 0,
  variance numeric(15,2) DEFAULT 0,
  variance_percent numeric(5,2) DEFAULT 0,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE departmental_expenditure ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_dept_expenditure_company ON departmental_expenditure(company_id);
CREATE INDEX IF NOT EXISTS idx_dept_expenditure_dept ON departmental_expenditure(department_id);

-- Payroll Integration
CREATE TABLE IF NOT EXISTS payroll_integration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  payroll_run_id uuid,
  payroll_date date NOT NULL,
  total_gross_pay numeric(15,2) DEFAULT 0,
  total_net_pay numeric(15,2) DEFAULT 0,
  total_deductions numeric(15,2) DEFAULT 0,
  total_taxes numeric(15,2) DEFAULT 0,
  total_benefits numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  status text DEFAULT 'processed',
  posted_to_gl boolean DEFAULT false,
  journal_entry_id uuid REFERENCES journal_entries(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payroll_integration ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_payroll_integration_company ON payroll_integration(company_id);

-- Add audit fields to existing finance tables
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS audit_log_id uuid REFERENCES finance_audit_logs(id);
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS posted_at timestamptz;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS audit_log_id uuid REFERENCES finance_audit_logs(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES employees(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS audit_log_id uuid REFERENCES finance_audit_logs(id);

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES employees(id);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);
