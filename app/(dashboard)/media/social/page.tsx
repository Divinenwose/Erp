'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MediaSocialPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/marketing/social');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-500">Redirecting to Social Media...</p>
    </div>
  );
}
