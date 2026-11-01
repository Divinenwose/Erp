'use client';

import { getQualityModule } from '@/lib/quality';
import QualityWorkspace from '@/components/quality/QualityWorkspace';

export default function QualityMonitoringPage() {
  return <QualityWorkspace module={getQualityModule('/quality/monitoring')} />;
}
