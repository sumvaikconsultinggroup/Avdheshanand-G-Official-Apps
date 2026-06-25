// dashboard-next/src/lib/panchang/calculator.ts
import {
  findAngleCrossing,
  findSiderealMoonLongitudeCrossing,
  getMoonSiderealLongitude,
  getMoonSunAngle,
  getSunLongitude,
  getSunSiderealLongitude,
} from './astronomy';
import {
  TithiInfo, NakshatraInfo, YogaInfo, KaranaInfo,
  TITHI_NAMES, NAKSHATRA_NAMES, NAKSHATRA_DEITIES, NAKSHATRA_PLANETS,
  YOGA_NAMES, YOGA_NATURES, KARANA_NAMES,
} from './types';

/**
 * Calculate Tithi from Moon-Sun angular difference.
 * Tithi = (Moon longitude - Sun longitude) / 12
 * Each Tithi spans 12 degrees of angular difference.
 * Tithi number 1-30 (1-15 Shukla, 16-30 as 1-15 Krishna).
 */
export function calculateTithi(date: Date): TithiInfo {
  const angle = getMoonSunAngle(date);

  // Tithi number (1-indexed, 1-30)
  const tithiNumber = Math.floor(angle / 12) + 1;
  const clampedTithi = ((tithiNumber - 1) % 30) + 1;

  const paksha: 'Shukla' | 'Krishna' = clampedTithi <= 15 ? 'Shukla' : 'Krishna';
  const name = TITHI_NAMES[clampedTithi - 1] || 'Unknown';

  // Calculate start and end times for this Tithi
  const tithiStartAngle = (clampedTithi - 1) * 12;
  const tithiEndAngle = clampedTithi * 12;

  const searchStart = new Date(date.getTime() - 36 * 60 * 60 * 1000); // 36 hours before
  const searchEnd = new Date(date.getTime() + 36 * 60 * 60 * 1000); // 36 hours after

  let startTime: Date;
  let endTime: Date;

  try {
    startTime = findAngleCrossing(searchStart, date, tithiStartAngle);
    endTime = findAngleCrossing(date, searchEnd, tithiEndAngle);
  } catch {
    startTime = date;
    endTime = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  }

  return {
    name,
    number: clampedTithi,
    paksha,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  };
}

/**
 * Calculate Nakshatra from Moon longitude.
 * Nakshatra = Moon longitude / (360/27)
 * Each Nakshatra spans 13 degrees 20 minutes (13.333...).
 */
export function calculateNakshatra(date: Date): NakshatraInfo {
  const moonLon = getMoonSiderealLongitude(date);
  const nakshatraSpan = 360 / 27; // 13.333...

  const nakshatraIndex = Math.floor(moonLon / nakshatraSpan);
  const nakshatraNumber = (nakshatraIndex % 27) + 1;

  // Pada (quarter): each nakshatra has 4 padas of 3.333 degrees each
  const posInNakshatra = moonLon - nakshatraIndex * nakshatraSpan;
  const pada = Math.floor(posInNakshatra / (nakshatraSpan / 4)) + 1;

  const name = NAKSHATRA_NAMES[nakshatraNumber - 1] || 'Unknown';
  const deity = NAKSHATRA_DEITIES[nakshatraNumber - 1] || 'Unknown';
  const planet = NAKSHATRA_PLANETS[nakshatraNumber - 1] || 'Unknown';

  // Calculate start and end times
  const nakshatraStartLon = nakshatraIndex * nakshatraSpan;
  const nakshatraEndLon = (nakshatraIndex + 1) * nakshatraSpan;

  const searchStart = new Date(date.getTime() - 36 * 60 * 60 * 1000);
  const searchEnd = new Date(date.getTime() + 36 * 60 * 60 * 1000);

  let startTime: Date;
  let endTime: Date;

  try {
    startTime = findSiderealMoonLongitudeCrossing(searchStart, date, nakshatraStartLon % 360);
    endTime = findSiderealMoonLongitudeCrossing(date, searchEnd, nakshatraEndLon % 360);
  } catch {
    startTime = date;
    endTime = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  }

  return {
    name,
    number: nakshatraNumber,
    pada: Math.min(pada, 4),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    deity,
    planet,
  };
}

/**
 * Calculate Yoga from Sun + Moon longitudes.
 * Yoga = (Sun longitude + Moon longitude) / (360/27)
 */
export function calculateYoga(date: Date): YogaInfo {
  const sunLon = getSunSiderealLongitude(date);
  const moonLon = getMoonSiderealLongitude(date);

  const sumLon = (sunLon + moonLon) % 360;
  const yogaSpan = 360 / 27;
  const yogaIndex = Math.floor(sumLon / yogaSpan);
  const yogaNumber = (yogaIndex % 27) + 1;

  const name = YOGA_NAMES[yogaNumber - 1] || 'Unknown';
  const nature = YOGA_NATURES[yogaNumber - 1] || 'neutral';

  return { name, number: yogaNumber, nature };
}

/**
 * Calculate Karana from Tithi.
 * Karana = half of Tithi, 2 per Tithi.
 * There are 11 Karanas: 7 recurring (Bava to Vishti) + 4 fixed.
 * First half of Tithi 1 = Kimstughna (fixed)
 * Second half of Tithi 1 = Bava
 * Then recurring: Balava, Kaulava, Taitila, Garija, Vanija, Vishti
 * Second half of Tithi 30 (Amavasya) = Chatushpada, Naga (fixed)
 */
export function calculateKarana(tithiNumber: number): KaranaInfo {
  // Total karana number (1-60, 2 per tithi)
  const firstKaranaNum = (tithiNumber - 1) * 2 + 1;
  const secondKaranaNum = firstKaranaNum + 1;

  function getKaranaName(num: number): string {
    if (num === 1) return KARANA_NAMES[10]; // Kimstughna (fixed, first half of Tithi 1)
    if (num === 58) return KARANA_NAMES[7]; // Shakuni (fixed)
    if (num === 59) return KARANA_NAMES[8]; // Chatushpada (fixed)
    if (num === 60) return KARANA_NAMES[9]; // Naga (fixed)
    // Recurring: Bava(0) to Vishti(6), cycle through positions 2-57
    const recurringIndex = ((num - 2) % 7);
    return KARANA_NAMES[recurringIndex];
  }

  return {
    first: getKaranaName(firstKaranaNum),
    second: getKaranaName(secondKaranaNum),
  };
}

/**
 * Determine the Hindu month from the Sun longitude.
 * This remains an approximation for now and should eventually be replaced
 * with a proper lunar month / observance-grade month engine.
 */
export function calculateHinduMonth(date: Date): string {
  const sunLon = getSunLongitude(date);
  // Hindu solar months start when Sun enters a new 30-degree segment
  // Mesha (Aries) = 0-30 = Chaitra/Vaishakha
  const rashiIndex = Math.floor(sunLon / 30);
  // Map rashi to Hindu month (approximate)
  const monthMap: Record<number, string> = {
    0: 'Chaitra',      // Mesha (Aries)
    1: 'Vaishakha',    // Vrishabha (Taurus)
    2: 'Jyeshtha',     // Mithuna (Gemini)
    3: 'Ashadha',      // Karka (Cancer)
    4: 'Shravana',     // Simha (Leo)
    5: 'Bhadrapada',   // Kanya (Virgo)
    6: 'Ashwin',       // Tula (Libra)
    7: 'Kartik',       // Vrischika (Scorpio)
    8: 'Margashirsha',  // Dhanu (Sagittarius)
    9: 'Pausha',       // Makara (Capricorn)
    10: 'Magha',       // Kumbha (Aquarius)
    11: 'Phalguna',    // Meena (Pisces)
  };
  return monthMap[rashiIndex] || 'Unknown';
}

/**
 * Calculate Vikram Samvat year.
 * Vikram Samvat = Gregorian year + 56 or +57 (before/after Hindu New Year in Chaitra)
 */
export function calculateVikramSamvat(date: Date): number {
  const month = date.getMonth(); // 0-11
  // Hindu New Year (Chaitra Shukla Pratipada) falls around March/April
  if (month >= 2) { // March onwards
    return date.getFullYear() + 57;
  }
  return date.getFullYear() + 56;
}

/**
 * Calculate Shaka Samvat year.
 * Shaka Samvat = Gregorian year - 78 (or -77 after Chaitra)
 */
export function calculateShakaSamvat(date: Date): number {
  const month = date.getMonth();
  if (month >= 2) {
    return date.getFullYear() - 78;
  }
  return date.getFullYear() - 79;
}

/**
 * Calculate Ritu (season).
 * Based on Hindu month pairs.
 */
export function calculateRitu(hinduMonth: string): string {
  const rituMap: Record<string, string> = {
    Chaitra: 'Vasanta',
    Vaishakha: 'Vasanta',
    Jyeshtha: 'Grishma',
    Ashadha: 'Grishma',
    Shravana: 'Varsha',
    Bhadrapada: 'Varsha',
    Ashwin: 'Sharad',
    Kartik: 'Sharad',
    Margashirsha: 'Hemanta',
    Pausha: 'Hemanta',
    Magha: 'Shishira',
    Phalguna: 'Shishira',
  };
  return rituMap[hinduMonth] || 'Unknown';
}

/**
 * Calculate Ayana (Uttarayana/Dakshinayana).
 * Uttarayana: Sun moves northward (Makar Sankranti to Karka Sankranti, roughly Jan 14 - Jul 16)
 * Dakshinayana: Sun moves southward (Jul 16 - Jan 14)
 */
export function calculateAyana(date: Date): 'Uttarayana' | 'Dakshinayana' {
  const sunLon = getSunLongitude(date);
  // Uttarayana when Sun is in Makara to Mithuna (270-90 degrees approximately)
  // More precisely: Sun longitude 270-360 and 0-90 = Uttarayana
  if (sunLon >= 270 || sunLon < 90) {
    return 'Uttarayana';
  }
  return 'Dakshinayana';
}
