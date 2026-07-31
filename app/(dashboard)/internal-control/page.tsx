'use client';

import ModulePlaceholder from '@/components/common/ModulePlaceholder';
import { ClipboardCheck } from 'lucide-react';

export default function InternalControlPage() {
  return (
    <ModulePlaceholder 
      moduleName="Internal Control"
      description="Manage audits and risk management."
      icon={ClipboardCheck}
    />
  );
}
