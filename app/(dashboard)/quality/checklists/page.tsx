'use client';

import { getQualityModule } from '@/lib/quality';
import QualityWorkspace from '@/components/quality/QualityWorkspace';

export default function QualityChecklistsPage() {
  return <QualityWorkspace module={getQualityModule('/quality/checklists')} />;
}
