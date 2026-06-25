// dashboard-next/src/app/api/panchang/today/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import PanchangCache from '@/models/PanchangCache';
import {
  PANCHANG_ENGINE_VERSION,
  buildObservationDate,
  buildPanchangData,
  formatDateKey,
  resolveTimezone,
} from '@/lib/panchang/panchangService';

let hasWarnedDbUnavailable = false;
let hasWarnedCacheReadFailure = false;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat') || '29.9457'); // Default: Haridwar
    const lng = parseFloat(searchParams.get('lng') || '78.1642');
    const cityName = searchParams.get('city') || 'Haridwar';
    const tzParam = searchParams.get('timezone') || searchParams.get('tz');
    const dateStr = searchParams.get('date'); // Optional: YYYY-MM-DD
    const timezone = resolveTimezone(cityName, tzParam);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { success: false, message: 'Invalid coordinates. Latitude must be -90..90 and longitude -180..180.' },
        { status: 400 }
      );
    }

    const date = buildObservationDate(dateStr, timezone);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const dateKey = formatDateKey(date, timezone);
    const locationKey = `${lat.toFixed(4)}_${lng.toFixed(4)}_${PANCHANG_ENGINE_VERSION}`;

    let dbAvailable = true;
    try {
      await connectDB();
    } catch (dbError) {
      dbAvailable = false;
      if (!hasWarnedDbUnavailable) {
        hasWarnedDbUnavailable = true;
        console.warn('Panchang cache disabled; DB unavailable:', dbError instanceof Error ? dbError.message : dbError);
      }
    }

    // Check cache
    let cached: { panchangData: unknown } | null = null;
    if (dbAvailable) {
      try {
        cached = await PanchangCache.findOne({
          date: dateKey,
          locationKey,
          isDeleted: { $ne: true },
        }).lean();
      } catch (cacheReadError) {
        dbAvailable = false;
        if (!hasWarnedCacheReadFailure) {
          hasWarnedCacheReadFailure = true;
          console.warn('Panchang cache read failed, continuing without cache:', cacheReadError instanceof Error ? cacheReadError.message : cacheReadError);
        }
      }
    }

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached.panchangData,
        cached: true,
      });
    }

    const panchangData = buildPanchangData({
      date,
      lat,
      lng,
      cityName,
      timezone,
    });

    // Cache the result
    if (dbAvailable) {
      try {
        await PanchangCache.create({
          date: dateKey,
          locationKey,
          panchangData,
        });
      } catch {
        // Cache write failure is non-critical
      }
    }

    return NextResponse.json({
      success: true,
      data: panchangData,
      cached: false,
    });
  } catch (error) {
    console.error('Panchang API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to compute Panchang', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
