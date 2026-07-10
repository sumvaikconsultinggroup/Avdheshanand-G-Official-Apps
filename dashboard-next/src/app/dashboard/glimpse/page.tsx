'use client';

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import Image from 'next/image'; // Import Next Image component
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Upload, ImageIcon, Trash2, Loader2, RefreshCw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Update the Glimpse interface to match your model
interface Glimpse {
  _id: string;
  image: string;
  createdAt: string;
  isdeleted?: boolean;
}

export default function GlimpsePage() {
  const [glimpses, setGlimpses] = useState<Glimpse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch glimpses
  const fetchGlimpses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get('/api/glimpse');

      if (response.data.success) {
        setGlimpses(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch glimpses');
      }
    } catch (err) {
      console.error('Error fetching glimpses:', err);
      setError('Failed to load glimpses. Please try again.');
      toast.error('Could not load glimpses');
    } finally {
      setIsLoading(false);
    }
  };

  // Load glimpses on initial render
  useEffect(() => {
    fetchGlimpses();
  }, []);

  // Clean up preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      setSelectedFile(files[0]);
      // Create preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(files[0]));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        // Create preview
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        toast.error('Please select an image file');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an image to upload');
      return;
    }

    try {
      setIsUploading(true);

      // Create form data - simplified for your model
      const formData = new FormData();
      formData.append('image', selectedFile);

      // Send API request
      const response = await axios.post('/api/glimpse', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success('Image uploaded successfully');
        setSelectedFile(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        setUploadDialogOpen(false);

        // Refresh the glimpse list
        fetchGlimpses();
      } else {
        throw new Error(response.data.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(prev => ({ ...prev, [id]: true }));

      const response = await axios.delete(`/api/glimpse/${id}`);

      if (response.data.success) {
        setGlimpses(prev => prev.filter(glimpse => glimpse._id !== id));
        toast.success('Image deleted successfully');
      } else {
        throw new Error(response.data.message || 'Failed to delete image');
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      toast.error('Failed to delete image');
    } finally {
      setIsDeleting(prev => ({ ...prev, [id]: false }));
    }
  };

  const formatFileSize = (file: File) => {
    const bytes = file.size;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-[#EEE1C6] bg-[#FFF8E7] p-6 shadow-sm dark:border-[#3a2a1a] dark:bg-[#1c130c]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#800020] dark:text-[#D4A017]">
            Glimpses
          </h1>
          <p className="text-[#7a5c3e] dark:text-muted-foreground">
            Manage your Swami Avdheshanand G image gallery - upload and showcase memorable moments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchGlimpses}
            disabled={isLoading}
            className="border-[#EEE1C6] text-[#800020] hover:bg-[#800020]/[0.06] hover:text-[#800020] focus-visible:ring-[#800020]/20 dark:border-[#3a2a1a] dark:text-[#D4A017]"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-br from-[#800020] to-[#4A0010] text-white hover:brightness-110 focus-visible:ring-[#800020]/20">
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-[#EEE1C6] dark:border-[#3a2a1a]">
              <DialogHeader>
                <DialogTitle className="text-[#800020] dark:text-[#D4A017]">
                  Upload Glimpse
                </DialogTitle>
                <DialogDescription>Add a new image to your glimpse gallery</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                    dragActive
                      ? 'border-[#800020] bg-[#800020]/[0.06]'
                      : 'border-[#EEE1C6] hover:border-[#D4A017] dark:border-[#3a2a1a] dark:hover:border-[#B8860B]'
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <div className="space-y-2">
                      <div className="flex justify-center">
                        <div className="relative h-40 w-auto rounded-md overflow-hidden">
                          <Image
                            src={previewUrl}
                            alt="Preview"
                            fill
                            sizes="(max-width: 768px) 100vw, 300px"
                            className="object-contain"
                          />
                        </div>
                      </div>
                      <p className="text-sm">
                        {selectedFile?.name} ({formatFileSize(selectedFile!)})
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#EEE1C6] text-[#800020] hover:bg-[#800020]/[0.06] hover:text-[#800020] focus-visible:ring-[#800020]/20 dark:border-[#3a2a1a] dark:text-[#D4A017]"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          if (previewUrl) {
                            URL.revokeObjectURL(previewUrl);
                            setPreviewUrl(null);
                          }
                        }}
                      >
                        Change Image
                      </Button>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="mx-auto h-12 w-12 text-[#D4A017]" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        <span className="font-medium text-[#800020] dark:text-[#D4A017]">
                          Click to upload
                        </span>{' '}
                        or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setUploadDialogOpen(false)}
                  className="border-[#EEE1C6] text-[#800020] hover:bg-[#800020]/[0.06] hover:text-[#800020] focus-visible:ring-[#800020]/20 dark:border-[#3a2a1a] dark:text-[#D4A017]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="bg-gradient-to-br from-[#800020] to-[#4A0010] text-white hover:brightness-110 focus-visible:ring-[#800020]/20"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {glimpses.length} image{glimpses.length !== 1 ? 's' : ''} in your glimpse gallery
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#800020] dark:text-[#D4A017]" />
          <span className="ml-2 text-lg">Loading glimpses...</span>
        </div>
      ) : error ? (
        <Card className="border-[#EEE1C6] dark:border-[#3a2a1a]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-destructive">{error}</p>
            <Button
              onClick={fetchGlimpses}
              className="mt-4 bg-gradient-to-br from-[#800020] to-[#4A0010] text-white hover:brightness-110 focus-visible:ring-[#800020]/20"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : glimpses.length === 0 ? (
        <Card className="border-[#EEE1C6] bg-[#FFF8E7] dark:border-[#3a2a1a] dark:bg-[#1c130c]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ImageIcon className="h-16 w-16 text-[#D4A017]" />
            <CardTitle className="mt-4 text-[#800020] dark:text-[#D4A017]">No glimpses yet</CardTitle>
            <CardDescription className="mt-2 text-center">
              Upload your first image to start your glimpse gallery
            </CardDescription>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="mt-4 bg-gradient-to-br from-[#800020] to-[#4A0010] text-white hover:brightness-110 focus-visible:ring-[#800020]/20">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload First Image
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {glimpses.map(glimpse => (
            <Card
              key={glimpse._id}
              className="group overflow-hidden border-[#EEE1C6] transition-shadow hover:shadow-lg hover:shadow-[#800020]/10 dark:border-[#3a2a1a]"
            >
              <div className="relative aspect-square">
                <Image
                  src={glimpse.image}
                  alt="Gallery image"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition-transform group-hover:scale-105"
                  onError={() => {
                    // Can't directly set src with Next Image, but could show a fallback component
                    console.error(`Failed to load image: ${glimpse.image}`);
                  }}
                  unoptimized={!glimpse.image.startsWith('https://')} // Only optimize secure URLs
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => handleDelete(glimpse._id)}
                  disabled={isDeleting[glimpse._id]}
                >
                  {isDeleting[glimpse._id] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <CardContent className="p-4 bg-[#FFF8E7] dark:bg-[#1c130c]">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3 text-[#D4A017]" />
                  <span>{formatDate(glimpse.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
