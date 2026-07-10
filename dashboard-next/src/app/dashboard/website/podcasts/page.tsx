import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { PodcastsTable } from './podcasts-table';

export default function PodcastsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-[#EEE1C6] bg-[#FFF8E7] p-5 dark:border-[#800020]/40 dark:bg-transparent">
        <div>
          <h1 className="text-3xl font-semibold text-[#800020] dark:text-[#D4A017]">Podcasts</h1>
          <p className="text-muted-foreground">Manage your podcast episodes and series.</p>
        </div>
        <Button
          asChild
          className="bg-gradient-to-br from-[#800020] to-[#4A0010] text-white shadow-sm hover:brightness-110 focus-visible:ring-[#800020]/20"
        >
          <Link href="/dashboard/website/podcasts/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Podcast
          </Link>
        </Button>
      </div>

      <PodcastsTable />
    </div>
  );
}
