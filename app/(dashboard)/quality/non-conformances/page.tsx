'use client';

import { getQualityModule } from '@/lib/quality';
import QualityWorkspace from '@/components/quality/QualityWorkspace';

export default function QualityNonConformancesPage() {
  return <QualityWorkspace module={getQualityModule('/quality/non-conformances')} />;
}
