export interface Event {
  _id: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  description: string;
  eventImage?: string;
  registeredUsers?: string[];
  isDeleted?: boolean;
}

export interface Article {
  _id: string;
  title: string;
  description: string;
  coverImage?: string;
  category?: string;
  link?: string;
  readTime?: number;
  publishedDate: string;
  isDeleted?: boolean;
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  description?: string;
  price: number;
  coverImage?: string;
  purchaseUrl?: string;
  ISBN?: string;
  isbn?: string;
  pages?: number;
  language?: string;
  genre?: string;
}

export interface Podcast {
  _id: string;
  title: string;
  description?: string;
  videoUrl: string;
  videoId?: string;
  duration?: string;
  coverImage?: string;
  category?: string;
  date?: string;
  featured?: boolean;
}

export interface VideoSeries {
  _id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  videos?: Video[];
}

export interface Video {
  _id: string;
  title: string;
  youtubeUrl?: string;
  thumbnail?: string;
  duration?: string;
  description?: string;
}

export interface Schedule {
  _id: string;
  month: string;
  locations: string;
  timeSlots: {
    period?: string;
    startDate: string;
    endDate: string;
    _id: string;
  }[];
  appointment?: boolean;
  maxPeople?: number;
  dateRange?: string;
  isDeleted?: boolean;
}

export interface DonationCampaign {
  _id: string;
  title: string;
  description: string;
  goal: number;
  achieved: number;
  backgroundImage?: string;
  isActive: boolean;
  donors?: number;
  totalDays?: number;
}

export interface Volunteer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  country?: string;
  skills?: string[];
  availability?: string;
}

export interface GlimpseImage {
  _id: string;
  title?: string;
  // Backend stores the URL in `image`; `imageUrl` kept optional for safety.
  image: string;
  imageUrl?: string;
  description?: string;
}
