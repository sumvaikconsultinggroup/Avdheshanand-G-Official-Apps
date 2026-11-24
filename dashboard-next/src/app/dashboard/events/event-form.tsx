'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import Image from 'next/image';

interface EventFormProps {
  initialData?: {
    id?: string;
    eventName?: string;
    eventDate?: string;
    eventLocation?: string;
    description?: string;
    publicationStatus?: 'draft' | 'published';
    eventImage?: string;
  };
}

interface EventFormData {
  eventName: string;
  eventDate: string; // Will be converted to Date on submit
  eventLocation: string;
  description: string;
  publicationStatus: 'draft' | 'published';
  eventImage?: FileList; // For file input
}

export function EventForm({ initialData }: EventFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.eventImage || null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<EventFormData>({
    defaultValues: {
      eventName: initialData?.eventName || '',
      eventDate: initialData?.eventDate ? new Date(initialData.eventDate).toISOString().split('T')[0] : '',
      eventLocation: initialData?.eventLocation || '',
      description: initialData?.description || '',
      publicationStatus: initialData ? initialData.publicationStatus || 'published' : 'draft',
    },
  });

  // Watch for file changes to generate preview
  const imageFile = watch('eventImage');
  
  // Update preview when file changes
  if (imageFile && imageFile[0] && !imagePreview?.includes(imageFile[0].name)) {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(imageFile[0]);
  }

  const onSubmit: SubmitHandler<EventFormData> = async (data) => {
    try {
      setIsSubmitting(true);
      
      // Create FormData to handle file uploads
      const formData = new FormData();
      formData.append('eventName', data.eventName);
      formData.append('eventDate', new Date(data.eventDate).toISOString());
      formData.append('eventLocation', data.eventLocation);
      formData.append('description', data.description);
      formData.append('publicationStatus', data.publicationStatus);
      
      // Only append image if it exists
      if (data.eventImage && data.eventImage[0]) {
        formData.append('eventImage', data.eventImage[0]);
      }
      
      let response;
      
      // Check if we're updating or creating
      if (initialData?.id) {
        // Update existing event with PUT request
        response = await axios.put(`/api/events/${initialData.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('Event updated:', response.data);
      } else {
        // Create new event with POST request
        response = await axios.post('/api/events', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('Event created:', response.data);
      }
      
      toast.success(
        initialData?.id ? 'Event updated successfully' : 'Event created successfully',
        { description: 'Success' }
      );
      
      // Navigate back to events list
      router.push('/dashboard/events');
      
    } catch (error) {
      console.error('Error submitting event:', error);
      toast.error(
        'There was a problem saving your event. Please try again.',
        { description: 'Error' }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6">
            <div className="grid gap-3">
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                {...register('eventName', { required: 'Event name is required' })}
                aria-invalid={errors.eventName ? 'true' : 'false'}
              />
              {errors.eventName && (
                <p className="text-sm text-red-500">{errors.eventName.message}</p>
              )}
            </div>

            <div className="grid gap-3">
              <Label htmlFor="eventDate">Date</Label>
              <Input
                id="eventDate"
                type="date"
                {...register('eventDate', { required: 'Event date is required' })}
                aria-invalid={errors.eventDate ? 'true' : 'false'}
              />
              {errors.eventDate && (
                <p className="text-sm text-red-500">{errors.eventDate.message}</p>
              )}
            </div>

            <div className="grid gap-3">
              <Label htmlFor="eventLocation">Location</Label>
              <Input
                id="eventLocation"
                {...register('eventLocation', { required: 'Location is required' })}
                aria-invalid={errors.eventLocation ? 'true' : 'false'}
              />
              {errors.eventLocation && (
                <p className="text-sm text-red-500">{errors.eventLocation.message}</p>
              )}
            </div>

            <div className="grid gap-3">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description', { required: 'Description is required' })}
                rows={4}
                aria-invalid={errors.description ? 'true' : 'false'}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            <div className="grid gap-3">
              <Label htmlFor="publicationStatus">Visibility</Label>
              <select id="publicationStatus" className="rounded-md border bg-background p-2" {...register('publicationStatus')}>
                <option value="draft">Draft · staff only</option>
                <option value="published">Published · public website and app</option>
              </select>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="eventImage">Event Image</Label>
              <Input
                id="eventImage"
                type="file"
                accept="image/*"
                {...register('eventImage', {
                  validate: {
                    fileSize: (value) => {
                      if (value && value[0] && value[0].size > 5 * 1024 * 1024) {
                        return 'File size must be less than 5MB';
                      }
                      return true;
                    },
                    fileType: (value) => {
                      if (value && value[0] && !value[0].type.includes('image/')) {
                        return 'File must be an image';
                      }
                      return true;
                    },
                  },
                })}
              />
              {errors.eventImage && (
                <p className="text-sm text-red-500">{errors.eventImage.message}</p>
              )}
              
              {/* Image Preview */}
              {imagePreview && (
                <div className="mt-2 rounded border p-2">
                  <div className="relative h-40 w-full">
                    <Image 
                      src={imagePreview} 
                      alt="Event preview" 
                      className="object-cover rounded" 
                      fill
                      sizes="(max-width: 768px) 100vw, 300px"
                      onError={() => setImagePreview(null)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end gap-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.push('/dashboard/events')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : watch('publicationStatus') === 'draft' ? 'Save draft' : 'Save published event'}
        </Button>
      </div>
    </form>
  );
}
