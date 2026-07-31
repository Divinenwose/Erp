'use client';

import ModulePlaceholder from '@/components/common/ModulePlaceholder';
import { Factory } from 'lucide-react';

export default function ManufacturingPage() {
  return (
    <ModulePlaceholder 
      moduleName="Manufacturing"
      description="Manage manufacturing operations including print factory, retail store, and sewing factory."
      icon={Factory}
    />
  );
}
