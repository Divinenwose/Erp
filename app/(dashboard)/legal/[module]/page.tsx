import { notFound } from 'next/navigation';
import LegalWorkspace from '@/components/legal/LegalWorkspace';
import { legalModules } from '@/lib/legal';

export default function LegalModulePage({ params }: { params: { module: string } }) {
  if (!legalModules.some(module => module.key === params.module)) notFound();
  return <LegalWorkspace moduleKey={params.module} />;
}
