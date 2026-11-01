'use client';

import { getQualityModule } from '@/lib/quality';
import QualityWorkspace from '@/components/quality/QualityWorkspace';

export default function QualityAuditsPage() {
  return <QualityWorkspace module={getQualityModule('/quality/audits')} />;
}
