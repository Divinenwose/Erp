'use client';

import ModulePlaceholder from '@/components/common/ModulePlaceholder';
import { Scissors } from 'lucide-react';

export default function SewingFactoryPage() {
  return (
    <ModulePlaceholder 
      moduleName="Sewing Factory"
      description="Manage sewing factory operations and production."
      icon={Scissors}
    />
  );
}
