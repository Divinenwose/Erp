
/*
# ERP RLS Policies - Multi-Tenant Security

## Summary
Applies Row Level Security policies to all ERP tables.
All tables use company_id-scoped policies for multi-tenant isolation.
Users must be authenticated. Company membership is checked via profiles table.
*/

-- Helper: check if user belongs to company
CREATE OR REPLACE FUNCTION user_company_id() RETURNS uuid AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Companies policies
DROP POLICY IF EXISTS "users_select_own_company" ON companies;
CREATE POLICY "users_select_own_company" ON companies FOR SELECT
TO authenticated USING (id = user_company_id());

DROP POLICY IF EXISTS "users_update_own_company" ON companies;
CREATE POLICY "users_update_own_company" ON companies FOR UPDATE
TO authenticated USING (id = user_company_id()) WITH CHECK (id = user_company_id());

DROP POLICY IF EXISTS "anyone_insert_company" ON companies;
CREATE POLICY "anyone_insert_company" ON companies FOR INSERT
TO authenticated WITH CHECK (true);

-- Profiles policies
DROP POLICY IF EXISTS "users_select_company_profiles" ON profiles;
CREATE POLICY "users_select_company_profiles" ON profiles FOR SELECT
TO authenticated USING (company_id = user_company_id() OR id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own_profile" ON profiles;
CREATE POLICY "users_insert_own_profile" ON profiles FOR INSERT
TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE
TO authenticated USING (id = auth.uid() OR company_id = user_company_id()) WITH CHECK (true);

-- Branches
DROP POLICY IF EXISTS "company_select_branches" ON branches;
CREATE POLICY "company_select_branches" ON branches FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_branches" ON branches;
CREATE POLICY "company_insert_branches" ON branches FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_branches" ON branches;
CREATE POLICY "company_update_branches" ON branches FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_branches" ON branches;
CREATE POLICY "company_delete_branches" ON branches FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Departments
DROP POLICY IF EXISTS "company_select_departments" ON departments;
CREATE POLICY "company_select_departments" ON departments FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_departments" ON departments;
CREATE POLICY "company_insert_departments" ON departments FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_departments" ON departments;
CREATE POLICY "company_update_departments" ON departments FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_departments" ON departments;
CREATE POLICY "company_delete_departments" ON departments FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Employees
DROP POLICY IF EXISTS "company_select_employees" ON employees;
CREATE POLICY "company_select_employees" ON employees FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_employees" ON employees;
CREATE POLICY "company_insert_employees" ON employees FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_employees" ON employees;
CREATE POLICY "company_update_employees" ON employees FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_employees" ON employees;
CREATE POLICY "company_delete_employees" ON employees FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Leave Types
DROP POLICY IF EXISTS "company_select_leave_types" ON leave_types;
CREATE POLICY "company_select_leave_types" ON leave_types FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_leave_types" ON leave_types;
CREATE POLICY "company_insert_leave_types" ON leave_types FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_leave_types" ON leave_types;
CREATE POLICY "company_update_leave_types" ON leave_types FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_leave_types" ON leave_types;
CREATE POLICY "company_delete_leave_types" ON leave_types FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Leave Requests
DROP POLICY IF EXISTS "company_select_leave_requests" ON leave_requests;
CREATE POLICY "company_select_leave_requests" ON leave_requests FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_leave_requests" ON leave_requests;
CREATE POLICY "company_insert_leave_requests" ON leave_requests FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_leave_requests" ON leave_requests;
CREATE POLICY "company_update_leave_requests" ON leave_requests FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_leave_requests" ON leave_requests;
CREATE POLICY "company_delete_leave_requests" ON leave_requests FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Attendance
DROP POLICY IF EXISTS "company_select_attendance" ON attendance;
CREATE POLICY "company_select_attendance" ON attendance FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_attendance" ON attendance;
CREATE POLICY "company_insert_attendance" ON attendance FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_attendance" ON attendance;
CREATE POLICY "company_update_attendance" ON attendance FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_attendance" ON attendance;
CREATE POLICY "company_delete_attendance" ON attendance FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Payroll
DROP POLICY IF EXISTS "company_select_payroll_runs" ON payroll_runs;
CREATE POLICY "company_select_payroll_runs" ON payroll_runs FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_payroll_runs" ON payroll_runs;
CREATE POLICY "company_insert_payroll_runs" ON payroll_runs FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_payroll_runs" ON payroll_runs;
CREATE POLICY "company_update_payroll_runs" ON payroll_runs FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_payroll_runs" ON payroll_runs;
CREATE POLICY "company_delete_payroll_runs" ON payroll_runs FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Payroll items
DROP POLICY IF EXISTS "company_select_payroll_items" ON payroll_items;
CREATE POLICY "company_select_payroll_items" ON payroll_items FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_payroll_items" ON payroll_items;
CREATE POLICY "company_insert_payroll_items" ON payroll_items FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_payroll_items" ON payroll_items;
CREATE POLICY "company_update_payroll_items" ON payroll_items FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_payroll_items" ON payroll_items;
CREATE POLICY "company_delete_payroll_items" ON payroll_items FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Chart of Accounts
DROP POLICY IF EXISTS "company_select_coa" ON chart_of_accounts;
CREATE POLICY "company_select_coa" ON chart_of_accounts FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_coa" ON chart_of_accounts;
CREATE POLICY "company_insert_coa" ON chart_of_accounts FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_coa" ON chart_of_accounts;
CREATE POLICY "company_update_coa" ON chart_of_accounts FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_coa" ON chart_of_accounts;
CREATE POLICY "company_delete_coa" ON chart_of_accounts FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Journal Entries
DROP POLICY IF EXISTS "company_select_je" ON journal_entries;
CREATE POLICY "company_select_je" ON journal_entries FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_je" ON journal_entries;
CREATE POLICY "company_insert_je" ON journal_entries FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_je" ON journal_entries;
CREATE POLICY "company_update_je" ON journal_entries FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_je" ON journal_entries;
CREATE POLICY "company_delete_je" ON journal_entries FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Journal Entry Lines
DROP POLICY IF EXISTS "company_select_jel" ON journal_entry_lines;
CREATE POLICY "company_select_jel" ON journal_entry_lines FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_jel" ON journal_entry_lines;
CREATE POLICY "company_insert_jel" ON journal_entry_lines FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_jel" ON journal_entry_lines;
CREATE POLICY "company_update_jel" ON journal_entry_lines FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_jel" ON journal_entry_lines;
CREATE POLICY "company_delete_jel" ON journal_entry_lines FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Customers
DROP POLICY IF EXISTS "company_select_customers" ON customers;
CREATE POLICY "company_select_customers" ON customers FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_customers" ON customers;
CREATE POLICY "company_insert_customers" ON customers FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_customers" ON customers;
CREATE POLICY "company_update_customers" ON customers FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_customers" ON customers;
CREATE POLICY "company_delete_customers" ON customers FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Invoices
DROP POLICY IF EXISTS "company_select_invoices" ON invoices;
CREATE POLICY "company_select_invoices" ON invoices FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_invoices" ON invoices;
CREATE POLICY "company_insert_invoices" ON invoices FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_invoices" ON invoices;
CREATE POLICY "company_update_invoices" ON invoices FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_invoices" ON invoices;
CREATE POLICY "company_delete_invoices" ON invoices FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Invoice Items
DROP POLICY IF EXISTS "company_select_invoice_items" ON invoice_items;
CREATE POLICY "company_select_invoice_items" ON invoice_items FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_invoice_items" ON invoice_items;
CREATE POLICY "company_insert_invoice_items" ON invoice_items FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_invoice_items" ON invoice_items;
CREATE POLICY "company_update_invoice_items" ON invoice_items FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_invoice_items" ON invoice_items;
CREATE POLICY "company_delete_invoice_items" ON invoice_items FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Expenses
DROP POLICY IF EXISTS "company_select_expenses" ON expenses;
CREATE POLICY "company_select_expenses" ON expenses FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_expenses" ON expenses;
CREATE POLICY "company_insert_expenses" ON expenses FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_expenses" ON expenses;
CREATE POLICY "company_update_expenses" ON expenses FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_expenses" ON expenses;
CREATE POLICY "company_delete_expenses" ON expenses FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Budgets
DROP POLICY IF EXISTS "company_select_budgets" ON budgets;
CREATE POLICY "company_select_budgets" ON budgets FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_budgets" ON budgets;
CREATE POLICY "company_insert_budgets" ON budgets FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_budgets" ON budgets;
CREATE POLICY "company_update_budgets" ON budgets FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_budgets" ON budgets;
CREATE POLICY "company_delete_budgets" ON budgets FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Vendors
DROP POLICY IF EXISTS "company_select_vendors" ON vendors;
CREATE POLICY "company_select_vendors" ON vendors FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_vendors" ON vendors;
CREATE POLICY "company_insert_vendors" ON vendors FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_vendors" ON vendors;
CREATE POLICY "company_update_vendors" ON vendors FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_vendors" ON vendors;
CREATE POLICY "company_delete_vendors" ON vendors FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Purchase Requests
DROP POLICY IF EXISTS "company_select_pr" ON purchase_requests;
CREATE POLICY "company_select_pr" ON purchase_requests FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_pr" ON purchase_requests;
CREATE POLICY "company_insert_pr" ON purchase_requests FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_pr" ON purchase_requests;
CREATE POLICY "company_update_pr" ON purchase_requests FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_pr" ON purchase_requests;
CREATE POLICY "company_delete_pr" ON purchase_requests FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Purchase Orders
DROP POLICY IF EXISTS "company_select_po" ON purchase_orders;
CREATE POLICY "company_select_po" ON purchase_orders FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_po" ON purchase_orders;
CREATE POLICY "company_insert_po" ON purchase_orders FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_po" ON purchase_orders;
CREATE POLICY "company_update_po" ON purchase_orders FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_po" ON purchase_orders;
CREATE POLICY "company_delete_po" ON purchase_orders FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- PO Items
DROP POLICY IF EXISTS "company_select_po_items" ON po_items;
CREATE POLICY "company_select_po_items" ON po_items FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_po_items" ON po_items;
CREATE POLICY "company_insert_po_items" ON po_items FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_po_items" ON po_items;
CREATE POLICY "company_update_po_items" ON po_items FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_po_items" ON po_items;
CREATE POLICY "company_delete_po_items" ON po_items FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Categories
DROP POLICY IF EXISTS "company_select_categories" ON categories;
CREATE POLICY "company_select_categories" ON categories FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_categories" ON categories;
CREATE POLICY "company_insert_categories" ON categories FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_categories" ON categories;
CREATE POLICY "company_update_categories" ON categories FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_categories" ON categories;
CREATE POLICY "company_delete_categories" ON categories FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Products
DROP POLICY IF EXISTS "company_select_products" ON products;
CREATE POLICY "company_select_products" ON products FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_products" ON products;
CREATE POLICY "company_insert_products" ON products FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_products" ON products;
CREATE POLICY "company_update_products" ON products FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_products" ON products;
CREATE POLICY "company_delete_products" ON products FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Warehouses
DROP POLICY IF EXISTS "company_select_warehouses" ON warehouses;
CREATE POLICY "company_select_warehouses" ON warehouses FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_warehouses" ON warehouses;
CREATE POLICY "company_insert_warehouses" ON warehouses FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_warehouses" ON warehouses;
CREATE POLICY "company_update_warehouses" ON warehouses FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_warehouses" ON warehouses;
CREATE POLICY "company_delete_warehouses" ON warehouses FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Inventory Items
DROP POLICY IF EXISTS "company_select_inventory" ON inventory_items;
CREATE POLICY "company_select_inventory" ON inventory_items FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_inventory" ON inventory_items;
CREATE POLICY "company_insert_inventory" ON inventory_items FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_inventory" ON inventory_items;
CREATE POLICY "company_update_inventory" ON inventory_items FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_inventory" ON inventory_items;
CREATE POLICY "company_delete_inventory" ON inventory_items FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Stock Movements
DROP POLICY IF EXISTS "company_select_stock_movements" ON stock_movements;
CREATE POLICY "company_select_stock_movements" ON stock_movements FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_stock_movements" ON stock_movements;
CREATE POLICY "company_insert_stock_movements" ON stock_movements FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_stock_movements" ON stock_movements;
CREATE POLICY "company_update_stock_movements" ON stock_movements FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_stock_movements" ON stock_movements;
CREATE POLICY "company_delete_stock_movements" ON stock_movements FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Leads
DROP POLICY IF EXISTS "company_select_leads" ON leads;
CREATE POLICY "company_select_leads" ON leads FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_leads" ON leads;
CREATE POLICY "company_insert_leads" ON leads FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_leads" ON leads;
CREATE POLICY "company_update_leads" ON leads FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_leads" ON leads;
CREATE POLICY "company_delete_leads" ON leads FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Opportunities
DROP POLICY IF EXISTS "company_select_opportunities" ON opportunities;
CREATE POLICY "company_select_opportunities" ON opportunities FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_opportunities" ON opportunities;
CREATE POLICY "company_insert_opportunities" ON opportunities FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_opportunities" ON opportunities;
CREATE POLICY "company_update_opportunities" ON opportunities FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_opportunities" ON opportunities;
CREATE POLICY "company_delete_opportunities" ON opportunities FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Contacts
DROP POLICY IF EXISTS "company_select_contacts" ON contacts;
CREATE POLICY "company_select_contacts" ON contacts FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_contacts" ON contacts;
CREATE POLICY "company_insert_contacts" ON contacts FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_contacts" ON contacts;
CREATE POLICY "company_update_contacts" ON contacts FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_contacts" ON contacts;
CREATE POLICY "company_delete_contacts" ON contacts FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Sales Orders
DROP POLICY IF EXISTS "company_select_sales_orders" ON sales_orders;
CREATE POLICY "company_select_sales_orders" ON sales_orders FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_sales_orders" ON sales_orders;
CREATE POLICY "company_insert_sales_orders" ON sales_orders FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_sales_orders" ON sales_orders;
CREATE POLICY "company_update_sales_orders" ON sales_orders FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_sales_orders" ON sales_orders;
CREATE POLICY "company_delete_sales_orders" ON sales_orders FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Projects
DROP POLICY IF EXISTS "company_select_projects" ON projects;
CREATE POLICY "company_select_projects" ON projects FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_projects" ON projects;
CREATE POLICY "company_insert_projects" ON projects FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_projects" ON projects;
CREATE POLICY "company_update_projects" ON projects FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_projects" ON projects;
CREATE POLICY "company_delete_projects" ON projects FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Tasks
DROP POLICY IF EXISTS "company_select_tasks" ON tasks;
CREATE POLICY "company_select_tasks" ON tasks FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_tasks" ON tasks;
CREATE POLICY "company_insert_tasks" ON tasks FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_tasks" ON tasks;
CREATE POLICY "company_update_tasks" ON tasks FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_tasks" ON tasks;
CREATE POLICY "company_delete_tasks" ON tasks FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Assets
DROP POLICY IF EXISTS "company_select_assets" ON assets;
CREATE POLICY "company_select_assets" ON assets FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_assets" ON assets;
CREATE POLICY "company_insert_assets" ON assets FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_assets" ON assets;
CREATE POLICY "company_update_assets" ON assets FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_assets" ON assets;
CREATE POLICY "company_delete_assets" ON assets FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Fleet
DROP POLICY IF EXISTS "company_select_fleet" ON fleet_vehicles;
CREATE POLICY "company_select_fleet" ON fleet_vehicles FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_fleet" ON fleet_vehicles;
CREATE POLICY "company_insert_fleet" ON fleet_vehicles FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_fleet" ON fleet_vehicles;
CREATE POLICY "company_update_fleet" ON fleet_vehicles FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_fleet" ON fleet_vehicles;
CREATE POLICY "company_delete_fleet" ON fleet_vehicles FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Visitors
DROP POLICY IF EXISTS "company_select_visitors" ON visitors;
CREATE POLICY "company_select_visitors" ON visitors FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_visitors" ON visitors;
CREATE POLICY "company_insert_visitors" ON visitors FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_visitors" ON visitors;
CREATE POLICY "company_update_visitors" ON visitors FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_visitors" ON visitors;
CREATE POLICY "company_delete_visitors" ON visitors FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Notifications
DROP POLICY IF EXISTS "users_select_own_notifications" ON notifications;
CREATE POLICY "users_select_own_notifications" ON notifications FOR SELECT
TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_notifications" ON notifications;
CREATE POLICY "users_insert_notifications" ON notifications FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "users_update_own_notifications" ON notifications;
CREATE POLICY "users_update_own_notifications" ON notifications FOR UPDATE
TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_delete_own_notifications" ON notifications;
CREATE POLICY "users_delete_own_notifications" ON notifications FOR DELETE
TO authenticated USING (user_id = auth.uid());

-- Audit Logs
DROP POLICY IF EXISTS "company_select_audit_logs" ON audit_logs;
CREATE POLICY "company_select_audit_logs" ON audit_logs FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_audit_logs" ON audit_logs;
CREATE POLICY "company_insert_audit_logs" ON audit_logs FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_audit_logs" ON audit_logs;
CREATE POLICY "company_update_audit_logs" ON audit_logs FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_audit_logs" ON audit_logs;
CREATE POLICY "company_delete_audit_logs" ON audit_logs FOR DELETE
TO authenticated USING (company_id = user_company_id());

-- Work Orders
DROP POLICY IF EXISTS "company_select_work_orders" ON work_orders;
CREATE POLICY "company_select_work_orders" ON work_orders FOR SELECT
TO authenticated USING (company_id = user_company_id());

DROP POLICY IF EXISTS "company_insert_work_orders" ON work_orders;
CREATE POLICY "company_insert_work_orders" ON work_orders FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_work_orders" ON work_orders;
CREATE POLICY "company_update_work_orders" ON work_orders FOR UPDATE
TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_delete_work_orders" ON work_orders;
CREATE POLICY "company_delete_work_orders" ON work_orders FOR DELETE
TO authenticated USING (company_id = user_company_id());
