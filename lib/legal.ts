import type { LegalRecord } from '@/lib/supabase';

export type LegalRecordType =
  | 'request'
  | 'contract'
  | 'draft'
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
  { key: 'documents', title: 'Drafting & Legal Documents', description: 'Manage controlled legal drafts and supporting records.', href: '/legal/documents', recordTypes: ['draft', 'document'], permission: 'legal.documents' },
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
