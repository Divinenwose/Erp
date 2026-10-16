-- Media Department Module Migration
-- Content Management, Media Assets, Campaigns, Press Releases, Social Media, Advertising, PR & Media Coverage, Event Coverage, Internal Communications, Newsletters, Audience Analytics, Interviews, Brand & Messaging, Copyright & Compliance, Media Issues, Vendors & Partners, Policies & Documents

-- Media Requests (workflow initiator)
CREATE TABLE IF NOT EXISTS media_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_number TEXT UNIQUE,
  request_type TEXT NOT NULL CHECK (request_type IN ('content', 'campaign', 'press_release', 'social_media', 'advertising', 'event_coverage', 'interview', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_date DATE,
  budget DECIMAL(15, 2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'in_progress', 'completed', 'rejected', 'cancelled')),
  workflow_stage TEXT DEFAULT 'request' CHECK (workflow_stage IN ('request', 'review', 'documents', 'authorization', 'creation', 'publishing', 'monitoring', 'documentation', 'closure')),
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  supporting_documents TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media Content (extends marketing_content for media-specific content)
CREATE TABLE IF NOT EXISTS media_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  media_request_id UUID REFERENCES media_requests(id) ON DELETE SET NULL,
  content_number TEXT UNIQUE,
  content_type TEXT NOT NULL CHECK (content_type IN ('digital', 'print', 'video', 'audio', 'infographic', 'blog_post', 'article', 'press_release', 'social_post', 'newsletter', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  content_url TEXT,
  thumbnail_url TEXT,
  file_size BIGINT,
  duration_seconds INTEGER,
  platform TEXT CHECK (platform IN ('website', 'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'email', 'print', 'tv', 'radio', 'other')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived', 'deleted')),
  publish_date TIMESTAMP WITH TIME ZONE,
  author UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  seo_keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media Assets (separate from brand assets - for media file management)
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_number TEXT UNIQUE,
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'video', 'audio', 'document', 'graphic', 'logo', 'template', 'other')),
  category TEXT CHECK (category IN ('photography', 'videography', 'graphics', 'documents', 'templates', 'brand_assets', 'other')),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size BIGINT,
  file_format TEXT,
  dimensions TEXT,
  duration_seconds INTEGER,
  description TEXT,
  tags TEXT[],
  copyright_info TEXT,
  license_type TEXT CHECK (license_type IN ('owned', 'licensed', 'royalty_free', 'creative_commons', 'public_domain', 'other')),
  license_expiry DATE,
  usage_restrictions TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media Campaigns (separate from marketing_campaigns for media-specific campaigns)
CREATE TABLE IF NOT EXISTS media_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_number TEXT UNIQUE,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('brand_awareness', 'product_launch', 'promotional', 'event_promotion', 'crisis_management', 'internal_communication', 'other')),
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

-- Media Press Releases (extends press_releases for media-specific PR)
CREATE TABLE IF NOT EXISTS media_press_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  media_request_id UUID REFERENCES media_requests(id) ON DELETE SET NULL,
  media_campaign_id UUID REFERENCES media_campaigns(id) ON DELETE SET NULL,
  release_number TEXT UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  release_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
  distribution_channels TEXT[],
  media_outlets TEXT[],
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media Coverage (extends pr_coverage for media-specific coverage tracking)
CREATE TABLE IF NOT EXISTS media_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  press_release_id UUID REFERENCES media_press_releases(id) ON DELETE SET NULL,
  media_outlet TEXT NOT NULL,
  outlet_type TEXT CHECK (outlet_type IN ('newspaper', 'magazine', 'tv', 'radio', 'online', 'blog', 'social_media', 'other')),
  publication_date DATE,
  article_title TEXT,
  article_url TEXT,
  author TEXT,
  reach INTEGER,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  coverage_type TEXT CHECK (coverage_type IN ('mention', 'feature', 'interview', 'review', 'other')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event Coverage Requests
CREATE TABLE IF NOT EXISTS event_coverage_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  media_request_id UUID REFERENCES media_requests(id) ON DELETE SET NULL,
  request_number TEXT UNIQUE,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('conference', 'seminar', 'webinar', 'product_launch', 'trade_show', 'press_conference', 'internal_event', 'other')),
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT,
  location TEXT,
  coverage_type TEXT[] CHECK (coverage_type IN ('photography', 'videography', 'interviews', 'live_streaming', 'social_media', 'press_release', 'other')),
  budget DECIMAL(15, 2),
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'assigned', 'in_progress', 'completed', 'cancelled')),
  assigned_team TEXT[],
  deliverables TEXT[],
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event Coverage Records
CREATE TABLE IF NOT EXISTS event_coverage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_request_id UUID NOT NULL REFERENCES event_coverage_requests(id) ON DELETE CASCADE,
  coverage_type TEXT NOT NULL,
  coverage_url TEXT,
  thumbnail_url TEXT,
  description TEXT,
  coverage_date TIMESTAMP WITH TIME ZONE,
  reach INTEGER,
  engagement_metrics JSONB,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Internal Communications & Company Announcements
CREATE TABLE IF NOT EXISTS internal_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  communication_number TEXT UNIQUE,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('announcement', 'policy_update', 'news', 'alert', 'celebration', 'other')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_audience TEXT CHECK (target_audience IN ('all', 'management', 'department', 'location', 'custom')),
  target_departments TEXT[],
  target_locations TEXT[],
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'archived')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  sent_date TIMESTAMP WITH TIME ZONE,
  channels TEXT[] CHECK (channels IN ('email', 'intranet', 'slack', 'sms', 'other')),
  read_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Newsletters
CREATE TABLE IF NOT EXISTS newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  newsletter_number TEXT UNIQUE,
  newsletter_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  template_id UUID,
  target_audience TEXT CHECK (target_audience IN ('all', 'subscribers', 'customers', 'employees', 'custom')),
  segment_criteria JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'archived')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  sent_date TIMESTAMP WITH TIME ZONE,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  unsubscribe_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audience Analytics & Engagement
CREATE TABLE IF NOT EXISTS audience_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  content_id UUID REFERENCES media_content(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES media_campaigns(id) ON DELETE SET NULL,
  platform TEXT,
  metric_date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5, 2),
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  time_on_site DECIMAL(10, 2),
  bounce_rate DECIMAL(5, 2),
  demographics JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(content_id, campaign_id, platform, metric_date)
);

-- Interviews & Leadership Visibility
CREATE TABLE IF NOT EXISTS media_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  media_request_id UUID REFERENCES media_requests(id) ON DELETE SET NULL,
  interview_number TEXT UNIQUE,
  interview_title TEXT NOT NULL,
  interview_type TEXT NOT NULL CHECK (interview_type IN ('tv', 'radio', 'podcast', 'print', 'online', 'webinar', 'other')),
  interviewer_name TEXT,
  media_outlet TEXT,
  interviewee UUID REFERENCES profiles(id) ON DELETE SET NULL,
  interviewee_title TEXT,
  interview_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'published')),
  interview_url TEXT,
  transcript_url TEXT,
  reach INTEGER,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  key_topics TEXT[],
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brand & Messaging (extends brand_guidelines for media-specific brand management)
CREATE TABLE IF NOT EXISTS media_brand_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  guideline_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('voice', 'visual', 'messaging', 'positioning', 'media_tone', 'crisis_communication', 'other')),
  content TEXT NOT NULL,
  version TEXT,
  effective_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Copyright, Licensing & Compliance
CREATE TABLE IF NOT EXISTS copyright_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  license_number TEXT UNIQUE,
  asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  content_id UUID REFERENCES media_content(id) ON DELETE SET NULL,
  license_type TEXT NOT NULL CHECK (license_type IN ('owned', 'licensed', 'royalty_free', 'creative_commons', 'public_domain', 'custom')),
  licensor TEXT,
  license_date DATE,
  expiry_date DATE,
  usage_rights TEXT[],
  restrictions TEXT,
  cost DECIMAL(15, 2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated', 'renewed')),
  compliance_notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media Issues / Negative Publicity / Communication Incidents
CREATE TABLE IF NOT EXISTS media_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  issue_number TEXT UNIQUE,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('negative_publicity', 'crisis', 'misinformation', 'brand_damage', 'compliance_violation', 'other')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  source TEXT,
  source_url TEXT,
  detected_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'responding', 'resolved', 'closed')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  response_strategy TEXT,
  response_actions TEXT[],
  resolution_notes TEXT,
  impact_assessment JSONB,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media Vendors & Partners (link to existing procurement vendors where applicable)
CREATE TABLE IF NOT EXISTS media_vendor_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  procurement_vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name TEXT,
  vendor_type TEXT NOT NULL CHECK (vendor_type IN ('media_outlet', 'agency', 'freelancer', 'influencer', 'production_company', 'printing', 'other')),
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  services_offered TEXT[],
  relationship_type TEXT CHECK (relationship_type IN ('preferred', 'contract', 'one_time', 'other')),
  rating DECIMAL(2, 1) CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media Policies, Briefs, Templates, Checklists & Documents
CREATE TABLE IF NOT EXISTS media_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_number TEXT UNIQUE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('policy', 'brief', 'template', 'checklist', 'guideline', 'report', 'contract', 'other')),
  category TEXT,
  description TEXT,
  document_url TEXT,
  version TEXT,
  effective_date DATE,
  expiry_date DATE,
  related_request_id UUID REFERENCES media_requests(id) ON DELETE SET NULL,
  related_campaign_id UUID REFERENCES media_campaigns(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived', 'deleted')),
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media Approvals (workflow approval tracking)
CREATE TABLE IF NOT EXISTS media_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('media_request', 'media_content', 'media_campaign', 'press_release', 'event_coverage', 'internal_communication', 'newsletter', 'other')),
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
CREATE INDEX IF NOT EXISTS idx_media_requests_company ON media_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_media_requests_status ON media_requests(status);
CREATE INDEX IF NOT EXISTS idx_media_requests_workflow ON media_requests(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_media_content_company ON media_content(company_id);
CREATE INDEX IF NOT EXISTS idx_media_content_status ON media_content(status);
CREATE INDEX IF NOT EXISTS idx_media_content_type ON media_content(content_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_company ON media_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_category ON media_assets(category);
CREATE INDEX IF NOT EXISTS idx_media_campaigns_company ON media_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_media_campaigns_status ON media_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_media_press_releases_company ON media_press_releases(company_id);
CREATE INDEX IF NOT EXISTS idx_media_press_releases_status ON media_press_releases(status);
CREATE INDEX IF NOT EXISTS idx_media_coverage_company ON media_coverage(company_id);
CREATE INDEX IF NOT EXISTS idx_media_coverage_release ON media_coverage(press_release_id);
CREATE INDEX IF NOT EXISTS idx_event_coverage_requests_company ON event_coverage_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_event_coverage_requests_status ON event_coverage_requests(status);
CREATE INDEX IF NOT EXISTS idx_event_coverage_records_request ON event_coverage_records(event_request_id);
CREATE INDEX IF NOT EXISTS idx_internal_communications_company ON internal_communications(company_id);
CREATE INDEX IF NOT EXISTS idx_internal_communications_status ON internal_communications(status);
CREATE INDEX IF NOT EXISTS idx_newsletters_company ON newsletters(company_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters(status);
CREATE INDEX IF NOT EXISTS idx_audience_analytics_company ON audience_analytics(company_id);
CREATE INDEX IF NOT EXISTS idx_audience_analytics_content ON audience_analytics(content_id);
CREATE INDEX IF NOT EXISTS idx_audience_analytics_campaign ON audience_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_media_interviews_company ON media_interviews(company_id);
CREATE INDEX IF NOT EXISTS idx_media_interviews_status ON media_interviews(status);
CREATE INDEX IF NOT EXISTS idx_media_brand_guidelines_company ON media_brand_guidelines(company_id);
CREATE INDEX IF NOT EXISTS idx_copyright_licenses_company ON copyright_licenses(company_id);
CREATE INDEX IF NOT EXISTS idx_copyright_licenses_asset ON copyright_licenses(asset_id);
CREATE INDEX IF NOT EXISTS idx_media_issues_company ON media_issues(company_id);
CREATE INDEX IF NOT EXISTS idx_media_issues_status ON media_issues(status);
CREATE INDEX IF NOT EXISTS idx_media_issues_severity ON media_issues(severity);
CREATE INDEX IF NOT EXISTS idx_media_vendor_relationships_company ON media_vendor_relationships(company_id);
CREATE INDEX IF NOT EXISTS idx_media_vendor_relationships_vendor ON media_vendor_relationships(procurement_vendor_id);
CREATE INDEX IF NOT EXISTS idx_media_documents_company ON media_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_media_documents_type ON media_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_media_approvals_company ON media_approvals(company_id);
CREATE INDEX IF NOT EXISTS idx_media_approvals_entity ON media_approvals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_media_approvals_status ON media_approvals(status);

-- Enable Row Level Security
ALTER TABLE media_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_press_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_coverage_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_coverage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_brand_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE copyright_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_vendor_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company isolation for media_requests" ON media_requests
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for media_content" ON media_content
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for media_assets" ON media_assets
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for media_campaigns" ON media_campaigns
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for media_press_releases" ON media_press_releases
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for media_coverage" ON media_coverage
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for event_coverage_requests" ON event_coverage_requests
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for event_coverage_records" ON event_coverage_records
  FOR ALL USING (EXISTS (
    SELECT 1 FROM event_coverage_requests 
    WHERE event_coverage_requests.id = event_coverage_records.event_request_id 
    AND event_coverage_requests.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Company isolation for internal_communications" ON internal_communications
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for newsletters" ON newsletters
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for audience_analytics" ON audience_analytics
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for media_interviews" ON media_interviews
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for media_brand_guidelines" ON media_brand_guidelines
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for copyright_licenses" ON copyright_licenses
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for media_issues" ON media_issues
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for media_vendor_relationships" ON media_vendor_relationships
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for media_documents" ON media_documents
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company isolation for media_approvals" ON media_approvals
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_media_requests_updated_at BEFORE UPDATE ON media_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_content_updated_at BEFORE UPDATE ON media_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_assets_updated_at BEFORE UPDATE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_campaigns_updated_at BEFORE UPDATE ON media_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_press_releases_updated_at BEFORE UPDATE ON media_press_releases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_coverage_requests_updated_at BEFORE UPDATE ON event_coverage_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_internal_communications_updated_at BEFORE UPDATE ON internal_communications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletters_updated_at BEFORE UPDATE ON newsletters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audience_analytics_updated_at BEFORE UPDATE ON audience_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_interviews_updated_at BEFORE UPDATE ON media_interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_brand_guidelines_updated_at BEFORE UPDATE ON media_brand_guidelines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_copyright_licenses_updated_at BEFORE UPDATE ON copyright_licenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_issues_updated_at BEFORE UPDATE ON media_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_vendor_relationships_updated_at BEFORE UPDATE ON media_vendor_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_documents_updated_at BEFORE UPDATE ON media_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
