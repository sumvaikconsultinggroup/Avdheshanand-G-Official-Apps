import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { VideoSeriesTable } from './video-series-table';

export default function VideoSeriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Video Series</h1>
          <p className="text-muted-foreground">Manage your video series and episodes.</p>
        </div>
        <Button asChild className="bg-gradient-to-br from-[#800020] to-[#4A0010] text-white hover:brightness-110 focus:ring-[#800020]/20">
          <Link href="/dashboard/website/video-series/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Video Series
          </Link>
        </Button>
      </div>

      <VideoSeriesTable />
    </div>
  );
}
