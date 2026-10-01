import OperationsWorkspace from '@/components/operations/OperationsWorkspace';

export default function OperationsSectionPage({ params }: { params: { section: string } }) {
  return <OperationsWorkspace section={params.section} />;
}
