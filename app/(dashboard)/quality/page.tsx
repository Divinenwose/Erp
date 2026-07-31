'use client';

import ModulePlaceholder from '@/components/common/ModulePlaceholder';
import { Scale } from 'lucide-react';

export default function QualityPage() {
  return (
    <ModulePlaceholder 
      moduleName="Quality Assurance & Quality Control"
      description="Manage QA inspections and QC reports."
      icon={Scale}
    />
  );
}
