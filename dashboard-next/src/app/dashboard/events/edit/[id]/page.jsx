'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { EventForm } from '../../event-form';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditEventPage({ params }) {
  const { id } = use(params);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchEventData() {
      try {
        setLoading(true);
        const response = await axios.get(`/api/admin/events/${id}`);

        if (response.data.success) {
          setEvent(response.data.data);
        } else {
          setError('Failed to fetch event data');
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        setError('Something went wrong while loading the event');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchEventData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="border rounded-md p-6">
          <div className="space-y-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Edit Event</h1>
          <p className="text-red-500">Error: {error || 'Event not found'}</p>
          <button
            className="mt-4 px-4 py-2 bg-primary text-white rounded"
            onClick={() => router.push('/dashboard/events')}
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Edit Event</h1>
        <p className="text-muted-foreground">Update the details of this event.</p>
      </div>

      <EventForm
        initialData={{
          id: event._id,
          eventName: event.eventName,
          eventDate: event.eventDate,
          eventLocation: event.eventLocation,
          description: event.description,
          eventImage: event.eventImage,
          publicationStatus: event.publicationStatus,
        }}
      />
    </div>
  );
}
