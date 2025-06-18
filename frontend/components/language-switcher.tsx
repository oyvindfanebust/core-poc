'use client';

import { useRouter, usePathname } from 'next/navigation';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface LanguageSwitcherProps {
  currentLocale?: string;
}

export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const locale = (currentLocale || 'en') as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    // Extract current locale from pathname
    const segments = pathname.split('/');
    const currentLocaleInPath = segments[1];
    
    let pathnameWithoutLocale = pathname;
    
    // Remove current locale from pathname if it exists and is valid
    if (currentLocaleInPath && ['en', 'sr', 'no'].includes(currentLocaleInPath)) {
      pathnameWithoutLocale = pathname.slice(`/${currentLocaleInPath}`.length) || '/';
    }

    // Navigate to new locale
    // Note: We explicitly use /en for English to avoid browser locale detection issues
    const newPath = newLocale === 'en' 
      ? `/en${pathnameWithoutLocale}`
      : `/${newLocale}${pathnameWithoutLocale}`;
    
    router.push(newPath);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
      >
        <Globe className="h-4 w-4" />
        <span>{localeNames[locale]}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1">
            {locales.map((loc) => (
              <button
                key={loc}
                onClick={() => handleLocaleChange(loc)}
                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                  locale === loc 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700'
                }`}
              >
                {localeNames[loc]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}