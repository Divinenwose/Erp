'use client';
import InternalControlWorkspace from '@/components/internal-control/InternalControlWorkspace';
import { getInternalControlModule } from '@/lib/internal-control';
export default function AuditManagementPage() {
  return <InternalControlWorkspace module={getInternalControlModule('/internal-control/audit-management')} />;
}
