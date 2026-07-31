'use client';

import ModulePlaceholder from '@/components/common/ModulePlaceholder';
import { Truck } from 'lucide-react';

export default function LogisticsPage() {
  return (
    <ModulePlaceholder 
      moduleName="Logistics"
      description="Manage deliveries, fleet, and dispatch operations."
      icon={Truck}
    />
  );
}
