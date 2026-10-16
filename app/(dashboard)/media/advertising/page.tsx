'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MediaAdvertisingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/marketing/advertising');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-500">Redirecting to Advertising...</p>
    </div>
  );
}
