'use client';

import { getQualityModule } from '@/lib/quality';
import QualityWorkspace from '@/components/quality/QualityWorkspace';

export default function QualityRequestsPage() {
  return <QualityWorkspace module={getQualityModule('/quality/requests')} />;
}
