'use client';
import InternalControlWorkspace from '@/components/internal-control/InternalControlWorkspace';
import { getInternalControlModule } from '@/lib/internal-control';
export default function RequestsApprovalsPage() {
  return <InternalControlWorkspace module={getInternalControlModule('/internal-control/requests')} />;
}
