'use client';

import ModulePlaceholder from '@/components/common/ModulePlaceholder';
import { Megaphone } from 'lucide-react';

export default function ClientMarketingPage() {
  return (
    <ModulePlaceholder 
      moduleName="Client Marketing"
      description="Manage marketing campaigns, promotions, and analytics."
      icon={Megaphone}
    />
  );
}
