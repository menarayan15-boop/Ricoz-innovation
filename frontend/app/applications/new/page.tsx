'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ApplicationsNewRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/applications/create');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-[#172B4D] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#627D98]">Redirecting to visa dossier setup wizard...</p>
      </div>
    </div>
  );
}

