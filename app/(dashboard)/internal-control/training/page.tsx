'use client';
import InternalControlWorkspace from '@/components/internal-control/InternalControlWorkspace';
import { getInternalControlModule } from '@/lib/internal-control';
export default function TrainingAwarenessPage() {
  return <InternalControlWorkspace module={getInternalControlModule('/internal-control/training')} />;
}
