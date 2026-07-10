'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Calendar, Eye, RefreshCw, Loader2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';

// Define the Contact interface
interface Contact {
  _id: string;
  fullName: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ConnectPage() {
  // State for contacts data and UI state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch contact submissions
  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get('/api/connect');

      if (response.data.success) {
        setContacts(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch contacts');
        toast.error('Error', {
          description: response.data.message || 'Failed to fetch contacts',
        });
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Failed to load contact submissions';

      setError(errorMessage);
      toast.error('Error', { description: errorMessage });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchContacts();
  }, []);

  // Handle refreshing data
  const handleRefresh = () => {
    setRefreshing(true);
    fetchContacts();
  };

  // Handle opening the modal with a contact's details
  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setModalOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 bg-[#FFF8E7] dark:bg-transparent min-h-screen">
      <Toaster position="top-right" />

      <div className="flex justify-between items-center mb-6 border-b border-[#EEE1C6] dark:border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-[#800020] dark:text-[#D4A017]">Contact Submissions</h1>
          <p className="text-[#B8860B] dark:text-muted-foreground">View and manage all contact form submissions</p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={refreshing || loading}
          className="border-[#EEE1C6] text-[#800020] hover:bg-[#800020]/[0.06] hover:text-[#800020] focus:ring-[#800020]/20 dark:border-border dark:text-[#D4A017]"
        >
          {refreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {loading && !refreshing ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#800020] dark:text-[#D4A017]" />
          <span className="ml-2 text-[#B8860B] dark:text-muted-foreground">Loading contact submissions...</span>
        </div>
      ) : error ? (
        <Card className="bg-destructive/10">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load contact submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="border-[#EEE1C6] text-[#800020] hover:bg-[#800020]/[0.06] hover:text-[#800020] focus:ring-[#800020]/20 dark:border-border dark:text-[#D4A017]"
            >
              Try Again
            </Button>
          </CardFooter>
        </Card>
      ) : contacts.length === 0 ? (
        <Card className="border-[#EEE1C6] bg-[#FFF8E7] dark:border-border dark:bg-card">
          <CardHeader>
            <CardTitle className="text-[#800020] dark:text-[#D4A017]">No Submissions</CardTitle>
            <CardDescription className="text-[#B8860B] dark:text-muted-foreground">No contact form submissions found</CardDescription>
          </CardHeader>
          <CardContent>
            <p>There are currently no contact form submissions to display.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border border-[#EEE1C6] dark:border-border overflow-hidden">
          <Table>
            <TableHeader className="bg-gradient-to-br from-[#800020] to-[#4A0010] [&_th]:text-white/90">
              <TableRow className="hover:bg-transparent border-[#EEE1C6] dark:border-border">
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead className="w-[250px]">Email</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-[150px]">Date</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map(contact => (
                <TableRow
                  key={contact._id}
                  className="border-[#EEE1C6] hover:bg-[#800020]/[0.06] dark:border-border"
                >
                  <TableCell className="font-medium text-[#800020] dark:text-[#D4A017]">{contact.fullName}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell className="max-w-[250px] truncate">{contact.subject}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(contact.createdAt)}
                  </TableCell>
                  <TableCell>
                    {contact.isRead ? (
                      <Badge variant="outline" className="border-[#EEE1C6] bg-[#FFF8E7] text-[#B8860B] dark:border-border dark:bg-transparent dark:text-[#D4A017]">
                        Read
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-[#800020]/30 bg-[#800020]/[0.08] text-[#800020] dark:border-[#A3123A]/40 dark:bg-transparent dark:text-[#A3123A]">
                        New
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewContact(contact)}
                      className="text-[#800020] hover:bg-[#800020]/[0.06] hover:text-[#800020] focus:ring-[#800020]/20 dark:text-[#D4A017]"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View details</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal for contact details */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        {selectedContact && (
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto border-[#EEE1C6] bg-[#FFF8E7] dark:border-border dark:bg-card">
            <DialogHeader>
              <DialogTitle className="text-[#800020] dark:text-[#D4A017]">Contact Submission Details</DialogTitle>
              <DialogDescription className="text-[#B8860B] dark:text-muted-foreground">
                Detailed information about the contact submission
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-6">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <div className="font-semibold text-muted-foreground">Name:</div>
                <div>{selectedContact.fullName}</div>

                <div className="font-semibold text-muted-foreground">Email:</div>
                <div className="flex items-center">
                  <Mail className="mr-2 h-4 w-4 text-[#800020] dark:text-[#D4A017]" />
                  <a
                    href={`mailto:${selectedContact.email}`}
                    className="text-[#800020] hover:underline dark:text-[#D4A017]"
                  >
                    {selectedContact.email}
                  </a>
                </div>

                <div className="font-semibold text-muted-foreground">Date:</div>
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-[#800020] dark:text-[#D4A017]" />
                  {formatDate(selectedContact.createdAt)}
                </div>

                <div className="font-semibold text-muted-foreground">Subject:</div>
                <div className="font-medium">{selectedContact.subject}</div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-muted-foreground">Message:</div>
                <div className="p-4 rounded-md border border-[#EEE1C6] bg-white whitespace-pre-wrap dark:border-border dark:bg-muted">
                  {selectedContact.message}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setModalOpen(false)}
                className="bg-gradient-to-br from-[#800020] to-[#4A0010] text-white hover:brightness-110 focus:ring-[#800020]/20"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
