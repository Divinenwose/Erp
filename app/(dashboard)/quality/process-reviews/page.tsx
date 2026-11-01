'use client';

import { getQualityModule } from '@/lib/quality';
import QualityWorkspace from '@/components/quality/QualityWorkspace';

export default function QualityProcessReviewsPage() {
  return <QualityWorkspace module={getQualityModule('/quality/process-reviews')} />;
}
