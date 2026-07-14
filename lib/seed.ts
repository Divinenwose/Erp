import { supabase } from '@/lib/supabase';

export async function seedDemoData(companyId: string) {
  // Check if already seeded
  const { count } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);
  if ((count ?? 0) > 0) return;

  // Branches
  const { data: branches } = await supabase.from('branches').insert([
    { company_id: companyId, name: 'Headquarters', code: 'HQ', city: 'San Francisco', country: 'US', is_headquarter: true, is_active: true },
    { company_id: companyId, name: 'East Coast Office', code: 'EC', city: 'New York', country: 'US', is_headquarter: false, is_active: true },
  ]).select();

  const hqId = branches?.[0]?.id;
  const ecId = branches?.[1]?.id;

  // Departments
  const { data: depts } = await supabase.from('departments').insert([
    { company_id: companyId, name: 'Engineering', code: 'ENG', branch_id: hqId, budget: 450000, is_active: true },
    { company_id: companyId, name: 'Sales & Marketing', code: 'SLS', branch_id: hqId, budget: 180000, is_active: true },
    { company_id: companyId, name: 'Finance', code: 'FIN', branch_id: hqId, budget: 120000, is_active: true },
    { company_id: companyId, name: 'Operations', code: 'OPS', branch_id: ecId, budget: 200000, is_active: true },
    { company_id: companyId, name: 'Human Resources', code: 'HR', branch_id: hqId, budget: 90000, is_active: true },
  ]).select();

  const engId = depts?.[0]?.id;
  const slsId = depts?.[1]?.id;
  const finId = depts?.[2]?.id;
  const opsId = depts?.[3]?.id;
  const hrId = depts?.[4]?.id;

  // Employees
  const { data: employees } = await supabase.from('employees').insert([
    { company_id: companyId, first_name: 'Sarah', last_name: 'Mitchell', email: 'sarah.mitchell@company.com', phone: '+1 415 555 0101', job_title: 'Engineering Manager', department_id: engId, branch_id: hqId, employment_type: 'full_time', employment_status: 'active', hire_date: '2021-03-15', salary: 145000, salary_currency: 'USD', gender: 'female' },
    { company_id: companyId, first_name: 'James', last_name: 'Wilson', email: 'james.wilson@company.com', phone: '+1 415 555 0102', job_title: 'Senior Engineer', department_id: engId, branch_id: hqId, employment_type: 'full_time', employment_status: 'active', hire_date: '2022-01-10', salary: 125000, salary_currency: 'USD', gender: 'male' },
    { company_id: companyId, first_name: 'Priya', last_name: 'Sharma', email: 'priya.sharma@company.com', phone: '+1 415 555 0103', job_title: 'Sales Director', department_id: slsId, branch_id: hqId, employment_type: 'full_time', employment_status: 'active', hire_date: '2020-08-20', salary: 135000, salary_currency: 'USD', gender: 'female' },
    { company_id: companyId, first_name: 'Carlos', last_name: 'Rivera', email: 'carlos.rivera@company.com', phone: '+1 415 555 0104', job_title: 'Finance Manager', department_id: finId, branch_id: hqId, employment_type: 'full_time', employment_status: 'active', hire_date: '2021-11-05', salary: 115000, salary_currency: 'USD', gender: 'male' },
    { company_id: companyId, first_name: 'Emma', last_name: 'Blake', email: 'emma.blake@company.com', phone: '+1 212 555 0105', job_title: 'Operations Manager', department_id: opsId, branch_id: ecId, employment_type: 'full_time', employment_status: 'active', hire_date: '2022-06-01', salary: 105000, salary_currency: 'USD', gender: 'female' },
    { company_id: companyId, first_name: 'David', last_name: 'Osei', email: 'david.osei@company.com', phone: '+1 415 555 0106', job_title: 'HR Manager', department_id: hrId, branch_id: hqId, employment_type: 'full_time', employment_status: 'active', hire_date: '2021-05-12', salary: 98000, salary_currency: 'USD', gender: 'male' },
    { company_id: companyId, first_name: 'Lisa', last_name: 'Chen', email: 'lisa.chen@company.com', phone: '+1 415 555 0107', job_title: 'Software Engineer', department_id: engId, branch_id: hqId, employment_type: 'full_time', employment_status: 'active', hire_date: '2023-02-14', salary: 105000, salary_currency: 'USD', gender: 'female' },
    { company_id: companyId, first_name: 'Ahmed', last_name: 'Hassan', email: 'ahmed.hassan@company.com', phone: '+1 212 555 0108', job_title: 'Account Executive', department_id: slsId, branch_id: ecId, employment_type: 'full_time', employment_status: 'active', hire_date: '2022-09-20', salary: 85000, salary_currency: 'USD', gender: 'male' },
  ]).select();

  const mgr1 = employees?.[0]?.id;

  // Update managers
  if (mgr1) {
    for (const emp of (employees ?? []).slice(1)) {
      await supabase.from('employees').update({ manager_id: mgr1 }).eq('id', emp.id);
    }
  }

  // Leave types
  await supabase.from('leave_types').insert([
    { company_id: companyId, name: 'Annual Leave', code: 'AL', days_per_year: 20, is_paid: true, color: '#3B82F6' },
    { company_id: companyId, name: 'Sick Leave', code: 'SL', days_per_year: 10, is_paid: true, color: '#EF4444' },
    { company_id: companyId, name: 'Personal Leave', code: 'PL', days_per_year: 5, is_paid: true, color: '#8B5CF6' },
  ]);

  // Leave requests
  const emp1 = employees?.[1]?.id; const emp2 = employees?.[2]?.id;
  const { data: ltypes } = await supabase.from('leave_types').select('id').eq('company_id', companyId).limit(2);
  if (emp1 && ltypes?.[0]) {
    await supabase.from('leave_requests').insert([
      { company_id: companyId, employee_id: emp1, leave_type_id: ltypes[0].id, start_date: '2024-12-23', end_date: '2024-12-27', days_requested: 5, reason: 'Holiday vacation', status: 'pending' },
      { company_id: companyId, employee_id: emp2, leave_type_id: ltypes[1]?.id ?? ltypes[0].id, start_date: '2024-12-16', end_date: '2024-12-17', days_requested: 2, reason: 'Medical appointment', status: 'approved' },
    ]);
  }

  // Customers
  const { data: customers } = await supabase.from('customers').insert([
    { company_id: companyId, customer_number: 'CUS-0001', name: 'TechVision Ltd', email: 'billing@techvision.com', phone: '+1 650 555 1001', industry: 'Technology', customer_type: 'business', credit_limit: 50000, payment_terms: 30, status: 'active', city: 'Palo Alto', country: 'US' },
    { company_id: companyId, customer_number: 'CUS-0002', name: 'Global Retail Corp', email: 'finance@globalretail.com', phone: '+1 312 555 1002', industry: 'Retail', customer_type: 'business', credit_limit: 75000, payment_terms: 45, status: 'active', city: 'Chicago', country: 'US' },
    { company_id: companyId, customer_number: 'CUS-0003', name: 'BuildRight Construction', email: 'accounts@buildright.com', phone: '+1 713 555 1003', industry: 'Construction', customer_type: 'business', credit_limit: 100000, payment_terms: 60, status: 'active', city: 'Houston', country: 'US' },
    { company_id: companyId, customer_number: 'CUS-0004', name: 'MediCare Network', email: 'procurement@medicare.com', phone: '+1 617 555 1004', industry: 'Healthcare', customer_type: 'business', credit_limit: 30000, payment_terms: 30, status: 'active', city: 'Boston', country: 'US' },
  ]).select();

  // Leads
  await supabase.from('leads').insert([
    { company_id: companyId, first_name: 'Michael', last_name: 'Torres', email: 'michael@startup.io', company_name: 'StartupHub', source: 'website', status: 'new', rating: 'hot', phone: '+1 555 2001' },
    { company_id: companyId, first_name: 'Jennifer', last_name: 'Lee', email: 'jlee@acme.com', company_name: 'Acme Corp', source: 'referral', status: 'qualified', rating: 'warm', phone: '+1 555 2002' },
    { company_id: companyId, first_name: 'Robert', last_name: 'Kim', email: 'rkim@logistix.com', company_name: 'LogisTix Inc', source: 'email', status: 'contacted', rating: 'warm', phone: '+1 555 2003' },
    { company_id: companyId, first_name: 'Amanda', last_name: 'Foster', email: 'afoster@retail.co', company_name: 'RetailCo', source: 'social', status: 'new', rating: 'cold', phone: '+1 555 2004' },
    { company_id: companyId, first_name: 'Daniel', last_name: 'Brown', email: 'dbrown@mfg.com', company_name: 'Precision Mfg', source: 'event', status: 'converted', rating: 'hot', phone: '+1 555 2005' },
  ]);

  // Opportunities
  const cust1 = customers?.[0]?.id; const cust2 = customers?.[1]?.id;
  if (cust1) {
    await supabase.from('opportunities').insert([
      { company_id: companyId, title: 'ERP Implementation — TechVision', customer_id: cust1, stage: 'proposal', probability: 65, estimated_value: 48000, expected_close_date: '2025-01-31', status: 'open' },
      { company_id: companyId, title: 'Annual Maintenance Contract', customer_id: cust2, stage: 'negotiation', probability: 80, estimated_value: 24000, expected_close_date: '2025-01-15', status: 'open' },
      { company_id: companyId, title: 'Module Expansion — HR & Finance', customer_id: cust1, stage: 'qualified', probability: 45, estimated_value: 18000, expected_close_date: '2025-02-28', status: 'open' },
    ]);
  }

  // Vendors
  await supabase.from('vendors').insert([
    { company_id: companyId, vendor_number: 'VEN-0001', name: 'CloudTech Solutions', email: 'billing@cloudtech.com', phone: '+1 800 555 3001', category: 'technology', payment_terms: 30, rating: 5, status: 'active' },
    { company_id: companyId, vendor_number: 'VEN-0002', name: 'Office Depot Business', email: 'corporate@officedepot.com', phone: '+1 800 555 3002', category: 'office_supplies', payment_terms: 15, rating: 4, status: 'active' },
    { company_id: companyId, vendor_number: 'VEN-0003', name: 'Swift Logistics', email: 'ops@swiftlogistics.com', phone: '+1 800 555 3003', category: 'logistics', payment_terms: 45, rating: 4, status: 'active' },
  ]);

  // Products + Category
  const { data: cats } = await supabase.from('categories').insert([
    { company_id: companyId, name: 'Software Licenses', code: 'SWL', is_active: true },
    { company_id: companyId, name: 'Hardware', code: 'HWD', is_active: true },
    { company_id: companyId, name: 'Office Supplies', code: 'OFF', is_active: true },
  ]).select();

  const swlId = cats?.[0]?.id; const hwdId = cats?.[1]?.id; const offId = cats?.[2]?.id;

  const { data: products } = await supabase.from('products').insert([
    { company_id: companyId, sku: 'PRD-0001', name: 'ERP Starter License', category_id: swlId, unit_of_measure: 'license', cost_price: 500, selling_price: 1200, reorder_level: 5, product_type: 'service', track_inventory: false, is_active: true },
    { company_id: companyId, sku: 'PRD-0002', name: 'Laptop Dell XPS 15', category_id: hwdId, unit_of_measure: 'unit', cost_price: 1200, selling_price: 1650, reorder_level: 5, product_type: 'product', track_inventory: true, is_active: true },
    { company_id: companyId, sku: 'PRD-0003', name: 'Office Chair Executive', category_id: offId, unit_of_measure: 'unit', cost_price: 280, selling_price: 450, reorder_level: 10, product_type: 'product', track_inventory: true, is_active: true },
    { company_id: companyId, sku: 'PRD-0004', name: 'Monitor 27" 4K', category_id: hwdId, unit_of_measure: 'unit', cost_price: 380, selling_price: 550, reorder_level: 5, product_type: 'product', track_inventory: true, is_active: true },
  ]).select();

  // Warehouse + inventory
  const { data: warehouses } = await supabase.from('warehouses').insert([
    { company_id: companyId, branch_id: hqId, name: 'Main Warehouse', code: 'WH-01', is_active: true },
  ]).select();
  const wh1 = warehouses?.[0]?.id;
  if (wh1 && products) {
    await supabase.from('inventory_items').insert(
      products.filter(p => p.track_inventory).map(p => ({
        company_id: companyId, product_id: p.id, warehouse_id: wh1,
        quantity_on_hand: Math.floor(Math.random() * 50) + 10,
        quantity_reserved: 0, quantity_available: Math.floor(Math.random() * 50) + 10,
      }))
    );
  }

  // Invoices
  const cId1 = customers?.[0]?.id; const cId2 = customers?.[1]?.id; const cId3 = customers?.[2]?.id;
  await supabase.from('invoices').insert([
    { company_id: companyId, invoice_number: 'INV-2024-0001', invoice_type: 'sales', customer_id: cId1, issue_date: '2024-11-01', due_date: '2024-12-01', status: 'paid', subtotal: 12000, tax_amount: 960, total_amount: 12960, paid_amount: 12960, balance_due: 0, currency: 'USD' },
    { company_id: companyId, invoice_number: 'INV-2024-0002', invoice_type: 'sales', customer_id: cId2, issue_date: '2024-11-15', due_date: '2024-12-15', status: 'pending', subtotal: 8500, tax_amount: 680, total_amount: 9180, paid_amount: 0, balance_due: 9180, currency: 'USD' },
    { company_id: companyId, invoice_number: 'INV-2024-0003', invoice_type: 'sales', customer_id: cId3, issue_date: '2024-10-20', due_date: '2024-11-20', status: 'overdue', subtotal: 6200, tax_amount: 496, total_amount: 6696, paid_amount: 0, balance_due: 6696, currency: 'USD' },
    { company_id: companyId, invoice_number: 'INV-2024-0004', invoice_type: 'sales', customer_id: cId1, issue_date: '2024-12-01', due_date: '2025-01-01', status: 'draft', subtotal: 15000, tax_amount: 1200, total_amount: 16200, paid_amount: 0, balance_due: 16200, currency: 'USD' },
  ]);

  // Expenses
  const emp1Id = employees?.[1]?.id; const emp3Id = employees?.[2]?.id;
  if (emp1Id) {
    await supabase.from('expenses').insert([
      { company_id: companyId, employee_id: emp1Id, expense_number: 'EXP-001', title: 'AWS Server Costs - Nov', category: 'technology', amount: 1240, currency: 'USD', expense_date: '2024-11-30', status: 'approved' },
      { company_id: companyId, employee_id: emp3Id ?? emp1Id, expense_number: 'EXP-002', title: 'Client Dinner - TechVision', category: 'entertainment', amount: 385, currency: 'USD', expense_date: '2024-11-28', status: 'pending' },
      { company_id: companyId, employee_id: emp1Id, expense_number: 'EXP-003', title: 'Team Building Event', category: 'events', amount: 2100, currency: 'USD', expense_date: '2024-11-15', status: 'approved' },
    ]);
  }

  // Assets
  await supabase.from('assets').insert([
    { company_id: companyId, asset_number: 'AST-0001', name: 'MacBook Pro 16" - Sarah Mitchell', asset_type: 'computer', brand: 'Apple', model: 'MacBook Pro 16"', serial_number: 'C02XM2JHG8WL', purchase_date: '2022-01-15', purchase_price: 2499, current_value: 1800, condition: 'excellent', status: 'active', department_id: engId, branch_id: hqId, warranty_expiry: '2025-01-15' },
    { company_id: companyId, asset_number: 'AST-0002', name: 'Executive Desk - Conference Room A', asset_type: 'furniture', brand: 'Herman Miller', model: 'Renew Sit-to-Stand', purchase_date: '2021-06-10', purchase_price: 1800, current_value: 1200, condition: 'good', status: 'active', branch_id: hqId },
    { company_id: companyId, asset_number: 'AST-0003', name: 'Cisco IP Phone - Reception', asset_type: 'equipment', brand: 'Cisco', model: 'IP Phone 8841', serial_number: 'FCH2150V0SX', purchase_date: '2020-03-22', purchase_price: 450, current_value: 200, condition: 'good', status: 'active', branch_id: hqId },
  ]);

  // Fleet
  await supabase.from('fleet_vehicles').insert([
    { company_id: companyId, vehicle_number: 'VEH-001', make: 'Toyota', model: 'Camry', year: 2022, license_plate: 'ABC-1234', vehicle_type: 'car', fuel_type: 'hybrid', status: 'available', branch_id: hqId, purchase_date: '2022-03-15', purchase_price: 28000, insurance_expiry: '2025-03-15', registration_expiry: '2025-01-31', mileage: 18450 },
    { company_id: companyId, vehicle_number: 'VEH-002', make: 'Ford', model: 'Transit', year: 2021, license_plate: 'XYZ-5678', vehicle_type: 'van', fuel_type: 'petrol', status: 'in_use', branch_id: ecId, purchase_date: '2021-08-20', purchase_price: 35000, insurance_expiry: '2024-08-20', registration_expiry: '2024-12-31', mileage: 42000 },
  ]);

  // Projects
  const { data: projects } = await supabase.from('projects').insert([
    { company_id: companyId, project_number: 'PRJ-2024-001', name: 'ERP Platform Upgrade', description: 'Upgrade the core ERP system with new modules and performance improvements', department_id: engId, status: 'in_progress', priority: 'high', budget: 85000, spent_amount: 42000, completion_percent: 48, start_date: '2024-09-01', end_date: '2025-02-28' },
    { company_id: companyId, project_number: 'PRJ-2024-002', name: 'Q1 Sales Campaign', description: 'Multi-channel sales campaign targeting enterprise customers in Q1 2025', department_id: slsId, status: 'planning', priority: 'medium', budget: 45000, spent_amount: 5000, completion_percent: 10, start_date: '2025-01-01', end_date: '2025-03-31' },
    { company_id: companyId, project_number: 'PRJ-2024-003', name: 'Office Renovation - HQ', description: 'Renovation of main office space including new workstations and meeting rooms', department_id: opsId, status: 'in_progress', priority: 'low', budget: 120000, spent_amount: 78000, completion_percent: 65, start_date: '2024-10-01', end_date: '2025-01-15' },
  ]).select();

  // Tasks
  const proj1 = projects?.[0]?.id; const proj2 = projects?.[1]?.id;
  if (proj1) {
    await supabase.from('tasks').insert([
      { company_id: companyId, project_id: proj1, title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for automated testing and deployment', status: 'done', priority: 'high', estimated_hours: 16, actual_hours: 14, completion_percent: 100, assigned_to: employees?.[0]?.id },
      { company_id: companyId, project_id: proj1, title: 'Database schema migration', description: 'Migrate legacy schema to new multi-tenant architecture', status: 'in_progress', priority: 'high', estimated_hours: 24, actual_hours: 18, completion_percent: 70, assigned_to: employees?.[1]?.id, due_date: '2024-12-20' },
      { company_id: companyId, project_id: proj1, title: 'API endpoint documentation', description: 'Write comprehensive API docs using OpenAPI/Swagger', status: 'todo', priority: 'medium', estimated_hours: 12, actual_hours: 0, completion_percent: 0, assigned_to: employees?.[6]?.id, due_date: '2025-01-10' },
      { company_id: companyId, project_id: proj1, title: 'Performance testing suite', description: 'Build load testing scripts to validate 10K concurrent users', status: 'in_progress', priority: 'high', estimated_hours: 20, actual_hours: 8, completion_percent: 35, assigned_to: employees?.[0]?.id, due_date: '2025-01-15' },
      { company_id: companyId, project_id: proj1, title: 'Security audit', description: 'Third-party penetration testing and vulnerability assessment', status: 'todo', priority: 'critical', estimated_hours: 40, actual_hours: 0, completion_percent: 0, due_date: '2025-02-01' },
    ]);
  }
  if (proj2) {
    await supabase.from('tasks').insert([
      { company_id: companyId, project_id: proj2, title: 'Define target personas', status: 'done', priority: 'high', estimated_hours: 8, actual_hours: 8, completion_percent: 100, assigned_to: employees?.[2]?.id },
      { company_id: companyId, project_id: proj2, title: 'Create campaign landing pages', status: 'in_progress', priority: 'medium', estimated_hours: 20, actual_hours: 5, completion_percent: 25, assigned_to: employees?.[7]?.id, due_date: '2024-12-30' },
      { company_id: companyId, project_id: proj2, title: 'Email sequence setup', status: 'todo', priority: 'medium', estimated_hours: 12, actual_hours: 0, completion_percent: 0, due_date: '2025-01-05' },
    ]);
  }

  // Purchase requests
  const { data: prs } = await supabase.from('purchase_requests').insert([
    { company_id: companyId, request_number: 'PR-2024-0001', title: 'MacBook Pro laptops x3 for new engineers', department_id: engId, estimated_cost: 7500, status: 'approved', priority: 'high', justification: 'New hires starting January 2025 need workstations', requested_by: employees?.[0]?.id },
    { company_id: companyId, request_number: 'PR-2024-0002', title: 'Office ergonomic chairs x10', department_id: opsId, estimated_cost: 4500, status: 'pending', priority: 'medium', justification: 'Replace worn out chairs in main office', requested_by: employees?.[4]?.id },
  ]).select();

  // Work orders
  await supabase.from('work_orders').insert([
    { company_id: companyId, order_number: 'WO-001', title: 'AC Unit Maintenance - Floor 2', work_type: 'maintenance', priority: 'medium', status: 'in_progress', scheduled_date: '2024-12-18', estimated_cost: 800 },
    { company_id: companyId, order_number: 'WO-002', title: 'Fix Conference Room Projector', work_type: 'repair', priority: 'high', status: 'pending', scheduled_date: '2024-12-16', estimated_cost: 350 },
  ]);

  // Budgets
  await supabase.from('budgets').insert([
    { company_id: companyId, department_id: engId, name: 'Engineering FY2024', fiscal_year: 2024, period: 'annual', total_amount: 450000, spent_amount: 312000, remaining_amount: 138000, status: 'active' },
    { company_id: companyId, department_id: slsId, name: 'Sales & Marketing FY2024', fiscal_year: 2024, period: 'annual', total_amount: 180000, spent_amount: 142000, remaining_amount: 38000, status: 'active' },
    { company_id: companyId, department_id: finId, name: 'Finance Dept FY2024', fiscal_year: 2024, period: 'annual', total_amount: 120000, spent_amount: 89000, remaining_amount: 31000, status: 'active' },
  ]);
}
