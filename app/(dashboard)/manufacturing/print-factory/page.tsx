'use client';

import ModulePlaceholder from '@/components/common/ModulePlaceholder';
import { Printer } from 'lucide-react';

export default function PrintFactoryPage() {
  return (
    <ModulePlaceholder 
      moduleName="Print Factory"
      description="Manage print factory operations and production."
      icon={Printer}
    />
  );
}
