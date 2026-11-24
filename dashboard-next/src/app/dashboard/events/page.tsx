import { cookies } from 'next/headers';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { can, permissionsFromTokenPayload } from '@/lib/permissions';
import { verifyJwtToken } from '@/utils/verifyJwtToken';
import { EventsTable } from './events-table-improved';

export default async function EventsPage() {
  const jar = await cookies();
  const token = jar.get('auth_token')?.value || jar.get('token')?.value;
  const session = token ? await verifyJwtToken(token).catch(() => null) : null;
  const { role, permissions } = permissionsFromTokenPayload({ role: session?.role, perms: session?.perms, permissions: session?.permissions });
  const allowed = (action: 'create' | 'edit' | 'delete') => Boolean(session?.adminId) && (role === 'superadmin' || can(permissions, 'events', [action]));
  const actions = { create: allowed('create'), edit: allowed('edit'), delete: allowed('delete') };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#800020] dark:text-[#D4A017]">Events</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage upcoming and past events.</p>
        </div>
        {actions.create && (
          <Link href="/dashboard/events/new" className={buttonVariants({ className: 'w-full sm:w-auto bg-[#800020] text-white hover:bg-[#600018]' })}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Event
          </Link>
        )}
      </div>
      <EventsTable actions={actions} />
    </div>
  );
}
