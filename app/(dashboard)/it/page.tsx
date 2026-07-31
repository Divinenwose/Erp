'use client';

import ModulePlaceholder from '@/components/common/ModulePlaceholder';
import { Cpu } from 'lucide-react';

export default function ITPage() {
  return (
    <ModulePlaceholder 
      moduleName="Information Technology"
      description="Manage IT users, roles, permissions, and system settings."
      icon={Cpu}
    />
  );
}
