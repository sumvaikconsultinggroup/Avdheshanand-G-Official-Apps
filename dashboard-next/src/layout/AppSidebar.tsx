'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Book,
  Calendar,
  Grid,
  Menu,
  Home,
  Users,
  Globe,
  Mic,
  Video,
  FileText,
  ChevronDown,
  ChevronRight,
  HeartHandshake,
  CalendarCheck,
  MessageSquare,
  ImageIcon,
  Newspaper,
  Heart,
  Command,
  X
} from 'lucide-react';
import { useAllowedService } from '@/context/AllowedServiceContext';
import { useI18n } from '@/context/I18nContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useSidebar } from '@/context/SidebarContext';

interface SubMenuItem {
  key: string;
  labelKey: string;
  href: string;
  icon: React.ElementType;
}

interface MenuItem {
  key: string;
  labelKey: string;
  href: string;
  icon: React.ElementType;
  serviceKey: string;
  submenu?: SubMenuItem[];
}

const navigation: MenuItem[] = [
  { key: 'dashboard', labelKey: 'sidebar.dashboard', href: '/dashboard', icon: Grid, serviceKey: 'dashboard' },
  { key: 'events', labelKey: 'sidebar.events', href: '/dashboard/events', icon: Calendar, serviceKey: 'events' },
  { key: 'donations', labelKey: 'sidebar.donations', href: '/dashboard/donationsRecord', icon: Calendar, serviceKey: 'donations' },
  { key: 'schedule', labelKey: 'sidebar.schedule', href: '/dashboard/schedule', icon: Calendar, serviceKey: 'schedule' },
  { key: 'servicesManagement', labelKey: 'sidebar.servicesManagement', href: '/dashboard/services', icon: Command, serviceKey: 'servicesManagement' },
  {
    key: 'scheduleRegistrations',
    labelKey: 'sidebar.scheduleRegistrations',
    href: '/dashboard/schedule-registrations',
    icon: CalendarCheck,
    serviceKey: 'scheduleRegistrations'
  },
  { key: 'connect', labelKey: 'sidebar.connect', href: '/dashboard/connect', icon: MessageSquare, serviceKey: 'connect' },
  { key: 'books', labelKey: 'sidebar.books', href: '/dashboard/books', icon: Book, serviceKey: 'books' },
  { key: 'rooms', labelKey: 'sidebar.rooms', href: '/dashboard/rooms', icon: Home, serviceKey: 'rooms' },
  { key: 'users', labelKey: 'sidebar.users', href: '/dashboard/users', icon: Users, serviceKey: 'users' },
  { key: 'glimpse', labelKey: 'sidebar.glimpse', href: '/dashboard/glimpse', icon: ImageIcon, serviceKey: 'glimpse' },
  { key: 'imagelibrary', labelKey: 'sidebar.imagelibrary', href: '/dashboard/imagelibrary', icon: ImageIcon, serviceKey: 'imagelibrary' },
  { key: 'volunteers', labelKey: 'sidebar.volunteers', href: '/dashboard/volunteer', icon: HeartHandshake, serviceKey: 'volunteers' },
  { key: 'printMedia', labelKey: 'sidebar.printMedia', href: "/dashboard/print-media", icon: Newspaper, serviceKey: 'printMedia' },
  { key: 'dikshaMantra', labelKey: 'sidebar.dikshaMantra', href: "/dashboard/mantra-diksha", icon: Heart, serviceKey: 'dikshaMantra' },
  { key: 'dailySchedule', labelKey: 'sidebar.dailySchedule', href: "/dashboard/daily-schedule", icon: Calendar, serviceKey: 'dailySchedule' },
  {
    key: 'website',
    labelKey: 'sidebar.website',
    href: '#',
    icon: Globe,
    serviceKey: 'website',
    submenu: [
      { key: 'podcasts', labelKey: 'sidebar.podcasts', href: '/dashboard/website/podcasts', icon: Mic },
      { key: 'videoSeries', labelKey: 'sidebar.videoSeries', href: '/dashboard/website/video-series', icon: Video },
      { key: 'articles', labelKey: 'sidebar.articles', href: '/dashboard/website/articles', icon: FileText },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isLoading, hasPermission } = useAllowedService();
  const { t } = useI18n();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();

  // Filter navigation based only on parent serviceKey
  const filteredNavigation = useMemo(() => {
    if (isLoading) return [];
    return navigation.filter(item => hasPermission(item.serviceKey));
  }, [isLoading, hasPermission]);

  const toggleSubmenu = (key: string) => {
    setExpandedItems(prev =>
      prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]
    );
  };

  const isSubmenuOpen = (key: string) => expandedItems.includes(key);

  const isSubmenuItemActive = (item: MenuItem) => {
    if (!item.submenu) return false;
    return item.submenu.some(subItem => pathname === subItem.href);
  };

  const renderNavItems = (items: MenuItem[], isMobile = false) => {
    return items.map(item => {
      const isActive = pathname === item.href;
      const hasSubmenu = item.submenu && item.submenu.length > 0;
      const isOpen = isSubmenuOpen(item.key);
      const isSubActive = isSubmenuItemActive(item);

      return (
        <li key={item.key} className="mb-1">
          {hasSubmenu ? (
            <div>
              <button
                onClick={() => toggleSubmenu(item.key)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[#800020]/[0.06] dark:hover:bg-white/5',
                  isActive || isSubActive
                    ? 'bg-[#800020]/[0.08] text-[#800020] dark:bg-[#FFD54F]/10 dark:text-[#FFD54F] font-semibold'
                    : 'text-gray-700 dark:text-gray-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  <span>{t(item.labelKey)}</span>
                </div>
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {isOpen && (
                <ul className="mt-1 space-y-1 pl-6">
                  {item.submenu!.map(subItem => (
                    <li key={subItem.key}>
                      <Link
                        href={subItem.href}
                        onClick={isMobile ? toggleMobileSidebar : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-[#800020]/[0.06] dark:hover:bg-white/5',
                          pathname === subItem.href
                            ? 'bg-[#800020]/[0.08] text-[#800020] dark:bg-[#FFD54F]/10 dark:text-[#FFD54F] font-semibold'
                            : 'text-gray-600 dark:text-gray-400'
                        )}
                      >
                        <subItem.icon className="h-4 w-4" />
                        <span>{t(subItem.labelKey)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <Link
              href={item.href}
              onClick={isMobile ? toggleMobileSidebar : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[#800020]/[0.06] dark:hover:bg-white/5',
                isActive
                  ? 'bg-[#800020]/[0.08] text-[#800020] dark:bg-[#FFD54F]/10 dark:text-[#FFD54F] font-semibold'
                  : 'text-gray-700 dark:text-gray-300'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{t(item.labelKey)}</span>
            </Link>
          )}
        </li>
      );
    });
  };

  return (
    <>
      {/* Mobile Sidebar Sheet */}
      <Sheet open={isMobileOpen} onOpenChange={toggleMobileSidebar}>
        <SheetContent side="left" className="w-72 p-0 border-r">
          <div className="flex h-full flex-col bg-[#FBF7EF] dark:bg-gray-900">
            {/* Mobile Sidebar Header */}
            <div className="flex h-16 items-center justify-between border-b border-[#5A0016] px-4 bg-gradient-to-br from-[#7A0018] to-[#38000F]">
              <Link href="/dashboard" className="flex items-center gap-2.5" onClick={toggleMobileSidebar}>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-lg text-[#FFD54F] ring-1 ring-[#FFD54F]/40">ॐ</span>
                <span className="text-[15px] font-bold leading-tight text-white">Swami Avdheshanand G</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMobileSidebar}
                className="h-8 w-8"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {/* Mobile Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-2 custom-scrollbar">
              <ul className="space-y-1">{renderNavItems(filteredNavigation, true)}</ul>
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="fixed top-0 left-0 h-screen bg-[#FBF7EF] dark:bg-gray-900 border-r border-[#E7DCC6] dark:border-gray-800 text-gray-900 hidden lg:flex lg:w-64 lg:flex-col transition-all duration-300 ease-in-out z-40">
        {/* Desktop Sidebar Header */}
        <div className="flex h-16 items-center border-b border-[#5A0016] px-4 bg-gradient-to-br from-[#7A0018] to-[#38000F]">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-lg text-[#FFD54F] ring-1 ring-[#FFD54F]/40 transition-transform duration-300 group-hover:scale-105">ॐ</span>
            <span className="text-[15px] font-bold leading-tight text-white">Swami Avdheshanand G</span>
          </Link>
        </div>
        {/* Desktop Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 custom-scrollbar">
          <ul className="space-y-1">{renderNavItems(filteredNavigation)}</ul>
        </nav>
      </aside>

      {/* Mobile Header with Menu Button */}
      <div className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white dark:bg-gray-900 px-4 lg:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleMobileSidebar}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">{t('common.toggleNavigationMenu')}</span>
        </Button>
        <div className="flex-1">
          <span className="text-lg font-semibold">{t('app.name')}</span>
        </div>
      </div>
    </>
  );
};

export default AppSidebar;
