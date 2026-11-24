'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import { Edit, MoreHorizontal, Trash, Calendar, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

// Type for event data
interface Event {
  _id: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  description: string;
  eventImage: string;
  publicationStatus?: 'draft' | 'published';
  registeredUsers: string[];
}

export function EventsTable({ actions }: { actions: { create: boolean; edit: boolean; delete: boolean } }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Fetch events when component mounts
  useEffect(() => {
    fetchEvents();
    const refresh = () => { if (!document.hidden) void fetchEvents(false); };
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  const fetchEvents = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await axios.get('/api/admin/events');
      setError(null);
      
      if (response.data.success) {
        setEvents(response.data.data || []);
      } else {
        setError(response.data.message || 'Failed to load events');
        toast.error('Error loading events', {
          description: response.data.message
        });
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events. Please try again later.');
      toast.error('Error loading events', {
        description: 'Could not connect to the server'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEventToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    
    try {
      setLoading(true);
      const response = await axios.delete(`/api/events/${eventToDelete}`);
      
      if (response.data.success) {
        setEvents(events.filter(event => event._id !== eventToDelete));
        toast.success('Event deleted successfully');
      } else {
        toast.error('Failed to delete event', {
          description: response.data.message
        });
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Error deleting event', {
        description: 'Something went wrong'
      });
    } finally {
      setDeleteDialogOpen(false);
      setEventToDelete(null);
      setLoading(false);
    }
  };

  const openDetailsModal = (event: Event) => {
    setSelectedEvent(event);
    setDetailsModalOpen(true);
  };

  // Function to generate event icon based on event name
  const getEventIcon = (eventName: string) => {
    const firstLetter = eventName.charAt(0).toUpperCase();
    const colors = [
      "bg-red-100 text-red-600", 
      "bg-blue-100 text-blue-600",
      "bg-green-100 text-green-600",
      "bg-yellow-100 text-yellow-600",
      "bg-purple-100 text-purple-600"
    ];
    const colorIndex = eventName.length % colors.length;
    
    return (
      <div className={`flex items-center justify-center w-10 h-10 rounded-md ${colors[colorIndex]}`}>
        <span className="text-lg font-bold">{firstLetter}</span>
      </div>
    );
  };

  // Mobile Card View Component
  const MobileEventCard = ({ event }: { event: Event }) => (
    <Card
      className="w-full cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => openDetailsModal(event)}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Event Image/Icon */}
          <div className="flex-shrink-0">
            {event.eventImage ? (
              <div className="relative w-16 h-16 rounded-md overflow-hidden">
                <Image
                  src={event.eventImage}
                  alt={event.eventName}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16">{getEventIcon(event.eventName)}</div>
            )}
          </div>

          {/* Event Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base truncate">{event.eventName}</h3>
              <span className="text-xs">{event.publicationStatus === "draft" ? "Draft" : "Published"}</span>
              {(actions.edit || actions.delete) && <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {actions.edit && <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/dashboard/events/edit/${event._id}`;
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>}
                  {actions.delete && <DropdownMenuItem
                    className="text-red-600"
                    onClick={(e) => handleDelete(event._id, e)}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>}
            </div>

            <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{new Date(event.eventDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{event.eventLocation}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span>{event.registeredUsers?.length || 0} attendees</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Loading skeleton
  if (loading && events.length === 0) {
    return (
      <>
        {/* Desktop Skeleton */}
        <div className="hidden md:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="hidden lg:table-cell">Attendees</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map(index => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[120px]" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-6 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Skeleton */}
        <div className="md:hidden space-y-4">
          {[1, 2, 3].map(index => (
            <Card key={index} className="w-full">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-16 rounded-md flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md bg-muted/10">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Calendar className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Unable to load events</h3>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => fetchEvents()}>Try Again</Button>
      </div>
    );
  }

  // Empty state
  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md bg-muted/10">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Calendar className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No events found</h3>
        {actions.create && <p className="text-sm text-muted-foreground mb-6">Use New Event to create your first draft.</p>}
      </div>
    );
  }

  // Data loaded successfully
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="hidden lg:table-cell">Attendees</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map(event => (
              <TableRow 
                key={event._id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => openDetailsModal(event)}
              >
                <TableCell className="p-2">
                  {event.eventImage ? (
                    <div className="relative w-10 h-10 rounded-md overflow-hidden">
                      <Image
                        src={event.eventImage}
                        alt={event.eventName}
                        fill
                        sizes="40px"
                        className="object-cover"
                        priority={false}
                      />
                    </div>
                  ) : (
                    getEventIcon(event.eventName)
                  )}
                </TableCell>
                <TableCell className="font-medium">{event.eventName}<div className="mt-1 text-xs text-muted-foreground">{event.publicationStatus === "draft" ? "Draft" : "Published"}</div></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {new Date(event.eventDate).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate max-w-[200px]">{event.eventLocation}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {event.registeredUsers?.length || 0}
                  </div>
                </TableCell>
                <TableCell>
                  {(actions.edit || actions.delete) && <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions.edit && <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/dashboard/events/edit/${event._id}`;
                      }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>}
                      {actions.delete && <DropdownMenuItem
                        className="text-red-600"
                        onClick={(e) => handleDelete(event._id, e)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {events.map(event => (
          <MobileEventCard key={event._id} event={event} />
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Event Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl">{selectedEvent?.eventName}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              {selectedEvent.eventImage && (
                <div className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden">
                  <Image
                    src={selectedEvent.eventImage}
                    alt={selectedEvent.eventName}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date(selectedEvent.eventDate).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Attendees</p>
                    <p className="font-medium">{selectedEvent.registeredUsers?.length || 0} registered</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedEvent.eventLocation}</p>
                </div>
              </div>

              {selectedEvent.description && (
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                {actions.edit && <Button asChild className="flex-1">
                  <Link href={`/dashboard/events/edit/${selectedEvent._id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Event
                  </Link>
                </Button>}
                {actions.delete && <Button
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700"
                  onClick={() => {
                    setDetailsModalOpen(false);
                    handleDelete(selectedEvent._id);
                  }}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete Event
                </Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
