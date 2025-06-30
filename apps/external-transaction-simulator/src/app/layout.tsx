import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'External Transaction Simulator',
  description: 'Mock external banking infrastructure for testing SEPA, ACH, and Wire transfers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="min-h-screen">
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900">
                    External Transaction Simulator
                  </h1>
                  <span className="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Test Environment
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Port 7006 • SEPA, ACH & Wire Transfer Simulator
                </div>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
