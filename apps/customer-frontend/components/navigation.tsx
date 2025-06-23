'use client';

import { clsx } from 'clsx';
import { Home, CreditCard, Send, Plus, LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { LanguageSwitcher } from './language-switcher';

const navItems = [
  { href: '/dashboard', key: 'dashboard', icon: Home },
  { href: '/accounts', key: 'accounts', icon: CreditCard },
  { href: '/transfer', key: 'transfer', icon: Send },
  { href: '/create-account', key: 'newAccount', icon: Plus },
];

export function Navigation() {
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Ensure client-side hydration is complete
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Translation hooks must be called unconditionally
  const t = useTranslations('navigation');
  const tCommon = useTranslations('common');

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
    return locale && ['en', 'sr', 'no'].includes(locale) ? locale : 'en';
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
            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map(item => {
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
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
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
            {/* Desktop Language & Sign Out */}
            <div className="hidden sm:flex sm:items-center sm:space-x-4">
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

            {/* Mobile menu button */}
            <div className="sm:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={getLocalizedHref(item.href)}
                    className={clsx(
                      'flex items-center px-3 py-2 text-base font-medium',
                      active
                        ? 'text-blue-600 bg-blue-50 border-l-4 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {t(item.key)}
                  </Link>
                );
              })}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4 space-y-3">
                <div className="w-full">
                  <LanguageSwitcher currentLocale={getCurrentLocale()} />
                </div>
              </div>
              <div className="mt-3 px-3">
                <button
                  className="flex items-center w-full px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => {
                    localStorage.removeItem('customerId');
                    window.location.href = '/';
                  }}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  {tCommon('signOut')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
