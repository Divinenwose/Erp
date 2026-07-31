'use client';

import ModulePlaceholder from '@/components/common/ModulePlaceholder';
import { Palette } from 'lucide-react';

export default function GraphicsPage() {
  return (
    <ModulePlaceholder 
      moduleName="Graphics"
      description="Manage design requests and creative assets."
      icon={Palette}
    />
  );
}
