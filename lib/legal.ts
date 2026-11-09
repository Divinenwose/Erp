import type { LegalRecord } from '@/lib/supabase';

export type LegalRecordType =
  | 'request'
  | 'contract'
  | 'draft'
  | 'template'
  | 'opinion'
  | 'compliance'
  | 'governance'
  | 'litigation'
  | 'dispute'
  | 'risk'
  | 'intellectual_property'
  | 'employment'
  | 'counsel'
  | 'policy'
  | 'document'
  | 'obligation';

export interface LegalModule {
  key: string;
  title: string;
  description: string;
  href: string;
  recordTypes: LegalRecordType[];
  permission: string;
}

export interface LegalField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'textarea' | 'select';
  options?: string[];
}

export const legalRecordFields: Record<LegalRecordType, LegalField[]> = {
  request: [
    { key: 'request_type', label: 'Request type', type: 'select', options: ['Legal advice', 'Contract review', 'Contract drafting', 'NDA review', 'Regulatory review', 'Policy review', 'Employment advice', 'Dispute resolution', 'Litigation support', 'Intellectual property', 'Governance advice', 'Legal research', 'Document preparation', 'Other'] },
    { key: 'business_justification', label: 'Business justification', type: 'textarea' },
    { key: 'legal_question', label: 'Legal question / issue', type: 'textarea' },
    { key: 'required_by', label: 'Required completion date', type: 'date' },
    { key: 'confidentiality', label: 'Confidentiality', type: 'select', options: ['Internal', 'Confidential', 'Privileged'] },
    { key: 'recommendations', label: 'Legal recommendations', type: 'textarea' },
    { key: 'resolution_summary', label: 'Resolution summary', type: 'textarea' },
  ],
  contract: [
    { key: 'contracting_parties', label: 'Contracting parties', type: 'textarea' },
    { key: 'external_party_details', label: 'External party details', type: 'textarea' },
    { key: 'internal_owner', label: 'Internal contract owner', type: 'text' },
    { key: 'notice_period_days', label: 'Notice period (days)', type: 'number' },
    { key: 'key_obligations', label: 'Key obligations', type: 'textarea' },
    { key: 'payment_terms', label: 'Payment terms', type: 'textarea' },
    { key: 'governing_law', label: 'Governing law / jurisdiction', type: 'text' },
    { key: 'execution_status', label: 'Execution status', type: 'select', options: ['Not started', 'Awaiting signature', 'Partially signed', 'Executed'] },
    { key: 'related_purchase_order', label: 'Related purchase order reference', type: 'text' },
    { key: 'related_project', label: 'Related project reference', type: 'text' },
  ],
  draft: [
    { key: 'template_reference', label: 'Approved template reference', type: 'text' },
    { key: 'document_version', label: 'Draft version', type: 'text' },
    { key: 'related_contract', label: 'Related contract reference', type: 'text' },
    { key: 'reviewer', label: 'Assigned reviewer', type: 'text' },
    { key: 'confidentiality', label: 'Confidentiality', type: 'select', options: ['Internal', 'Confidential', 'Privileged'] },
  ],
  template: [
    { key: 'template_type', label: 'Template type', type: 'select', options: ['NDA', 'Service agreement', 'Employment contract', 'Consultancy agreement', 'Supplier agreement', 'Customer agreement', 'Legal notice', 'Letter of demand', 'Memorandum', 'Policy', 'Other'] },
    { key: 'template_reference', label: 'Template reference', type: 'text' },
    { key: 'template_version', label: 'Version', type: 'text' },
    { key: 'template_content', label: 'Template text (plain text)', type: 'textarea' },
    { key: 'document_owner', label: 'Document owner', type: 'text' },
    { key: 'effective_date', label: 'Effective date', type: 'date' },
    { key: 'review_date', label: 'Review date', type: 'date' },
    { key: 'publication_status', label: 'Publication status', type: 'select', options: ['Draft', 'Under review', 'Approved', 'Published', 'Archived'] },
  ],
  opinion: [
    { key: 'legal_question', label: 'Legal question', type: 'textarea' },
    { key: 'background_facts', label: 'Background and relevant facts', type: 'textarea' },
    { key: 'legal_authorities', label: 'Legislation / legal authority', type: 'textarea' },
    { key: 'research_analysis', label: 'Research and analysis', type: 'textarea' },
    { key: 'identified_risks', label: 'Identified risks', type: 'textarea' },
    { key: 'recommendations', label: 'Legal recommendations', type: 'textarea' },
    { key: 'prepared_by', label: 'Prepared by', type: 'text' },
    { key: 'reviewed_by', label: 'Reviewed by', type: 'text' },
    { key: 'issued_date', label: 'Date issued', type: 'date' },
    { key: 'confidentiality', label: 'Confidentiality', type: 'select', options: ['Internal', 'Confidential', 'Privileged'] },
  ],
  compliance: [
    { key: 'regulatory_authority', label: 'Regulatory authority', type: 'text' },
    { key: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
    { key: 'applicable_activity', label: 'Applicable department / activity', type: 'text' },
    { key: 'effective_date', label: 'Effective date', type: 'date' },
    { key: 'compliance_frequency', label: 'Compliance frequency', type: 'text' },
    { key: 'evidence_summary', label: 'Evidence of compliance', type: 'textarea' },
    { key: 'identified_gaps', label: 'Identified gaps', type: 'textarea' },
    { key: 'remediation_actions', label: 'Corrective / remediation actions', type: 'textarea' },
    { key: 'review_date', label: 'Next review / filing date', type: 'date' },
  ],
  governance: [
    { key: 'governance_record_type', label: 'Governance record type', type: 'select', options: ['Board', 'Committee', 'Meeting', 'Agenda', 'Minutes', 'Resolution', 'Statutory register', 'Corporate filing', 'Conflict of interest', 'Other'] },
    { key: 'meeting_date', label: 'Meeting date', type: 'date' },
    { key: 'attendees', label: 'Directors / participants', type: 'textarea' },
    { key: 'resolution', label: 'Resolution / decision', type: 'textarea' },
    { key: 'responsible_person', label: 'Implementation owner', type: 'text' },
    { key: 'implementation_status', label: 'Implementation status', type: 'select', options: ['Not started', 'In progress', 'Completed', 'Overdue'] },
    { key: 'access_classification', label: 'Access classification', type: 'select', options: ['Restricted', 'Confidential', 'Internal'] },
  ],
  litigation: [
    { key: 'parties', label: 'Parties involved', type: 'textarea' },
    { key: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
    { key: 'court_or_body', label: 'Court / dispute resolution body', type: 'text' },
    { key: 'case_number', label: 'Case number', type: 'text' },
    { key: 'initiated_date', label: 'Date initiated', type: 'date' },
    { key: 'filing_deadline', label: 'Filing deadline', type: 'date' },
    { key: 'hearing_date', label: 'Next hearing date', type: 'date' },
    { key: 'external_counsel', label: 'External counsel', type: 'text' },
    { key: 'financial_exposure', label: 'Financial exposure', type: 'number' },
    { key: 'legal_strategy', label: 'Legal strategy / case notes', type: 'textarea' },
    { key: 'resolution_or_judgment', label: 'Resolution / judgment', type: 'textarea' },
  ],
  dispute: [
    { key: 'parties', label: 'Parties involved', type: 'textarea' },
    { key: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
    { key: 'resolution_body', label: 'Resolution body / method', type: 'text' },
    { key: 'external_counsel', label: 'External counsel', type: 'text' },
    { key: 'financial_exposure', label: 'Financial exposure', type: 'number' },
    { key: 'settlement_terms', label: 'Settlement / resolution terms', type: 'textarea' },
  ],
  risk: [
    { key: 'risk_category', label: 'Risk category', type: 'select', options: ['Contractual', 'Regulatory', 'Employment', 'Litigation', 'Intellectual property', 'Governance', 'Data protection', 'Commercial', 'Licensing', 'Operational', 'Other'] },
    { key: 'existing_controls', label: 'Existing controls', type: 'textarea' },
    { key: 'mitigation_strategy', label: 'Mitigation strategy', type: 'textarea' },
    { key: 'residual_risk_rating', label: 'Residual risk rating', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
    { key: 'risk_owner', label: 'Risk owner', type: 'text' },
    { key: 'review_date', label: 'Review date', type: 'date' },
    { key: 'target_resolution_date', label: 'Target resolution date', type: 'date' },
  ],
  intellectual_property: [
    { key: 'ip_type', label: 'IP type', type: 'select', options: ['Trademark', 'Copyright', 'Patent', 'Industrial design', 'Domain name', 'Trade secret', 'Other'] },
    { key: 'asset_owner', label: 'Owner', type: 'text' },
    { key: 'registration_number', label: 'Registration / application number', type: 'text' },
    { key: 'registration_authority', label: 'Registration authority', type: 'text' },
    { key: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
    { key: 'filing_date', label: 'Filing date', type: 'date' },
    { key: 'registration_date', label: 'Registration date', type: 'date' },
    { key: 'expiry_date', label: 'Expiry date', type: 'date' },
    { key: 'renewal_requirements', label: 'Renewal requirements', type: 'textarea' },
    { key: 'registration_verified', label: 'Registration verified against evidence', type: 'select', options: ['Not verified', 'Verified'] },
  ],
  employment: [
    { key: 'employee_reference', label: 'Existing employee reference', type: 'text' },
    { key: 'matter_category', label: 'Matter category', type: 'select', options: ['Contract review', 'Labour law advice', 'Disciplinary', 'Grievance', 'Termination review', 'Employment dispute', 'Workplace policy', 'Labour compliance', 'Other'] },
    { key: 'relevant_policy_or_contract', label: 'Relevant policy / contract', type: 'text' },
    { key: 'legal_assessment', label: 'Legal assessment', type: 'textarea' },
    { key: 'recommendations', label: 'Recommendations', type: 'textarea' },
    { key: 'resolution', label: 'Resolution', type: 'textarea' },
    { key: 'confidentiality', label: 'Confidentiality', type: 'select', options: ['Confidential', 'Privileged'] },
  ],
  counsel: [
    { key: 'firm_or_counsel_name', label: 'Firm / counsel name', type: 'text' },
    { key: 'contact_details', label: 'Contact details', type: 'textarea' },
    { key: 'specialization', label: 'Specialization', type: 'text' },
    { key: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
    { key: 'engagement_start', label: 'Engagement start date', type: 'date' },
    { key: 'engagement_end', label: 'Engagement end date', type: 'date' },
    { key: 'fee_structure', label: 'Fee structure', type: 'textarea' },
    { key: 'agreed_budget', label: 'Agreed budget', type: 'number' },
    { key: 'performance_notes', label: 'Performance notes', type: 'textarea' },
  ],
  policy: [
    { key: 'policy_reference', label: 'Policy reference', type: 'text' },
    { key: 'policy_version', label: 'Version', type: 'text' },
    { key: 'document_owner', label: 'Document owner', type: 'text' },
    { key: 'effective_date', label: 'Effective date', type: 'date' },
    { key: 'review_date', label: 'Review date', type: 'date' },
    { key: 'applicable_departments', label: 'Applicable departments', type: 'textarea' },
    { key: 'publication_status', label: 'Publication status', type: 'select', options: ['Draft', 'Under review', 'Approved', 'Published', 'Retired'] },
  ],
  document: [
    { key: 'document_category', label: 'Document category', type: 'text' },
    { key: 'document_owner', label: 'Document owner', type: 'text' },
    { key: 'document_version', label: 'Version', type: 'text' },
    { key: 'approval_status', label: 'Approval status', type: 'select', options: ['Draft', 'Under review', 'Approved', 'Rejected', 'Archived'] },
    { key: 'review_date', label: 'Review / expiry date', type: 'date' },
    { key: 'related_matter', label: 'Related legal matter reference', type: 'text' },
    { key: 'access_classification', label: 'Access classification', type: 'select', options: ['Restricted', 'Confidential', 'Internal'] },
  ],
  obligation: [
    { key: 'obligation_type', label: 'Obligation type', type: 'text' },
    { key: 'regulatory_authority', label: 'Regulatory authority', type: 'text' },
    { key: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
    { key: 'compliance_frequency', label: 'Compliance frequency', type: 'text' },
    { key: 'responsible_officer', label: 'Responsible officer', type: 'text' },
    { key: 'evidence_summary', label: 'Evidence of compliance', type: 'textarea' },
    { key: 'corrective_actions', label: 'Corrective actions', type: 'textarea' },
    { key: 'review_date', label: 'Next review / filing date', type: 'date' },
  ],
};

export const legalModules: LegalModule[] = [
  { key: 'requests', title: 'Requests & Advisory', description: 'Submit and track requests for legal support.', href: '/legal/requests', recordTypes: ['request'], permission: 'legal.requests' },
  { key: 'contracts', title: 'Contract Management', description: 'Track contract reviews, approvals, terms, and renewal dates.', href: '/legal/contracts', recordTypes: ['contract'], permission: 'legal.contracts' },
  { key: 'advisory', title: 'Opinions & Research', description: 'Record formal legal opinions and advisory research.', href: '/legal/advisory', recordTypes: ['opinion'], permission: 'legal.advisory' },
  { key: 'compliance', title: 'Compliance & Obligations', description: 'Monitor regulatory obligations, evidence, and deadlines.', href: '/legal/compliance', recordTypes: ['compliance', 'obligation'], permission: 'legal.compliance' },
  { key: 'governance', title: 'Corporate Governance', description: 'Maintain governance records and resolution follow-ups.', href: '/legal/governance', recordTypes: ['governance'], permission: 'legal.governance' },
  { key: 'disputes', title: 'Litigation & Disputes', description: 'Manage confidential litigation, disputes, and case deadlines.', href: '/legal/disputes', recordTypes: ['litigation', 'dispute'], permission: 'legal.litigation' },
  { key: 'risks', title: 'Legal Risk Management', description: 'Assess, assign, and mitigate legal risks.', href: '/legal/risks', recordTypes: ['risk'], permission: 'legal.risks' },
  { key: 'intellectual-property', title: 'Intellectual Property', description: 'Track IP assets, registrations, and renewals.', href: '/legal/intellectual-property', recordTypes: ['intellectual_property'], permission: 'legal.ip' },
  { key: 'employment', title: 'Employment Law Matters', description: 'Manage restricted employment-related legal matters.', href: '/legal/employment', recordTypes: ['employment'], permission: 'legal.employment_matters' },
  { key: 'counsel', title: 'External Counsel', description: 'Track external counsel engagements and deadlines.', href: '/legal/counsel', recordTypes: ['counsel'], permission: 'legal.counsel' },
  { key: 'documents', title: 'Drafting, Templates & Documents', description: 'Manage legal drafts, approved templates, and supporting records.', href: '/legal/documents', recordTypes: ['draft', 'template', 'document'], permission: 'legal.documents' },
  { key: 'policies', title: 'Policies & Procedures', description: 'Maintain legal policies and review schedules.', href: '/legal/policies', recordTypes: ['policy'], permission: 'legal.policies' },
  { key: 'approvals', title: 'Legal Approvals', description: 'Review records submitted through configured approval workflows.', href: '/legal/approvals', recordTypes: [], permission: 'legal.approvals' },
  { key: 'reports', title: 'Reports & Analytics', description: 'Review and export permission-scoped Legal records.', href: '/legal/reports', recordTypes: [], permission: 'legal.reports' },
];

export const legalStatuses = [
  'draft', 'submitted', 'under_review', 'negotiation', 'pending_approval',
  'approved', 'rejected', 'in_progress', 'active', 'compliant',
  'non_compliant', 'partially_compliant', 'pending_evidence', 'resolved',
  'closed', 'expired', 'archived', 'cancelled',
];

export const legalPriorities = ['low', 'medium', 'high', 'urgent'];

export function getLegalModule(key: string): LegalModule {
  const legalModule = legalModules.find(item => item.key === key);
  if (!legalModule) throw new Error(`Unknown Legal route: ${key}`);
  return legalModule;
}

export function makeLegalReference(recordType: LegalRecordType) {
  const prefix = recordType.replace(/_/g, '').slice(0, 4).toUpperCase();
  return `L${prefix}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export function isLegalRecordOpen(record: LegalRecord) {
  return !['closed', 'archived', 'cancelled'].includes(record.status);
}

export function getLegalRecordPermission(recordType: string) {
  const legalModule = legalModules.find(item => item.recordTypes.includes(recordType as LegalRecordType));
  if (!legalModule) throw new Error(`Unknown Legal record type: ${recordType}`);
  return legalModule.permission;
}
