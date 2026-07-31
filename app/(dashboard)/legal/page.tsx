'use client';

import ModulePlaceholder from '@/components/common/ModulePlaceholder';
import { Shield } from 'lucide-react';

export default function LegalPage() {
  return (
    <ModulePlaceholder 
      moduleName="Legal"
      description="Manage contracts, compliance, and legal documents."
      icon={Shield}
    />
  );
}
