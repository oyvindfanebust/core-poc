'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, CreditCard, Send, Plus, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { LanguageSwitcher } from './language-switcher';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/dashboard', key: 'dashboard', icon: Home },
  { href: '/accounts', key: 'accounts', icon: CreditCard },
  { href: '/transfer', key: 'transfer', icon: Send },
  { href: '/create-account', key: 'newAccount', icon: Plus },
];

export function Navigation() {
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Ensure client-side hydration is complete
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  // Safe translation hooks with try-catch for context errors
  let t: (key: string) => string;
  let tCommon: (key: string) => string;
  
  try {
    t = useTranslations('navigation');
    tCommon = useTranslations('common');
  } catch (error) {
    console.warn('Translation context not available, using fallbacks:', error);
    // Fallback translation function
    t = (key: string) => {
      const fallbacks: Record<string, string> = {
        dashboard: 'Dashboard',
        accounts: 'Accounts', 
        transfer: 'Transfer',
        newAccount: 'New Account'
      };
      return fallbacks[key] || key;
    };
    tCommon = (key: string) => {
      const fallbacks: Record<string, string> = {
        appName: 'Core Banking',
        signOut: 'Sign Out'
      };
      return fallbacks[key] || key;
    };
  }
  
  // Don't render until hydrated to avoid context issues
  if (!isHydrated) {
    return (
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
    );
  }

  const getCurrentLocale = () => {
    // Extract locale from current pathname
    const segments = pathname.split('/');
    const locale = segments[1];
    return (locale && ['en', 'sr', 'no'].includes(locale)) ? locale : 'en';
  };

  const getLocalizedHref = (href: string) => {
    const locale = getCurrentLocale();

    // Always prepend locale since we're using localePrefix: 'always'
    return `/${locale}${href}`;
  };

  const isActive = (href: string) => {
    const localizedHref = getLocalizedHref(href);
    return pathname === localizedHref;
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">{tCommon('appName')}</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={getLocalizedHref(item.href)}
                    className={clsx(
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                      active
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {t(item.key)}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher currentLocale={getCurrentLocale()} />
            <button
              className="text-gray-500 hover:text-gray-700 flex items-center"
              onClick={() => {
                localStorage.removeItem('customerId');
                window.location.href = '/';
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {tCommon('signOut')}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}