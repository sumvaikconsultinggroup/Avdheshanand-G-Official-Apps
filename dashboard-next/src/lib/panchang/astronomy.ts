// dashboard-next/src/lib/panchang/astronomy.ts
import * as Astronomy from 'astronomy-engine';

const DAY_MS = 24 * 60 * 60 * 1000;

// Approximate official Lahiri ayanamsha anchored to the J1900.0 reference
// published by Swiss Ephemeris docs, then advanced using the mean precession rate.
const LAHIRI_J1900_DEGREES = 22 + 26 / 60 + 45.5 / 3600;
const LAHIRI_PRECESSION_DEGREES_PER_YEAR = 50.290966 / 3600;
const J1900_UTC_MS = Date.UTC(1899, 11, 31, 12, 0, 0);

export function normalizeDegrees(value: number): number {
  let normalized = value % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

/**
 * Get the ecliptic longitude of the Sun at a given date.
 * Returns value in degrees (0-360).
 */
export function getSunLongitude(date: Date): number {
  const astroTime = Astronomy.MakeTime(date);
  const sunEcliptic = Astronomy.SunPosition(astroTime);
  return normalizeDegrees(sunEcliptic.elon);
}

/**
 * Get the ecliptic longitude of the Moon at a given date.
 * Returns value in degrees (0-360).
 */
export function getMoonLongitude(date: Date): number {
  const astroTime = Astronomy.MakeTime(date);
  const moonEcliptic = Astronomy.EclipticGeoMoon(astroTime);
  return normalizeDegrees(moonEcliptic.lon);
}

/**
 * Approximate Lahiri ayanamsha in degrees.
 *
 * This is good enough to place rashi/nakshatra/yoga on the sidereal zodiac
 * instead of raw tropical longitudes, while we work toward a fully validated
 * observance-grade Panchang engine.
 */
export function getLahiriAyanamsha(date: Date): number {
  const elapsedYears = (date.getTime() - J1900_UTC_MS) / (365.2425 * DAY_MS);
  return normalizeDegrees(
    LAHIRI_J1900_DEGREES + elapsedYears * LAHIRI_PRECESSION_DEGREES_PER_YEAR
  );
}

export function toSiderealLongitude(tropicalLongitude: number, ayanamsha: number): number {
  return normalizeDegrees(tropicalLongitude - ayanamsha);
}

export function getSunSiderealLongitude(date: Date): number {
  return toSiderealLongitude(getSunLongitude(date), getLahiriAyanamsha(date));
}

export function getMoonSiderealLongitude(date: Date): number {
  return toSiderealLongitude(getMoonLongitude(date), getLahiriAyanamsha(date));
}

/**
 * Get the angular difference between Moon and Sun longitudes.
 * This is the basis for Tithi calculation.
 * Returns value in degrees (0-360).
 */
export function getMoonSunAngle(date: Date): number {
  const sunLon = getSunLongitude(date);
  const moonLon = getMoonLongitude(date);
  return normalizeDegrees(moonLon - sunLon);
}

/**
 * Find the exact time when the Moon-Sun angle crosses a given degree boundary.
 * Uses binary search for precision.
 * @param startDate Start of search window
 * @param endDate End of search window
 * @param targetAngle The target Moon-Sun angle in degrees
 * @param toleranceMinutes Precision in minutes (default 1 minute)
 */
export function findAngleCrossing(
  startDate: Date,
  endDate: Date,
  targetAngle: number,
  toleranceMinutes: number = 1
): Date {
  let lo = startDate.getTime();
  let hi = endDate.getTime();
  const toleranceMs = toleranceMinutes * 60 * 1000;

  while (hi - lo > toleranceMs) {
    const mid = lo + (hi - lo) / 2;
    const midDate = new Date(mid);
    const angle = getMoonSunAngle(midDate);

    // Handle the wrap-around at 360/0 boundary
    let diff = angle - targetAngle;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (diff < 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return new Date(lo + (hi - lo) / 2);
}

/**
 * Find the exact time when the Moon longitude crosses a given degree boundary.
 * Used for Nakshatra transitions.
 */
export function findMoonLongitudeCrossing(
  startDate: Date,
  endDate: Date,
  targetLongitude: number,
  toleranceMinutes: number = 1
): Date {
  let lo = startDate.getTime();
  let hi = endDate.getTime();
  const toleranceMs = toleranceMinutes * 60 * 1000;

  while (hi - lo > toleranceMs) {
    const mid = lo + (hi - lo) / 2;
    const midDate = new Date(mid);
    const moonLon = getMoonLongitude(midDate);

    let diff = moonLon - targetLongitude;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (diff < 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return new Date(lo + (hi - lo) / 2);
}

/**
 * Find the exact time when the Moon's sidereal longitude crosses a given degree boundary.
 * Used for Nakshatra transitions on the sidereal zodiac.
 */
export function findSiderealMoonLongitudeCrossing(
  startDate: Date,
  endDate: Date,
  targetLongitude: number,
  toleranceMinutes: number = 1
): Date {
  let lo = startDate.getTime();
  let hi = endDate.getTime();
  const toleranceMs = toleranceMinutes * 60 * 1000;

  while (hi - lo > toleranceMs) {
    const mid = lo + (hi - lo) / 2;
    const midDate = new Date(mid);
    const moonLon = getMoonSiderealLongitude(midDate);

    let diff = moonLon - targetLongitude;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (diff < 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return new Date(lo + (hi - lo) / 2);
}
