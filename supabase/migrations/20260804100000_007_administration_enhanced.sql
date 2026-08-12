-- Administration Module Enhanced Migration
-- Staff Attendance, Office Inspections, Fuel Management, Drivers, Purchase Requests, Meetings, Birthdays, Calendar, Approval Workflow

-- Staff Attendance Tables
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  clock_in_time TIMESTAMP WITH TIME ZONE,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  working_hours DECIMAL(5, 2),
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave', 'holiday')),
  late_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS id_card_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  id_number TEXT UNIQUE,
  issue_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'lost', 'replacement_pending')),
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Office Inspection Tables
CREATE TABLE IF NOT EXISTS office_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('cleanliness', 'restroom', 'workspace', 'reception', 'meeting_room', 'general')),
  inspection_date DATE NOT NULL,
  inspected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  findings TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES office_inspections(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'pass' CHECK (status IN ('pass', 'fail', 'na')),
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES office_inspections(id) ON DELETE CASCADE,
  issue_description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  due_date DATE,
  resolved_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fuel Management Tables
CREATE TABLE IF NOT EXISTS fuel_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  vehicle_id UUID,
  driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  fuel_quantity DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  odometer_reading INTEGER,
  fuel_station TEXT,
  fuel_type TEXT,
  remaining_fuel DECIMAL(10, 2),
  fuel_date DATE NOT NULL,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drivers Management Tables
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  license_number TEXT UNIQUE,
  license_expiry DATE,
  license_type TEXT,
  assigned_vehicle_id UUID,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id UUID,
  trip_date DATE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  start_location TEXT,
  end_location TEXT,
  distance_km DECIMAL(10, 2),
  fuel_consumed DECIMAL(10, 2),
  purpose TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Requests Tables (Administration-specific)
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  request_number TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL,
  estimated_cost DECIMAL(12, 2),
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'admin_review', 'md_approval', 'accounts_review', 'vendor_assigned', 'completed', 'rejected', 'cancelled')),
  requested_date DATE DEFAULT CURRENT_DATE,
  required_date DATE,
  quotation_urls TEXT[],
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  actual_cost DECIMAL(12, 2),
  completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meetings Management Tables
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('daily_checkin', 'morning_devotion', 'weekly', 'management', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  meeting_room_id UUID,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  agenda TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  attendee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attendance_status TEXT DEFAULT 'invited' CHECK (attendance_status IN ('invited', 'confirmed', 'attended', 'absent', 'excused')),
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(meeting_id, attendee_id)
);

CREATE TABLE IF NOT EXISTS meeting_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  content TEXT,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Administrative Calendar Tables
CREATE TABLE IF NOT EXISTS admin_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('fumigation', 'maintenance', 'office_event', 'company_event', 'renewal', 'inspection', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  location TEXT,
  reminder_days INTEGER DEFAULT 3,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approval Workflow Tables
CREATE TABLE IF NOT EXISTS approval_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  approver_role TEXT NOT NULL,
  requires_all BOOLEAN DEFAULT false,
  is_final BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES approval_stages(id) ON DELETE CASCADE,
  stage_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS request_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  request_type TEXT NOT NULL,
  stage_id UUID NOT NULL REFERENCES approval_stages(id) ON DELETE SET NULL,
  approver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_card_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own company data" ON attendance_records
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company data" ON attendance_records
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company data" ON attendance_records
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own company data" ON attendance_records
  FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Apply similar policies to all other tables
CREATE POLICY "Users can view own company data" ON id_card_compliance
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company data" ON id_card_compliance
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company data" ON id_card_compliance
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own company data" ON id_card_compliance
  FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own company data" ON office_inspections
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company data" ON office_inspections
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company data" ON office_inspections
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own company data" ON office_inspections
  FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own company data" ON inspection_checklist_items
  FOR SELECT USING (
    inspection_id IN (
      SELECT id FROM office_inspections 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own company data" ON inspection_checklist_items
  FOR INSERT WITH CHECK (
    inspection_id IN (
      SELECT id FROM office_inspections 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update own company data" ON inspection_checklist_items
  FOR UPDATE USING (
    inspection_id IN (
      SELECT id FROM office_inspections 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own company data" ON inspection_checklist_items
  FOR DELETE USING (
    inspection_id IN (
      SELECT id FROM office_inspections 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view own company data" ON inspection_issues
  FOR SELECT USING (
    inspection_id IN (
      SELECT id FROM office_inspections 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own company data" ON inspection_issues
  FOR INSERT WITH CHECK (
    inspection_id IN (
      SELECT id FROM office_inspections 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update own company data" ON inspection_issues
  FOR UPDATE USING (
    inspection_id IN (
      SELECT id FROM office_inspections 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own company data" ON inspection_issues
  FOR DELETE USING (
    inspection_id IN (
      SELECT id FROM office_inspections 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view own company data" ON fuel_records
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company data" ON fuel_records
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company data" ON fuel_records
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own company data" ON fuel_records
  FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own company data" ON drivers
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company data" ON drivers
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company data" ON drivers
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own company data" ON drivers
  FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own company data" ON driver_trips
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company data" ON driver_trips
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company data" ON driver_trips
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own company data" ON driver_trips
  FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own company data" ON purchase_requests
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company data" ON purchase_requests
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company data" ON purchase_requests
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own company data" ON purchase_requests
  FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own company data" ON meetings
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company data" ON meetings
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company data" ON meetings
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own company data" ON meetings
  FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own company data" ON meeting_attendees
  FOR SELECT USING (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own company data" ON meeting_attendees
  FOR INSERT WITH CHECK (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update own company data" ON meeting_attendees
  FOR UPDATE USING (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own company data" ON meeting_attendees
  FOR DELETE USING (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view own company data" ON meeting_minutes
  FOR SELECT USING (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own company data" ON meeting_minutes
  FOR INSERT WITH CHECK (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update own company data" ON meeting_minutes
  FOR UPDATE USING (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own company data" ON meeting_minutes
  FOR DELETE USING (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view own company data" ON meeting_action_items
  FOR SELECT USING (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own company data" ON meeting_action_items
  FOR INSERT WITH CHECK (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update own company data" ON meeting_action_items
  FOR UPDATE USING (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own company data" ON meeting_action_items
  FOR DELETE USING (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view own company data" ON admin_calendar_events
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company data" ON admin_calendar_events
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company data" ON admin_calendar_events
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own company data" ON admin_calendar_events
  FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own company data" ON approval_stages
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company data" ON approval_stages
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company data" ON approval_stages
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own company data" ON approval_stages
  FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own company data" ON approval_workflows
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company data" ON approval_workflows
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company data" ON approval_workflows
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own company data" ON approval_workflows
  FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own company data" ON approval_workflow_stages
  FOR SELECT USING (
    workflow_id IN (
      SELECT id FROM approval_workflows 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own company data" ON approval_workflow_stages
  FOR INSERT WITH CHECK (
    workflow_id IN (
      SELECT id FROM approval_workflows 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update own company data" ON approval_workflow_stages
  FOR UPDATE USING (
    workflow_id IN (
      SELECT id FROM approval_workflows 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own company data" ON approval_workflow_stages
  FOR DELETE USING (
    workflow_id IN (
      SELECT id FROM approval_workflows 
      WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view own company data" ON request_approvals
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company data" ON request_approvals
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company data" ON request_approvals
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own company data" ON request_approvals
  FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Ensure `requester_id` exists on pre-existing `purchase_requests` tables
ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_attendance_records_company ON attendance_records(company_id);
CREATE INDEX idx_attendance_records_employee ON attendance_records(employee_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(attendance_date);
CREATE INDEX idx_id_card_compliance_company ON id_card_compliance(company_id);
CREATE INDEX idx_id_card_compliance_employee ON id_card_compliance(employee_id);
CREATE INDEX idx_office_inspections_company ON office_inspections(company_id);
CREATE INDEX idx_office_inspections_date ON office_inspections(inspection_date);
CREATE INDEX idx_inspection_checklist_items_inspection ON inspection_checklist_items(inspection_id);
CREATE INDEX idx_inspection_issues_inspection ON inspection_issues(inspection_id);
CREATE INDEX idx_fuel_records_company ON fuel_records(company_id);
CREATE INDEX idx_fuel_records_vehicle ON fuel_records(vehicle_id);
CREATE INDEX idx_fuel_records_date ON fuel_records(fuel_date);
CREATE INDEX idx_drivers_company ON drivers(company_id);
CREATE INDEX idx_drivers_employee ON drivers(employee_id);
CREATE INDEX idx_driver_trips_company ON driver_trips(company_id);
CREATE INDEX idx_driver_trips_driver ON driver_trips(driver_id);
CREATE INDEX idx_driver_trips_date ON driver_trips(trip_date);
CREATE INDEX idx_purchase_requests_company ON purchase_requests(company_id);
CREATE INDEX idx_purchase_requests_requester ON purchase_requests(requester_id);
CREATE INDEX idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX idx_meetings_company ON meetings(company_id);
CREATE INDEX idx_meetings_date ON meetings(scheduled_date);
CREATE INDEX idx_meeting_attendees_meeting ON meeting_attendees(meeting_id);
CREATE INDEX idx_meeting_attendees_attendee ON meeting_attendees(attendee_id);
CREATE INDEX idx_meeting_minutes_meeting ON meeting_minutes(meeting_id);
CREATE INDEX idx_meeting_action_items_meeting ON meeting_action_items(meeting_id);
CREATE INDEX idx_meeting_action_items_assigned ON meeting_action_items(assigned_to);
CREATE INDEX idx_admin_calendar_events_company ON admin_calendar_events(company_id);
CREATE INDEX idx_admin_calendar_events_date ON admin_calendar_events(start_date);
CREATE INDEX idx_approval_stages_company ON approval_stages(company_id);
CREATE INDEX idx_approval_workflows_company ON approval_workflows(company_id);
CREATE INDEX idx_approval_workflow_stages_workflow ON approval_workflow_stages(workflow_id);
CREATE INDEX idx_request_approvals_company ON request_approvals(company_id);
CREATE INDEX idx_request_approvals_request ON request_approvals(request_id);

-- Audit Trail Tables
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  previous_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
CREATE POLICY "Users can view own company audit logs" ON audit_logs
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company audit logs" ON audit_logs
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Ensure new audit log columns exist on pre-existing tables
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS previous_value JSONB,
  ADD COLUMN IF NOT EXISTS new_value JSONB;

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Asset Lifecycle Tables
CREATE TABLE IF NOT EXISTS asset_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('purchased', 'registered', 'assigned', 'transferred', 'maintenance', 'repair', 'retired', 'disposed', 'upgraded')),
  previous_status TEXT,
  new_status TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  previous_location TEXT,
  new_location TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  cost DECIMAL(12, 2),
  notes TEXT,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for asset_lifecycle_events
ALTER TABLE asset_lifecycle_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_lifecycle_events
CREATE POLICY "Users can view own company asset lifecycle" ON asset_lifecycle_events
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company asset lifecycle" ON asset_lifecycle_events
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Indexes for asset_lifecycle_events
CREATE INDEX idx_asset_lifecycle_company ON asset_lifecycle_events(company_id);
CREATE INDEX idx_asset_lifecycle_asset ON asset_lifecycle_events(asset_id);
CREATE INDEX idx_asset_lifecycle_type ON asset_lifecycle_events(event_type);
CREATE INDEX idx_asset_lifecycle_date ON asset_lifecycle_events(event_date);

-- Vendor Performance Tables
CREATE TABLE IF NOT EXISTS vendor_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  rating DECIMAL(3, 2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  late_deliveries INTEGER DEFAULT 0,
  rejected_deliveries INTEGER DEFAULT 0,
  avg_delivery_days DECIMAL(5, 2),
  quality_score DECIMAL(3, 2) DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
  cost_efficiency DECIMAL(5, 2) DEFAULT 0,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  last_evaluation DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS vendor_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  order_number TEXT UNIQUE,
  purchase_request_id UUID REFERENCES purchase_requests(id) ON DELETE SET NULL,
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  order_value DECIMAL(12, 2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'late', 'cancelled', 'rejected')),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for vendor performance tables
ALTER TABLE vendor_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor performance tables
CREATE POLICY "Users can view own company vendor performance" ON vendor_performance
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company vendor performance" ON vendor_performance
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company vendor performance" ON vendor_performance
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own company vendor orders" ON vendor_orders
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company vendor orders" ON vendor_orders
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company vendor orders" ON vendor_orders
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Indexes for vendor performance tables
CREATE INDEX idx_vendor_performance_company ON vendor_performance(company_id);
CREATE INDEX idx_vendor_performance_vendor ON vendor_performance(vendor_id);
CREATE INDEX idx_vendor_orders_company ON vendor_orders(company_id);
CREATE INDEX idx_vendor_orders_vendor ON vendor_orders(vendor_id);
CREATE INDEX idx_vendor_orders_date ON vendor_orders(order_date);
