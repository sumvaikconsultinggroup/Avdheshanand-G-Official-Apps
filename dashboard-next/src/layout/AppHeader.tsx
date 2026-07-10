'use client';

import UserDropdown from '@/components/header/UserDropdown';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { useI18n } from '@/context/I18nContext';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

interface AdminUser {
  _id: { $oid: string };
  username: string;
  name: string;
  role: string;
  isAdmin: boolean;
  allowedService: string[];
  password: string;
}

const AppHeader: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    // Get current user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
      }
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#E7DCC6] dark:border-gray-800 bg-[#FBF7EF]/85 dark:bg-gray-900 backdrop-blur h-16 hidden lg:flex lg:items-center">
      <div className="container flex items-center justify-between h-full px-4 md:px-6 max-w-full">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="h-5 w-1 rounded-full bg-gradient-to-b from-[#D4A017] to-[#800020]" />
          <span className="font-serif text-xl font-bold text-[#5E0016] dark:text-[#FFD54F]">{t('common.dashboard')}</span>
        </Link>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />

          {currentUser && (
            <div className="hidden md:flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title={t('common.loggedIn')} />
              <span className="text-sm font-medium text-foreground">
                {currentUser.username}
              </span>
            </div>
          )}

          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
