'use client';

import { getQualityModule } from '@/lib/quality';
import QualityWorkspace from '@/components/quality/QualityWorkspace';

export default function QualityStandardsPage() {
  return <QualityWorkspace module={getQualityModule('/quality/standards')} />;
}
