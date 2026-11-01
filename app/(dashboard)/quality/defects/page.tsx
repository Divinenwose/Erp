'use client';

import { getQualityModule } from '@/lib/quality';
import QualityWorkspace from '@/components/quality/QualityWorkspace';

export default function QualityDefectsPage() {
  return <QualityWorkspace module={getQualityModule('/quality/defects')} />;
}
