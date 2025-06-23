'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Navigation } from './navigation';

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isClientSide, setIsClientSide] = useState(false);

  useEffect(() => {
    // Mark as client-side to ensure proper hydration
    setIsClientSide(true);

    const customerId = localStorage.getItem('customerId');
    if (!customerId) {
      router.push('/');
    }
  }, [router]);

  // Show loading state during hydration to prevent context errors
  if (!isClientSide) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-bold text-gray-900">Core Banking</h1>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Loading...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </>
  );
}
