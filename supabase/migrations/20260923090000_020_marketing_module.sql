-- Marketing Department Module Migration
-- Campaigns, Content, Advertising, Events, PR, Vendors, Research, Brand, Leads, Documents

-- Campaign Management
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('digital', 'print', 'social_media', 'email', 'event', 'brand_awareness', 'product_launch', 'promotion', 'other')),
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  budget DECIMAL(15, 2),
  actual_spend DECIMAL(15, 2) DEFAULT 0,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'paused', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  target_audience TEXT,
  objectives TEXT[],
  kpi_targets JSONB,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign Performance Metrics
CREATE TABLE IF NOT EXISTS campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5, 2),
  reach INTEGER DEFAULT 0,
  spend DECIMAL(15, 2) DEFAULT 0,
  revenue_generated DECIMAL(15, 2) DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, metric_date)
);

-- Content and Social Media Management
CREATE TABLE IF NOT EXISTS marketing_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('blog_post', 'social_post', 'video', 'infographic', 'ebook', 'whitepaper', 'case_study', 'email', 'ad_copy', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  content_url TEXT,
  platform TEXT CHECK (platform IN ('website', 'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'email', 'other')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
  publish_date TIMESTAMP WITH TIME ZONE,
  author UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  seo_keywords TEXT[],
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social Media Posts
CREATE TABLE IF NOT EXISTS social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  content_id UUID REFERENCES marketing_content(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'other')),
  post_url TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  published_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5, 2),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Advertising and Media Planning
CREATE TABLE IF NOT EXISTS advertising_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  marketing_campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  ad_name TEXT NOT NULL,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('display', 'search', 'social', 'video', 'native', 'print', 'tv', 'radio', 'outdoor', 'other')),
  platform TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  budget DECIMAL(15, 2),
  actual_spend DECIMAL(15, 2) DEFAULT 0,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'paused', 'completed', 'cancelled')),
  target_audience TEXT,
  creative_assets TEXT[],
  tracking_pixel TEXT,
  conversion_goal TEXT,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ad Performance
CREATE TABLE IF NOT EXISTS ad_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_campaign_id UUID NOT NULL REFERENCES advertising_campaigns(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5, 2),
  cpc DECIMAL(10, 2),
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2),
  cost_per_conversion DECIMAL(10, 2),
  spend DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ad_campaign_id, metric_date)
);

-- Events and Sponsorships
CREATE TABLE IF NOT EXISTS marketing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('conference', 'seminar', 'webinar', 'product_launch', 'trade_show', 'sponsorship', 'networking', 'other')),
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  venue TEXT,
  location TEXT,
  expected_attendees INTEGER,
  actual_attendees INTEGER,
  budget DECIMAL(15, 2),
  actual_cost DECIMAL(15, 2) DEFAULT 0,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  organizer UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event Attendees
CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES marketing_events(id) ON DELETE CASCADE,
  attendee_name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  job_title TEXT,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attendance_status TEXT DEFAULT 'registered' CHECK (attendance_status IN ('registered', 'confirmed', 'attended', 'no_show', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Public Relations and Press Releases
CREATE TABLE IF NOT EXISTS press_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  release_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
  distribution_channels TEXT[],
  media_outlets TEXT[],
  contact_person TEXT,
  contact_email TEXT,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PR Coverage Tracking
CREATE TABLE IF NOT EXISTS pr_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  press_release_id UUID NOT NULL REFERENCES press_releases(id) ON DELETE CASCADE,
  media_outlet TEXT NOT NULL,
  publication_date DATE,
  article_title TEXT,
  article_url TEXT,
  reach INTEGER,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing Vendors and Contracts
CREATE TABLE IF NOT EXISTS marketing_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  vendor_type TEXT NOT NULL CHECK (vendor_type IN ('agency', 'freelancer', 'media', 'printing', 'event', 'software', 'other')),
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  services_offered TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  rating DECIMAL(2, 1) CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing Contracts
CREATE TABLE IF NOT EXISTS marketing_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES marketing_vendors(id) ON DELETE CASCADE,
  contract_number TEXT UNIQUE,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('retainer', 'project', 'service', 'licensing', 'sponsorship', 'other')),
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  contract_value DECIMAL(15, 2),
  payment_terms TEXT,
  deliverables TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'pending', 'active', 'expired', 'terminated', 'renewed')),
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  contract_document_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market Research and Surveys
CREATE TABLE IF NOT EXISTS market_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  research_title TEXT NOT NULL,
  research_type TEXT NOT NULL CHECK (research_type IN ('survey', 'focus_group', 'interview', 'competitor_analysis', 'market_trend', 'customer_feedback', 'other')),
  description TEXT,
  start_date DATE,
  end_date DATE,
  target_audience TEXT,
  sample_size INTEGER,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  budget DECIMAL(15, 2),
  conducted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Survey Questions
CREATE TABLE IF NOT EXISTS survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id UUID NOT NULL REFERENCES market_research(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'rating', 'open_ended', 'yes_no', 'ranking')),
  options TEXT[],
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Survey Responses
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id UUID NOT NULL REFERENCES market_research(id) ON DELETE CASCADE,
  respondent_id TEXT,
  response_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responses JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brand Management
CREATE TABLE IF NOT EXISTS brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('logo', 'color_palette', 'typography', 'guidelines', 'templates', 'images', 'videos', 'other')),
  description TEXT,
  asset_url TEXT,
  version TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'archived')),
  usage_guidelines TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brand Guidelines
CREATE TABLE IF NOT EXISTS brand_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  guideline_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('voice', 'visual', 'messaging', 'positioning', 'other')),
  content TEXT NOT NULL,
  version TEXT,
  effective_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead Generation
CREATE TABLE IF NOT EXISTS marketing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  source TEXT CHECK (source IN ('website', 'social_media', 'email', 'event', 'referral', 'advertising', 'other')),
  lead_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  interest TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  lead_score INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead Activities
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES marketing_leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'status_change', 'other')),
  description TEXT,
  activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing Documents and Trackers
CREATE TABLE IF NOT EXISTS marketing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('plan', 'report', 'contract', 'creative', 'guideline', 'presentation', 'spreadsheet', 'other')),
  category TEXT,
  description TEXT,
  document_url TEXT,
  version TEXT,
  related_campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  related_event_id UUID REFERENCES marketing_events(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing Budgets
CREATE TABLE IF NOT EXISTS marketing_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  quarter TEXT CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4', 'annual')),
  category TEXT NOT NULL CHECK (category IN ('campaigns', 'advertising', 'events', 'content', 'pr', 'research', 'brand', 'other')),
  allocated_amount DECIMAL(15, 2) NOT NULL,
  spent_amount DECIMAL(15, 2) DEFAULT 0,
  remaining_amount DECIMAL(15, 2) GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'adjusted')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, fiscal_year, quarter, category)
);

-- Approval Workflows
CREATE TABLE IF NOT EXISTS marketing_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('campaign', 'content', 'advertising', 'event', 'press_release', 'contract', 'budget', 'other')),
  entity_id UUID NOT NULL,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approval_level TEXT NOT NULL CHECK (approval_level IN ('manager', 'director', 'vp', 'other')),
  assigned_to UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  comments TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_company ON marketing_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_dates ON marketing_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign ON campaign_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_content_company ON marketing_content(company_id);
CREATE INDEX IF NOT EXISTS idx_marketing_content_status ON marketing_content(status);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_company ON social_media_posts(company_id);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_platform ON social_media_posts(platform);
CREATE INDEX IF NOT EXISTS idx_advertising_campaigns_company ON advertising_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_advertising_campaigns_status ON advertising_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_performance_campaign ON ad_performance(ad_campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_events_company ON marketing_events(company_id);
CREATE INDEX IF NOT EXISTS idx_marketing_events_dates ON marketing_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_press_releases_company ON press_releases(company_id);
CREATE INDEX IF NOT EXISTS idx_pr_coverage_release ON pr_coverage(press_release_id);
CREATE INDEX IF NOT EXISTS idx_marketing_vendors_company ON marketing_vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_marketing_vendors_type ON marketing_vendors(vendor_type);
CREATE INDEX IF NOT EXISTS idx_marketing_contracts_company ON marketing_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_marketing_contracts_vendor ON marketing_contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_market_research_company ON market_research(company_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_research ON survey_questions(research_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_research ON survey_responses(research_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_company ON brand_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_brand_guidelines_company ON brand_guidelines(company_id);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_company ON marketing_leads(company_id);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_status ON marketing_leads(status);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_marketing_documents_company ON marketing_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_marketing_budgets_company ON marketing_budgets(company_id);
CREATE INDEX IF NOT EXISTS idx_marketing_approvals_company ON marketing_approvals(company_id);
CREATE INDEX IF NOT EXISTS idx_marketing_approvals_entity ON marketing_approvals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_marketing_approvals_status ON marketing_approvals(status);

-- Enable Row Level Security
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertising_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE press_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company isolation for marketing_campaigns" ON marketing_campaigns
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for campaign_metrics" ON campaign_metrics
  FOR ALL USING (EXISTS (
    SELECT 1 FROM marketing_campaigns 
    WHERE marketing_campaigns.id = campaign_metrics.campaign_id 
    AND marketing_campaigns.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Company isolation for marketing_content" ON marketing_content
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for social_media_posts" ON social_media_posts
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for advertising_campaigns" ON advertising_campaigns
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for ad_performance" ON ad_performance
  FOR ALL USING (EXISTS (
    SELECT 1 FROM advertising_campaigns 
    WHERE advertising_campaigns.id = ad_performance.ad_campaign_id 
    AND advertising_campaigns.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Company isolation for marketing_events" ON marketing_events
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for event_attendees" ON event_attendees
  FOR ALL USING (EXISTS (
    SELECT 1 FROM marketing_events 
    WHERE marketing_events.id = event_attendees.event_id 
    AND marketing_events.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Company isolation for press_releases" ON press_releases
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for pr_coverage" ON pr_coverage
  FOR ALL USING (EXISTS (
    SELECT 1 FROM press_releases 
    WHERE press_releases.id = pr_coverage.press_release_id 
    AND press_releases.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Company isolation for marketing_vendors" ON marketing_vendors
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for marketing_contracts" ON marketing_contracts
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for market_research" ON market_research
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for survey_questions" ON survey_questions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM market_research 
    WHERE market_research.id = survey_questions.research_id 
    AND market_research.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Company isolation for survey_responses" ON survey_responses
  FOR ALL USING (EXISTS (
    SELECT 1 FROM market_research 
    WHERE market_research.id = survey_responses.research_id 
    AND market_research.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Company isolation for brand_assets" ON brand_assets
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for brand_guidelines" ON brand_guidelines
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for marketing_leads" ON marketing_leads
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for lead_activities" ON lead_activities
  FOR ALL USING (EXISTS (
    SELECT 1 FROM marketing_leads 
    WHERE marketing_leads.id = lead_activities.lead_id 
    AND marketing_leads.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Company isolation for marketing_documents" ON marketing_documents
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for marketing_budgets" ON marketing_budgets
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for marketing_approvals" ON marketing_approvals
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_content_updated_at BEFORE UPDATE ON marketing_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_media_posts_updated_at BEFORE UPDATE ON social_media_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advertising_campaigns_updated_at BEFORE UPDATE ON advertising_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_performance_updated_at BEFORE UPDATE ON ad_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_events_updated_at BEFORE UPDATE ON marketing_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_press_releases_updated_at BEFORE UPDATE ON press_releases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_vendors_updated_at BEFORE UPDATE ON marketing_vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_contracts_updated_at BEFORE UPDATE ON marketing_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_research_updated_at BEFORE UPDATE ON market_research
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_assets_updated_at BEFORE UPDATE ON brand_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_guidelines_updated_at BEFORE UPDATE ON brand_guidelines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_leads_updated_at BEFORE UPDATE ON marketing_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_documents_updated_at BEFORE UPDATE ON marketing_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_budgets_updated_at BEFORE UPDATE ON marketing_budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
