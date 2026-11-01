export type InternalControlRecordType =
  | 'risk'
  | 'audit'
  | 'transaction_review'
  | 'compliance_check'
  | 'policy_enforcement'
  | 'fraud_case'
  | 'incident'
  | 'control_test'
  | 'finding'
  | 'evidence'
  | 'training'
  | 'request'
  | 'policy';

export interface InternalControlModule {
  title: string;
  description: string;
  href: string;
  recordType: InternalControlRecordType;
  permission: string;
}

export const internalControlModules: InternalControlModule[] = [
  { title: 'Risk Assessment', description: 'Identify, score, mitigate, and monitor organizational risks.', href: '/internal-control/risk-assessment', recordType: 'risk', permission: 'internal_control.risks' },
  { title: 'Audit Management', description: 'Plan audits, document scope, assign auditors, and track execution.', href: '/internal-control/audit-management', recordType: 'audit', permission: 'internal_control.audits' },
  { title: 'Transaction Reviews', description: 'Record authorized reviews of existing finance and operational transactions.', href: '/internal-control/transaction-reviews', recordType: 'transaction_review', permission: 'internal_control.transaction_reviews' },
  { title: 'Compliance Monitoring', description: 'Schedule compliance checks and track findings and violations.', href: '/internal-control/compliance-monitoring', recordType: 'compliance_check', permission: 'internal_control.compliance' },
  { title: 'Policy Enforcement', description: 'Track policy breaches, enforcement actions, and outcomes.', href: '/internal-control/policy-enforcement', recordType: 'policy_enforcement', permission: 'internal_control.policy_enforcement' },
  { title: 'Fraud Detection & Investigation', description: 'Manage confidential suspected-fraud cases and investigations.', href: '/internal-control/fraud-investigations', recordType: 'fraud_case', permission: 'internal_control.fraud' },
  { title: 'Internal Incidents', description: 'Record incidents, investigations, corrective actions, and resolution.', href: '/internal-control/incidents', recordType: 'incident', permission: 'internal_control.incidents' },
  { title: 'Control Activities & Testing', description: 'Maintain control objectives, procedures, and effectiveness testing.', href: '/internal-control/control-testing', recordType: 'control_test', permission: 'internal_control.controls' },
  { title: 'Findings & Corrective Actions', description: 'Assign findings, deadlines, remediation, and independent verification.', href: '/internal-control/findings-actions', recordType: 'finding', permission: 'internal_control.findings' },
  { title: 'Documentation & Evidence', description: 'Maintain securely stored evidence and supporting documents.', href: '/internal-control/documentation', recordType: 'evidence', permission: 'internal_control.evidence' },
  { title: 'Training & Awareness', description: 'Track compliance training, awareness activities, and completion.', href: '/internal-control/training', recordType: 'training', permission: 'internal_control.training' },
  { title: 'Requests & Approvals', description: 'Route controlled requests through review, authorization, execution, and closure.', href: '/internal-control/requests', recordType: 'request', permission: 'internal_control.requests' },
  { title: 'Policies & Procedures', description: 'Manage internal policies, control requirements, and procedures.', href: '/internal-control/policies', recordType: 'policy', permission: 'internal_control.policies' },
];

export function getInternalControlModule(href: string): InternalControlModule {
  const moduleInfo = internalControlModules.find(item => item.href === href);
  if (!moduleInfo) throw new Error(`Unknown Internal Control route: ${href}`);
  return moduleInfo;
}

export const workflowStages = [
  'request_initiation',
  'internal_review',
  'risk_compliance_assessment',
  'supporting_documents',
  'authorization',
  'execution',
  'findings_documentation',
  'corrective_actions',
  'follow_up_verification',
  'closure',
] as const;

export const workflowStageLabels: Record<string, string> = {
  request_initiation: 'Request Initiation',
  internal_review: 'Internal Review',
  risk_compliance_assessment: 'Risk / Compliance Assessment',
  supporting_documents: 'Supporting Documents',
  authorization: 'Authorization',
  execution: 'Execution',
  findings_documentation: 'Findings & Documentation',
  corrective_actions: 'Corrective Actions',
  follow_up_verification: 'Follow-up Verification',
  closure: 'Closure',
};

export function scoreRisk(likelihood: number | null, impact: number | null) {
  if (likelihood === null || impact === null) return null;
  const score = likelihood * impact;
  const rating = score >= 17 ? 'Critical' : score >= 10 ? 'High' : score >= 5 ? 'Moderate' : 'Low';
  return { score, rating };
}
