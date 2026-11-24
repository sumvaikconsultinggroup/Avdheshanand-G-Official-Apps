import { redirect } from 'next/navigation';

export default async function EventPage({ params }) {
  const { Id } = await params;
  redirect(`/dashboard/events/edit/${encodeURIComponent(Id)}`);
}
