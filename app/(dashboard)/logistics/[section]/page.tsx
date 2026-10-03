import LogisticsWorkspace from '@/components/logistics/LogisticsModule';

export default function LogisticsSectionPage({ params }: { params: { section: string } }) {
  return <LogisticsWorkspace section={params.section} />;
}