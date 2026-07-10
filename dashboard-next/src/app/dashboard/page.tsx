'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import {
  Book,
  Calendar,
  Home,
  Users,
  Globe,
  HeartHandshake,
  CalendarCheck,
  MessageSquare,
  ImageIcon,
  Command,
  Newspaper,
  Heart,
  LucideIcon,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { useAllowedService } from '@/context/AllowedServiceContext';
import { useI18n } from '@/context/I18nContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';

interface DashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  totalUsers: number;
  newUsersThisMonth: number;
  totalVolunteers: number;
  totalDonationCampaigns: number;
  activeCampaigns: number;
  totalBooks: number;
  totalArticles: number;
  totalPodcasts: number;
  totalVideoSeries: number;
  totalSchedules: number;
  totalConnectMessages: number;
  totalRoomBookings: number;
  growth: {
    events: string;
    users: string;
    volunteers: string;
    donations: string;
  };
}

interface DashboardCardProps {
  serviceKey: string;
  icon: LucideIcon;
  href: string;
  color: string;
}

const dashboardCards: DashboardCardProps[] = [
  { serviceKey: 'events', icon: Calendar, href: '/dashboard/events', color: 'from-orange-500 to-red-500' },
  { serviceKey: 'donations', icon: Heart, href: '/dashboard/donationsRecord', color: 'from-pink-500 to-rose-500' },
  { serviceKey: 'schedule', icon: Calendar, href: '/dashboard/schedule', color: 'from-blue-500 to-cyan-500' },
  { serviceKey: 'scheduleRegistrations', icon: CalendarCheck, href: '/dashboard/schedule-registrations', color: 'from-purple-500 to-pink-500' },
  { serviceKey: 'connect', icon: MessageSquare, href: '/dashboard/connect', color: 'from-green-500 to-teal-500' },
  { serviceKey: 'books', icon: Book, href: '/dashboard/books', color: 'from-amber-500 to-orange-500' },
  { serviceKey: 'rooms', icon: Home, href: '/dashboard/rooms', color: 'from-indigo-500 to-blue-500' },
  { serviceKey: 'users', icon: Users, href: '/dashboard/users', color: 'from-violet-500 to-purple-500' },
  { serviceKey: 'website', icon: Globe, href: '/dashboard/website', color: 'from-cyan-500 to-blue-500' },
  { serviceKey: 'volunteers', icon: HeartHandshake, href: '/dashboard/volunteer', color: 'from-emerald-500 to-green-500' },
  { serviceKey: 'glimpse', icon: ImageIcon, href: '/dashboard/glimpse', color: 'from-fuchsia-500 to-pink-500' },
  { serviceKey: 'imagelibrary', icon: ImageIcon, href: '/dashboard/imagelibrary', color: 'from-rose-500 to-red-500' },
  { serviceKey: 'printMedia', icon: Newspaper, href: '/dashboard/print-media', color: 'from-slate-500 to-gray-500' },
  { serviceKey: 'dikshaMantra', icon: Heart, href: '/dashboard/mantra-diksha', color: 'from-orange-500 to-amber-500' },
  { serviceKey: 'dailySchedule', icon: Calendar, href: '/dashboard/daily-schedule', color: 'from-teal-500 to-cyan-500' },
  { serviceKey: 'servicesManagement', icon: Command, href: '/dashboard/services', color: 'from-indigo-500 to-purple-500' },
];

export default function MainDashBoard() {
  const { isLoading, hasPermission } = useAllowedService();
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        if (data.success) setStats(data.data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setStatsLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-6 w-1/2" />
        </div>
        
        {/* Stats Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>

        {/* Cards Skeleton */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const filteredCards = dashboardCards.filter(card => hasPermission(card.serviceKey));

  const statCards = [
    { key: 'totalEvents', label: t('dashboardPage.stats.totalEvents'), value: stats?.totalEvents ?? 0, Icon: Calendar, tone: '#800020', growth: stats?.growth?.events },
    { key: 'donations', label: t('dashboardPage.stats.donations'), value: stats?.activeCampaigns ?? 0, Icon: Heart, tone: '#A3123A', growth: stats?.growth?.donations },
    { key: 'activeUsers', label: t('dashboardPage.stats.activeUsers'), value: (stats?.totalUsers ?? 0).toLocaleString(), Icon: Users, tone: '#B8860B', growth: stats?.growth?.users },
    { key: 'volunteers', label: t('dashboardPage.stats.volunteers'), value: (stats?.totalVolunteers ?? 0).toLocaleString(), Icon: HeartHandshake, tone: '#2E9E5B', growth: stats?.growth?.volunteers },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7A0018] via-[#5E0016] to-[#38000F] p-8 text-white md:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-[0.14]">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#FFD54F] blur-3xl" />
          <div className="absolute -bottom-12 -left-10 h-48 w-48 rounded-full bg-[#A3123A] blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-3xl text-[#FFD54F] ring-1 ring-[#FFD54F]/40">ॐ</div>
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight md:text-4xl">{t('dashboardPage.welcomeTitle')}</h1>
              <p className="mt-1 text-sm text-[#EAD9BC] md:text-base">{t('dashboardPage.welcomeSubtitle')}</p>
            </div>
          </div>
          <p className="max-w-2xl text-[15px] leading-relaxed text-[#E6D3B4]">{t('dashboardPage.welcomeDescription')}</p>
        </div>
      </div>

      {/* Quick Stats — REAL data from DB */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ key, label, value, Icon, tone, growth }) => (
          <Card key={key} className="relative overflow-hidden rounded-2xl border border-[#EEE1C6] bg-white transition-all duration-300 hover:shadow-lg dark:bg-gray-900">
            <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: tone }} />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#8B7E74]">{label}</p>
                  <h3 className="mt-2 text-3xl font-extrabold text-[#800020] dark:text-white">{statsLoading ? '…' : value}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: tone }}>
                    <TrendingUp className="h-3 w-3" /> {t('dashboardPage.stats.growthThisMonth', { value: growth ?? '+0%' })}
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl ring-1" style={{ backgroundColor: `${tone}14`, borderColor: `${tone}33` }}>
                  <Icon className="h-7 w-7" style={{ color: tone }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Management modules */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-[#5E0016] dark:text-white">{t('dashboardPage.managementPortal')}</h2>
          <p className="text-sm text-[#8B7E74]">{t('dashboardPage.modulesAvailable', { count: filteredCards.length })}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCards.map((card) => (
            <Card
              key={card.serviceKey}
              className="group relative overflow-hidden rounded-2xl border border-[#EEE1C6] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D4A017] hover:shadow-[0_18px_40px_-20px_rgba(128,0,32,0.4)] dark:border-gray-800"
            >
              <CardHeader className="relative">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#8A0A26] to-[#4A0010] shadow-md transition-transform duration-300 group-hover:scale-105">
                    <card.icon className="h-6 w-6 text-[#FFD54F]" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#800020]" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-800 transition-colors group-hover:text-[#800020] dark:text-white">
                  {t(`dashboardPage.cards.${card.serviceKey}.title`)}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <CardDescription className="mb-4 line-clamp-2 text-sm">
                  {t(`dashboardPage.cards.${card.serviceKey}.description`)}
                </CardDescription>
                <Button asChild size="sm" className="w-full bg-gradient-to-br from-[#800020] to-[#4A0010] text-white shadow-sm transition hover:brightness-110">
                  <Link href={card.href}>{t(`dashboardPage.cards.${card.serviceKey}.linkText`)}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer help card */}
      <div className="mt-8 rounded-2xl border border-[#EEE1C6] bg-gradient-to-r from-[#FFF8E7] to-[#FBEFD6] p-6 dark:border-gray-800 dark:from-gray-900 dark:to-gray-900">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div>
            <h3 className="font-bold text-[#800020] dark:text-white">{t('dashboardPage.needHelpTitle')}</h3>
            <p className="text-sm text-[#8B7E74] dark:text-gray-300">{t('dashboardPage.needHelpSubtitle')}</p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline" className="border-[#D4A017] bg-white text-[#800020] hover:bg-[#FFF8E7] dark:bg-gray-900">
              <Link href="/dashboard/services">{t('dashboardPage.viewGuides')}</Link>
            </Button>
            <Button asChild className="bg-gradient-to-br from-[#800020] to-[#4A0010] text-white hover:brightness-110">
              <a href="mailto:office@avdheshanandg.org">{t('dashboardPage.contactSupport')}</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
