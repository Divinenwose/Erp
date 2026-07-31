'use client';

import ModulePlaceholder from '@/components/common/ModulePlaceholder';
import { MonitorPlay } from 'lucide-react';

export default function MediaPage() {
  return (
    <ModulePlaceholder 
      moduleName="Media"
      description="Manage media campaigns and media library."
      icon={MonitorPlay}
    />
  );
}
