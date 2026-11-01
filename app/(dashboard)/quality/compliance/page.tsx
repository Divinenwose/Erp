'use client';

import { getQualityModule } from '@/lib/quality';
import QualityWorkspace from '@/components/quality/QualityWorkspace';

export default function QualityCompliancePage() {
  return <QualityWorkspace module={getQualityModule('/quality/compliance')} />;
}
