import ITWorkspace from '@/components/it/ITWorkspace';

export default function ITSectionPage({ params }: { params: { section: string } }) {
  return <ITWorkspace section={params.section} />;
}
