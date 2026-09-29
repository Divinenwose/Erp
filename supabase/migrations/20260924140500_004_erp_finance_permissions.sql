/*
# Complete Finance Module Permissions

This migration adds comprehensive permissions for the complete Finance & Accounts module
*/

-- Add new Finance permissions
INSERT INTO permissions (resource, action, description) VALUES
-- General Ledger
('finance.ledger', 'create', 'Create journal entries'),
('finance.ledger', 'edit', 'Edit journal entries'),
('finance.ledger', 'delete', 'Delete journal entries'),
('finance.ledger', 'post', 'Post journal entries to GL'),
('finance.ledger', 'approve', 'Approve journal entries'),
('finance.chart_of_accounts', 'view', 'View chart of accounts'),
('finance.chart_of_accounts', 'create', 'Create chart of accounts'),
('finance.chart_of_accounts', 'edit', 'Edit chart of accounts'),
('finance.chart_of_accounts', 'delete', 'Delete chart of accounts'),

-- Cash Flow & Cash Book
('finance.cash_flow', 'view', 'View cash flow'),
('finance.cash_flow', 'create', 'Create cash flow entries'),
('finance.cash_flow', 'edit', 'Edit cash flow entries'),
('finance.cash_flow', 'delete', 'Delete cash flow entries'),
('finance.cash_book', 'view', 'View cash book'),
('finance.cash_book', 'create', 'Create cash book entries'),
('finance.cash_book', 'edit', 'Edit cash book entries'),
('finance.cash_book', 'approve', 'Approve cash book entries'),

-- Petty Cash
('finance.petty_cash', 'view', 'View petty cash'),
('finance.petty_cash', 'create', 'Create petty cash funds'),
('finance.petty_cash', 'edit', 'Edit petty cash funds'),
('finance.petty_cash', 'delete', 'Delete petty cash funds'),
('finance.petty_cash', 'replenish', 'Replenish petty cash'),
('finance.petty_cash_transactions', 'view', 'View petty cash transactions'),
('finance.petty_cash_transactions', 'create', 'Create petty cash transactions'),
('finance.petty_cash_transactions', 'approve', 'Approve petty cash transactions'),

-- Payment Vouchers
('finance.payment_vouchers', 'view', 'View payment vouchers'),
('finance.payment_vouchers', 'create', 'Create payment vouchers'),
('finance.payment_vouchers', 'edit', 'Edit payment vouchers'),
('finance.payment_vouchers', 'delete', 'Delete payment vouchers'),
('finance.payment_vouchers', 'approve', 'Approve payment vouchers'),
('finance.payment_vouchers', 'process', 'Process payment vouchers'),

-- Reimbursements
('finance.reimbursements', 'view', 'View reimbursements'),
('finance.reimbursements', 'create', 'Create reimbursements'),
('finance.reimbursements', 'edit', 'Edit reimbursements'),
('finance.reimbursements', 'delete', 'Delete reimbursements'),
('finance.reimbursements', 'approve', 'Approve reimbursements'),
('finance.reimbursements', 'reject', 'Reject reimbursements'),
('finance.reimbursements', 'pay', 'Process reimbursement payments'),

-- Bank Accounts & Reconciliation
('finance.bank_accounts', 'view', 'View bank accounts'),
('finance.bank_accounts', 'create', 'Create bank accounts'),
('finance.bank_accounts', 'edit', 'Edit bank accounts'),
('finance.bank_accounts', 'delete', 'Delete bank accounts'),
('finance.bank_reconciliation', 'view', 'View bank reconciliations'),
('finance.bank_reconciliation', 'create', 'Create bank reconciliations'),
('finance.bank_reconciliation', 'edit', 'Edit bank reconciliations'),
('finance.bank_reconciliation', 'complete', 'Complete bank reconciliations'),

-- Tax Compliance
('finance.tax', 'view', 'View tax compliance'),
('finance.tax', 'create', 'Create tax filings'),
('finance.tax', 'edit', 'Edit tax filings'),
('finance.tax', 'delete', 'Delete tax filings'),
('finance.tax', 'file', 'File tax returns'),
('finance.tax', 'approve', 'Approve tax filings'),
('finance.tax_payments', 'view', 'View tax payments'),
('finance.tax_payments', 'create', 'Create tax payments'),
('finance.tax_payments', 'process', 'Process tax payments'),

-- Financial Periods
('finance.periods', 'view', 'View financial periods'),
('finance.periods', 'create', 'Create financial periods'),
('finance.periods', 'edit', 'Edit financial periods'),
('finance.periods', 'close', 'Close financial periods'),
('finance.periods', 'reopen', 'Reopen financial periods'),

-- Trial Balance
('finance.trial_balance', 'view', 'View trial balance'),
('finance.trial_balance', 'generate', 'Generate trial balance'),

-- Financial Statements
('finance.statements', 'view', 'View financial statements'),
('finance.statements', 'generate', 'Generate financial statements'),
('finance.statements', 'export', 'Export financial statements'),
('finance.income_statement', 'view', 'View income statement'),
('finance.balance_sheet', 'view', 'View balance sheet'),
('finance.cash_flow_statement', 'view', 'View cash flow statement'),
('finance.equity_statement', 'view', 'View equity statement'),

-- Audit Logs
('finance.audit', 'view', 'View finance audit logs'),
('finance.audit', 'export', 'Export audit logs'),

-- Approval Workflows
('finance.approvals', 'view', 'View approval workflows'),
('finance.approvals', 'create', 'Create approval workflows'),
('finance.approvals', 'edit', 'Edit approval workflows'),
('finance.approvals', 'delete', 'Delete approval workflows'),
('finance.approvals', 'approve', 'Approve requests'),
('finance.approvals', 'reject', 'Reject requests'),

-- Payment Schedules
('finance.payment_schedules', 'view', 'View payment schedules'),
('finance.payment_schedules', 'create', 'Create payment schedules'),
('finance.payment_schedules', 'edit', 'Edit payment schedules'),
('finance.payment_schedules', 'delete', 'Delete payment schedules'),
('finance.payment_schedules', 'pause', 'Pause payment schedules'),
('finance.payment_schedules', 'activate', 'Activate payment schedules'),

-- Receivables Aging
('finance.aging', 'view', 'View receivables aging'),
('finance.aging', 'generate', 'Generate aging reports'),

-- Departmental Expenditure
('finance.department_expenditure', 'view', 'View departmental expenditure'),
('finance.department_expenditure', 'edit', 'Edit departmental expenditure'),

-- Payroll Integration
('finance.payroll_integration', 'view', 'View payroll integration'),
('finance.payroll_integration', 'post', 'Post payroll to GL'),
('finance.payroll_integration', 'reconcile', 'Reconcile payroll'),

-- Enhanced Reports
('finance.reports.cash_flow', 'view', 'View cash flow reports'),
('finance.reports.cash_flow', 'export', 'Export cash flow reports'),
('finance.reports.ap', 'view', 'View accounts payable reports'),
('finance.reports.ap', 'export', 'Export accounts payable reports'),
('finance.reports.ar', 'view', 'View accounts receivable reports'),
('finance.reports.ar', 'export', 'Export accounts receivable reports'),
('finance.reports.bank_reconciliation', 'view', 'View bank reconciliation reports'),
('finance.reports.bank_reconciliation', 'export', 'Export bank reconciliation reports'),
('finance.reports.payroll', 'view', 'View payroll reports'),
('finance.reports.payroll', 'export', 'Export payroll reports'),
('finance.reports.expenses', 'view', 'View expense reports'),
('finance.reports.expenses', 'export', 'Export expense reports'),
('finance.reports.budgets', 'view', 'View budget reports'),
('finance.reports.budgets', 'export', 'Export budget reports'),
('finance.reports.variance', 'view', 'View variance reports'),
('finance.reports.variance', 'export', 'Export variance reports'),
('finance.reports.tax', 'view', 'View tax reports'),
('finance.reports.tax', 'export', 'Export tax reports'),
('finance.reports.audit', 'view', 'View audit reports'),
('finance.reports.audit', 'export', 'Export audit reports'),
('finance.reports.management', 'view', 'View management accounts'),
('finance.reports.management', 'export', 'Export management accounts'),
('finance.reports.departmental', 'view', 'View departmental expenditure reports'),
('finance.reports.departmental', 'export', 'Export departmental expenditure reports'),
('finance.reports.vendor_payments', 'view', 'View vendor payment reports'),
('finance.reports.vendor_payments', 'export', 'Export vendor payment reports'),
('finance.reports.petty_cash', 'view', 'View petty cash reports'),
('finance.reports.petty_cash', 'export', 'Export petty cash reports'),
('finance.reports.annual', 'view', 'View annual accounts'),
('finance.reports.annual', 'export', 'Export annual accounts'),

-- Vendor Management (Finance-specific)
('finance.vendors', 'view', 'View finance vendors'),
('finance.vendors', 'create', 'Create finance vendors'),
('finance.vendors', 'edit', 'Edit finance vendors'),
('finance.vendors', 'delete', 'Delete finance vendors'),
('finance.vendors', 'approve', 'Approve vendor payments'),

-- Accounts Payable Enhanced
('finance.payables', 'create', 'Create payable entries'),
('finance.payables', 'edit', 'Edit payable entries'),
('finance.payables', 'delete', 'Delete payable entries'),
('finance.payables', 'approve', 'Approve payables'),
('finance.payables', 'pay', 'Process payable payments'),
('finance.payables', 'reconcile', 'Reconcile payables'),

-- Accounts Receivable Enhanced
('finance.receivables', 'create', 'Create receivable entries'),
('finance.receivables', 'edit', 'Edit receivable entries'),
('finance.receivables', 'delete', 'Delete receivable entries'),
('finance.receivables', 'collect', 'Process collections'),
('finance.receivables', 'write_off', 'Write off bad debts'),

-- Invoices Enhanced
('finance.invoices', 'approve', 'Approve invoices'),
('finance.invoices', 'send', 'Send invoices'),
('finance.invoices', 'void', 'Void invoices'),
('finance.invoices', 'record_payment', 'Record invoice payments'),

-- Expenses Enhanced
('finance.expenses', 'delete', 'Delete expenses'),
('finance.expenses', 'reject', 'Reject expenses'),
('finance.expenses', 'pay', 'Process expense payments'),

-- Budgets Enhanced
('finance.budgets', 'delete', 'Delete budgets'),
('finance.budgets', 'approve', 'Approve budgets'),
('finance.budgets', 'adjust', 'Adjust budgets'),
('finance.budgets', 'transfer', 'Transfer budget allocations')
ON CONFLICT (resource, action) DO NOTHING;

-- Update Finance Manager role with all new Finance permissions
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Finance Manager' LIMIT 1;
  
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource = 'finance' 
       OR p.resource LIKE 'finance.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;
