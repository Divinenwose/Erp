-- Enhanced Sales & CRM Tables for Targfit ERP
-- Adds proposals, contracts, pricing requests, feedback, satisfaction, communications, targets, forecasts, and sales activities

-- Sales Proposals / Quotations
CREATE TABLE IF NOT EXISTS sales_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  proposal_number text NOT NULL,
  opportunity_id uuid REFERENCES opportunities(id),
  customer_id uuid REFERENCES customers(id),
  title text NOT NULL,
  description text,
  subtotal numeric(15,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  discount_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  valid_until date,
  status text DEFAULT 'draft',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id),
  rejected_at timestamptz,
  rejection_reason text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales_proposals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sales_proposals_company ON sales_proposals(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_proposals_opportunity ON sales_proposals(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_sales_proposals_customer ON sales_proposals(customer_id);

-- Sales Contracts / Deals
CREATE TABLE IF NOT EXISTS sales_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contract_number text NOT NULL,
  opportunity_id uuid REFERENCES opportunities(id),
  customer_id uuid REFERENCES customers(id),
  proposal_id uuid REFERENCES sales_proposals(id),
  contract_type text DEFAULT 'new_business',
  title text NOT NULL,
  description text,
  contract_value numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  start_date date,
  end_date date,
  status text DEFAULT 'draft',
  signed_by_customer boolean DEFAULT false,
  signed_by_company boolean DEFAULT false,
  signed_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  terms text,
  renewal_terms text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales_contracts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sales_contracts_company ON sales_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_contracts_opportunity ON sales_contracts(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_sales_contracts_customer ON sales_contracts(customer_id);

-- Pricing / Discount Requests
CREATE TABLE IF NOT EXISTS pricing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_number text NOT NULL,
  opportunity_id uuid REFERENCES opportunities(id),
  customer_id uuid REFERENCES customers(id),
  product_service text NOT NULL,
  current_price numeric(15,2) DEFAULT 0,
  requested_price numeric(15,2 DEFAULT 0),
  discount_percentage numeric(5,2) DEFAULT 0,
  reason text NOT NULL,
  justification text,
  status text DEFAULT 'pending',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id),
  rejected_at timestamptz,
  rejection_reason text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pricing_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_pricing_requests_company ON pricing_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_pricing_requests_opportunity ON pricing_requests(opportunity_id);

-- Sales Activities (follow-ups, meetings, calls, demos, tasks)
CREATE TABLE IF NOT EXISTS sales_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  lead_id uuid REFERENCES leads(id),
  opportunity_id uuid REFERENCES opportunities(id),
  customer_id uuid REFERENCES customers(id),
  assigned_to uuid REFERENCES employees(id),
  activity_date date NOT NULL,
  activity_time time,
  duration_minutes integer,
  status text DEFAULT 'scheduled',
  outcome text,
  next_action text,
  next_action_date date,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales_activities ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sales_activities_company ON sales_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_activities_lead ON sales_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_activities_opportunity ON sales_activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_sales_activities_customer ON sales_activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_activities_assigned ON sales_activities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sales_activities_date ON sales_activities(activity_date);

-- Customer Communications
CREATE TABLE IF NOT EXISTS customer_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  communication_type text NOT NULL,
  subject text,
  message text,
  direction text DEFAULT 'outbound',
  status text DEFAULT 'sent',
  sent_by uuid REFERENCES auth.users(id),
  sent_at timestamptz DEFAULT now(),
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_communications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_customer_communications_company ON customer_communications(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_customer ON customer_communications(customer_id);

-- Customer Feedback
CREATE TABLE IF NOT EXISTS customer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  feedback_type text NOT NULL,
  category text,
  subject text NOT NULL,
  description text,
  severity text DEFAULT 'medium',
  status text DEFAULT 'open',
  assigned_to uuid REFERENCES employees(id),
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  resolution text,
  satisfaction_rating integer,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_customer_feedback_company ON customer_feedback(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_customer ON customer_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_status ON customer_feedback(status);

-- Customer Satisfaction
CREATE TABLE IF NOT EXISTS customer_satisfaction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  survey_date date NOT NULL,
  overall_rating integer CHECK (overall_rating >= 1 AND overall_rating <= 5),
  product_quality_rating integer CHECK (product_quality_rating >= 1 AND product_quality_rating <= 5),
  service_quality_rating integer CHECK (service_quality_rating >= 1 AND service_quality_rating <= 5),
  support_rating integer CHECK (support_rating >= 1 AND support_rating <= 5),
  pricing_rating integer CHECK (pricing_rating >= 1 AND pricing_rating <= 5),
  would_recommend boolean,
  feedback text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_satisfaction ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_company ON customer_satisfaction(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_customer ON customer_satisfaction(customer_id);

-- Sales Targets
CREATE TABLE IF NOT EXISTS sales_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  target_number text NOT NULL,
  assigned_to uuid REFERENCES employees(id),
  team_id uuid REFERENCES departments(id),
  target_type text NOT NULL,
  period_type text DEFAULT 'monthly',
  period_start date NOT NULL,
  period_end date NOT NULL,
  target_amount numeric(15,2) DEFAULT 0,
  target_quantity integer DEFAULT 0,
  achieved_amount numeric(15,2) DEFAULT 0,
  achieved_quantity integer DEFAULT 0,
  status text DEFAULT 'active',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sales_targets_company ON sales_targets(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_assigned ON sales_targets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sales_targets_team ON sales_targets(team_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_period ON sales_targets(period_start, period_end);

-- Sales Forecasts
CREATE TABLE IF NOT EXISTS sales_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  forecast_number text NOT NULL,
  forecast_type text DEFAULT 'revenue',
  period_type text DEFAULT 'monthly',
  period_start date NOT NULL,
  period_end date NOT NULL,
  forecast_amount numeric(15,2) DEFAULT 0,
  confidence_level integer DEFAULT 50,
  assumptions text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales_forecasts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sales_forecasts_company ON sales_forecasts(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_forecasts_period ON sales_forecasts(period_start, period_end);

-- Update leads table to add marketing campaign reference
ALTER TABLE leads ADD COLUMN IF NOT EXISTS marketing_campaign_id uuid REFERENCES marketing_campaigns(id);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(marketing_campaign_id);

-- Update opportunities table to add contract reference
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES sales_contracts(id);
CREATE INDEX IF NOT EXISTS idx_opportunities_contract ON opportunities(contract_id);
