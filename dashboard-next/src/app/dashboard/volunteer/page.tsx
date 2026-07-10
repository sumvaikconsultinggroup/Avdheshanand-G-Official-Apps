import { VolunteersTable } from './volunteers-table';

export default function VolunteersPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#EEE1C6] bg-gradient-to-br from-[#FFF8E7] to-[#FFF8E7]/40 p-6 shadow-sm dark:border-[#EEE1C6]/10 dark:bg-none dark:from-transparent dark:to-transparent">
        <div className="flex items-center gap-3">
          <span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-[#A3123A] to-[#800020]" />
          <h1 className="text-3xl font-semibold text-[#800020] dark:text-[#D4A017]">Volunteers</h1>
        </div>
        <p className="mt-1 pl-[18px] text-[#B8860B] dark:text-muted-foreground">Manage volunteer applications and assignments.</p>
      </div>

      <VolunteersTable />
    </div>
  );
}
