'use client';

import ModulePlaceholder from '@/components/common/ModulePlaceholder';
import { HelpCircle } from 'lucide-react';

export default function ClientServicingPage() {
  return (
    <ModulePlaceholder 
      moduleName="Client Servicing"
      description="Manage customer support tickets, service requests, and SLA tracking."
      icon={HelpCircle}
    />
  );
}
