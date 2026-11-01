export type QualityRecordType =
  | 'defect'
  | 'non_conformance'
  | 'test'
  | 'specification'
  | 'checklist'
  | 'process_review'
  | 'audit'
  | 'compliance'
  | 'risk'
  | 'standard'
  | 'training'
  | 'improvement'
  | 'capa'
  | 'incident'
  | 'document'
  | 'request'
  | 'monitoring';

export interface QualityModule {
  key: string;
  title: string;
  description: string;
  href: string;
  recordType: QualityRecordType;
  permission: string;
}

export const qualityModules: QualityModule[] = [
  { key: 'checklists', title: 'Inspection Checklists', description: 'Maintain reusable checklist criteria and controlled revisions.', href: '/quality/checklists', recordType: 'checklist', permission: 'quality.checklists' },
  { key: 'tests', title: 'Product & Batch Testing', description: 'Record test procedures, measurements, and entered results.', href: '/quality/tests', recordType: 'test', permission: 'quality.tests' },
  { key: 'defects', title: 'Defect Management', description: 'Track product and process defects, containment, and resolution.', href: '/quality/defects', recordType: 'defect', permission: 'quality.defects' },
  { key: 'specifications', title: 'Quality Specifications', description: 'Maintain product and process specifications with review history.', href: '/quality/specifications', recordType: 'specification', permission: 'quality.specifications' },
  { key: 'non-conformances', title: 'Non-Conformance Reports', description: 'Trace deviations, affected scope, containment, and remediation.', href: '/quality/non-conformances', recordType: 'non_conformance', permission: 'quality.non_conformances' },
  { key: 'process-reviews', title: 'QA Process Reviews', description: 'Review process adherence, controls, and improvement needs.', href: '/quality/process-reviews', recordType: 'process_review', permission: 'quality.process_reviews' },
  { key: 'audits', title: 'Quality Audits', description: 'Plan audits, record findings, and track follow-up actions.', href: '/quality/audits', recordType: 'audit', permission: 'quality.audits' },
  { key: 'compliance', title: 'Compliance Management', description: 'Assess requirements, record compliance gaps, and schedule reviews.', href: '/quality/compliance', recordType: 'compliance', permission: 'quality.compliance' },
  { key: 'risks', title: 'Quality Risk Assessments', description: 'Register quality risks, mitigation owners, and review dates.', href: '/quality/risks', recordType: 'risk', permission: 'quality.risks' },
  { key: 'standards', title: 'Quality Standards & Procedures', description: 'Control quality standards, SOPs, and review schedules.', href: '/quality/standards', recordType: 'standard', permission: 'quality.standards' },
  { key: 'training', title: 'Training & Awareness', description: 'Plan quality training and record participation and outcomes.', href: '/quality/training', recordType: 'training', permission: 'quality.training' },
  { key: 'improvement', title: 'Continuous Improvement', description: 'Track improvement proposals, owners, milestones, and outcomes.', href: '/quality/improvement', recordType: 'improvement', permission: 'quality.improvement' },
  { key: 'capa', title: 'Corrective & Preventive Actions', description: 'Manage corrective action plans through independent verification.', href: '/quality/capa', recordType: 'capa', permission: 'quality.capa' },
  { key: 'incidents', title: 'Quality Incidents', description: 'Register quality events, investigation, containment, and resolution.', href: '/quality/incidents', recordType: 'incident', permission: 'quality.incidents' },
  { key: 'documents', title: 'Quality Documents', description: 'Register controlled documents and related review actions.', href: '/quality/documents', recordType: 'document', permission: 'quality.documents' },
  { key: 'requests', title: 'Quality Requests & Approvals', description: 'Track review requests and reasoned approval decisions.', href: '/quality/requests', recordType: 'request', permission: 'quality.requests' },
  { key: 'monitoring', title: 'Quality Monitoring', description: 'Record monitoring checks, metrics, and follow-up.', href: '/quality/monitoring', recordType: 'monitoring', permission: 'quality.monitoring' },
];

export const qualityStatuses = [
  'draft', 'open', 'pending', 'scheduled', 'under_review', 'approved',
  'rejected', 'in_progress', 'contained', 'awaiting_verification',
  'passed', 'failed', 'compliant', 'non_compliant', 'resolved',
  'closed', 'reopened', 'archived', 'cancelled',
];

export const qualityPriorities = ['low', 'medium', 'high', 'urgent'];
export const qualitySeverities = ['observation', 'minor', 'major', 'critical'];

export function getQualityModule(href: string): QualityModule {
  const moduleInfo = qualityModules.find(item => item.href === href);
  if (!moduleInfo) throw new Error(`Unknown QC/QA route: ${href}`);
  return moduleInfo;
}

export function makeQualityReference(recordType: QualityRecordType, now = new Date()) {
  const prefix = recordType.replace(/_/g, '').slice(0, 4).toUpperCase();
  return `Q${prefix}-${now.getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}
