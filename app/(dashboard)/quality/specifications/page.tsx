'use client';

import { getQualityModule } from '@/lib/quality';
import QualityWorkspace from '@/components/quality/QualityWorkspace';

export default function QualitySpecificationsPage() {
  return <QualityWorkspace module={getQualityModule('/quality/specifications')} />;
}
