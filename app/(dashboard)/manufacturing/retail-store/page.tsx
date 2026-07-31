'use client';

import ModulePlaceholder from '@/components/common/ModulePlaceholder';
import { Store } from 'lucide-react';

export default function RetailStorePage() {
  return (
    <ModulePlaceholder 
      moduleName="Retail Store"
      description="Manage retail store operations and inventory."
      icon={Store}
    />
  );
}
