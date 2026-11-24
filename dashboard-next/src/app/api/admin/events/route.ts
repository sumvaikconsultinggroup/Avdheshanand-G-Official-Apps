import { NextRequest } from 'next/server';
import { listEvents } from '@/lib/eventList';

export async function GET(request: NextRequest) {
  return listEvents(request, true);
}
