'use client';

import ModulePlaceholder from '@/components/common/ModulePlaceholder';
import { FolderKanban } from 'lucide-react';

export default function OperationsPage() {
  return (
    <ModulePlaceholder 
      moduleName="Operations"
      description="Manage projects, tasks, and work orders."
      icon={FolderKanban}
    />
  );
}
