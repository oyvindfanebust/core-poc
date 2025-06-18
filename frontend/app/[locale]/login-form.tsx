'use client';

import { useState, FormEvent } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LogIn, CreditCard } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';

interface LoginFormProps {
  translations: {
    title: string;
    subtitle: string;
    customerIdLabel: string;
    customerIdPlaceholder: string;
    signInButton: string;
    useTestCustomer: string;
    demoText: string;
    instructionText: string;
    errors: {
      customerIdRequired: string;
      invalidFormat: string;
    };
  };
}

export function LoginForm({ translations }: LoginFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [customerId, setCustomerId] = useState('');
  const [error, setError] = useState('');

  const getLocalizedPath = (path: string) => {
    // Extract locale from current pathname
    const segments = pathname.split('/');
    const locale = segments[1];
    
    // If we have a locale in the URL, prepend it
    if (locale && ['en', 'sr', 'no'].includes(locale)) {
      return `/${locale}${path}`;
    }
    
    return path;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!customerId.trim()) {
      setError(translations.errors.customerIdRequired);
      return;
    }

    // Simple validation for customer ID format
    if (!/^[A-Za-z0-9\-_]+$/.test(customerId)) {
      setError(translations.errors.invalidFormat);
      return;
    }

    // Store customer ID and redirect to dashboard
    localStorage.setItem('customerId', customerId);
    router.push(getLocalizedPath('/dashboard'));
  };

  const useTestCustomer = () => {
    const testId = 'CUSTOMER-ABC-123';
    setCustomerId(testId);
    localStorage.setItem('customerId', testId);
    router.push(getLocalizedPath('/dashboard'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher currentLocale={pathname.split('/')[1] || 'en'} />
      </div>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <CreditCard className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {translations.title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {translations.subtitle}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="customer-id" className="sr-only">
                {translations.customerIdLabel}
              </label>
              <input
                id="customer-id"
                name="customerId"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={translations.customerIdPlaceholder}
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setError('');
                }}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <LogIn className="h-5 w-5 text-blue-500 group-hover:text-blue-400" />
              </span>
              {translations.signInButton}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <button
                type="button"
                onClick={useTestCustomer}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                {translations.useTestCustomer}
              </button>
            </div>
          </div>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>{translations.demoText}</p>
          <p>{translations.instructionText}</p>
        </div>
      </div>
    </div>
  );
}