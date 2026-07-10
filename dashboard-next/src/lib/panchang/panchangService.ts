import citiesData from '@/data/cities.json';
import {
  getLahiriAyanamsha,
  getMoonLongitude,
  getMoonSiderealLongitude,
  getMoonSunAngle,
  getSunLongitude,
  getSunSiderealLongitude,
} from '@/lib/panchang/astronomy';
import { calculateAyana, calculateHinduMonth, calculateKarana, calculateNakshatra, calculateRitu, calculateShakaSamvat, calculateTithi, calculateVikramSamvat, calculateYoga } from '@/lib/panchang/calculator';
import {
  getMoonRashi, getSunRashi, getCurrentHora, getDishaShool,
  calculateDurMuhurta, calculateVarjyam, getSamvatName,
  getAuspiciousActivities, calculateDayQuality,
} from '@/lib/panchang/enhancedCalculator';
import { findFestivals } from '@/lib/panchang/festivals';
import {
  calculateAbhijitMuhurta,
  calculateBrahmaMuhurta,
  calculateChoghadiya,
  calculateGulikaKaal,
  calculateRahuKaal,
  calculateYamaghanda,
  formatTime,
  getMoonTimes,
  getSunTimes,
} from '@/lib/panchang/muhurta';
import { EKADASHI_NAMES } from '@/lib/panchang/types';

// Bumped to v2 when the five core elements were anchored to sunrise (instead of
// the request instant). The version is part of the cache key, so bumping it
// invalidates stale cached panchang computed by the previous method.
export const PANCHANG_ENGINE_VERSION = 'sidereal-lahiri-v2';

interface CityEntry {
  name: string;
  timezone?: string;
}

interface BuildPanchangArgs {
  date: Date;
  lat: number;
  lng: number;
  cityName: string;
  timezone: string;
}

function timeZoneParts(date: Date, timeZone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  return parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = timeZoneParts(date, timeZone);
  const asUtcTs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtcTs - date.getTime();
}

function zonedDateToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  let adjusted = utcGuess - timeZoneOffsetMs(new Date(utcGuess), timeZone);

  // Re-apply once to handle DST transitions around the selected local time.
  adjusted = utcGuess - timeZoneOffsetMs(new Date(adjusted), timeZone);
  return new Date(adjusted);
}

export function formatDateKey(date: Date, timezone: string): string {
  const parts = timeZoneParts(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatTime24(date: Date, timezone: string): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });
}

export function resolveTimezone(cityName?: string, tzParam?: string | null): string {
  if (tzParam) return tzParam;
  if (!cityName) return 'Asia/Kolkata';

  const cityMatch = (citiesData as CityEntry[]).find(
    (city) => city.name.toLowerCase() === cityName.toLowerCase()
  );
  return cityMatch?.timezone || 'Asia/Kolkata';
}

export function buildObservationDate(dateStr: string | null, timezone: string): Date {
  if (!dateStr) return new Date();

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return new Date('invalid');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return zonedDateToUtc(year, month, day, 6, 0, 0, timezone);
}

export function buildPanchangData({
  date,
  lat,
  lng,
  cityName,
  timezone,
}: BuildPanchangArgs) {
  const dateKey = formatDateKey(date, timezone);
  const sunTimes = getSunTimes(date, lat, lng);
  const moonTimes = getMoonTimes(date, lat, lng);

  // Traditional Panchang reports the element prevailing at sunrise. Anchor the
  // five core elements to the day's sunrise (not the request instant) so the
  // result is stable throughout the day and matches standard panchang sources.
  const sunrise = sunTimes.sunrise;
  const observance =
    sunrise instanceof Date && !Number.isNaN(sunrise.getTime()) ? sunrise : date;

  const ayanamshaDegrees = getLahiriAyanamsha(observance);
  const tropicalSunLongitude = getSunLongitude(observance);
  const tropicalMoonLongitude = getMoonLongitude(observance);
  const siderealSunLongitude = getSunSiderealLongitude(observance);
  const siderealMoonLongitude = getMoonSiderealLongitude(observance);
  const nextDaySunrise = getSunTimes(
    new Date(date.getTime() + 24 * 60 * 60 * 1000),
    lat,
    lng
  ).sunrise;

  const tithi = calculateTithi(observance);
  const nakshatra = calculateNakshatra(observance);
  const yoga = calculateYoga(observance);
  const karana = calculateKarana(tithi.number);
  const hinduMonth = calculateHinduMonth(observance);
  const angleWithinTithi = getMoonSunAngle(observance) % 12;
  const currentKaranaHalf: 'first' | 'second' = angleWithinTithi < 6 ? 'first' : 'second';
  const currentKaranaName = currentKaranaHalf === 'first' ? karana.first : karana.second;

  const dayOfWeek = date.getDay();
  const rahuKaal = calculateRahuKaal(sunTimes.sunrise, sunTimes.sunset, dayOfWeek);
  const yamaghanda = calculateYamaghanda(sunTimes.sunrise, sunTimes.sunset, dayOfWeek);
  const gulikaKaal = calculateGulikaKaal(sunTimes.sunrise, sunTimes.sunset, dayOfWeek);
  const brahmaMuhurta = calculateBrahmaMuhurta(sunTimes.sunrise);
  const abhijitMuhurta = calculateAbhijitMuhurta(sunTimes.sunrise, sunTimes.sunset);
  const choghadiya = calculateChoghadiya(sunTimes.sunrise, sunTimes.sunset, nextDaySunrise, dayOfWeek);

  const formatPeriod = (period: { start: string; end: string }) => ({
    start: formatTime24(new Date(period.start), timezone),
    end: formatTime24(new Date(period.end), timezone),
    startIso: period.start,
    endIso: period.end,
  });

  const festivals = findFestivals(date, tithi, hinduMonth);

  const isEkadashi = tithi.number === 11 || tithi.number === 26;
  let ekadashi = undefined;
  if (isEkadashi && EKADASHI_NAMES[hinduMonth]) {
    const ekadashiData = EKADASHI_NAMES[hinduMonth];
    const ekadashiName = tithi.paksha === 'Shukla' ? ekadashiData.shukla : ekadashiData.krishna;
    ekadashi = {
      name: ekadashiName,
      significance: 'Fast dedicated to Lord Vishnu. Break fast the next morning after sunrise.',
    };
  }

  const vratDays: string[] = [];
  if (isEkadashi) vratDays.push('Ekadashi Vrat');
  if (tithi.number === 13) vratDays.push('Pradosh Vrat');
  if (tithi.number === 4 && tithi.paksha === 'Krishna') vratDays.push('Sankashti Chaturthi');
  if (tithi.number === 14 && tithi.paksha === 'Krishna') vratDays.push('Shivaratri');

  // Enhanced calculations. Rashi is part of the day's panchang → anchor to
  // sunrise; Hora is time-of-day specific → keep it at the request instant.
  const moonRashi = getMoonRashi(observance);
  const sunRashi = getSunRashi(observance);
  const hora = getCurrentHora(date, sunTimes.sunrise, sunTimes.sunset, dayOfWeek);
  const dishaShool = getDishaShool(dayOfWeek);
  const durMuhurta = calculateDurMuhurta(sunTimes.sunrise, sunTimes.sunset, dayOfWeek);
  const varjyam = calculateVarjyam(nakshatra.number, nakshatra.startTime, nakshatra.endTime);
  const vikramSamvat = calculateVikramSamvat(date);
  const samvatName = getSamvatName(vikramSamvat);
  const dayQuality = calculateDayQuality(tithi.number, yoga.nature, nakshatra.number, dayOfWeek);
  const auspiciousActivities = getAuspiciousActivities(tithi.number, nakshatra.number, yoga.number, dayOfWeek);

  // Day name
  const dayNames = ['Ravivaar', 'Somvaar', 'Mangalvaar', 'Budhvaar', 'Guruvaar', 'Shukravaar', 'Shanivaar'];
  const dayNamesHindi = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

  return {
    date: dateKey,
    locationName: cityName,
    lat,
    lng,
    // Day info
    dayName: dayNames[dayOfWeek],
    dayNameHindi: dayNamesHindi[dayOfWeek],
    dayOfWeek,
    dayQuality,
    // Core Panchang (5 elements)
    tithi: {
      ...tithi,
      startTime: formatTime24(new Date(tithi.startTime), timezone),
      endTime: formatTime24(new Date(tithi.endTime), timezone),
      startTimeIso: tithi.startTime,
      endTimeIso: tithi.endTime,
    },
    nakshatra: {
      ...nakshatra,
      startTime: formatTime24(new Date(nakshatra.startTime), timezone),
      endTime: formatTime24(new Date(nakshatra.endTime), timezone),
      startTimeIso: nakshatra.startTime,
      endTimeIso: nakshatra.endTime,
    },
    yoga,
    karana: {
      ...karana,
      name: currentKaranaName,
      currentHalf: currentKaranaHalf,
    },
    // Rashi (NEW)
    moonRashi,
    sunRashi,
    // Hora (NEW)
    hora,
    // Sun/Moon timings
    sunrise: formatTime24(sunTimes.sunrise, timezone),
    sunset: formatTime24(sunTimes.sunset, timezone),
    moonrise: moonTimes.moonrise ? formatTime24(moonTimes.moonrise, timezone) : 'N/A',
    moonset: moonTimes.moonset ? formatTime24(moonTimes.moonset, timezone) : 'N/A',
    // Muhurta & Inauspicious timings
    rahuKaal: formatPeriod(rahuKaal),
    yamaghanda: formatPeriod(yamaghanda),
    gulikaKaal: formatPeriod(gulikaKaal),
    brahmaMuhurta: formatPeriod(brahmaMuhurta),
    abhijitMuhurta: formatPeriod(abhijitMuhurta),
    // Enhanced inauspicious timings (NEW)
    dishaShool,
    durMuhurta: durMuhurta.map(dm => ({
      ...dm,
      start: formatTime24(new Date(dm.start), timezone),
      end: formatTime24(new Date(dm.end), timezone),
      startIso: dm.start,
      endIso: dm.end,
    })),
    varjyam: varjyam ? {
      start: formatTime24(new Date(varjyam.start), timezone),
      end: formatTime24(new Date(varjyam.end), timezone),
      startIso: varjyam.start,
      endIso: varjyam.end,
    } : null,
    // Consolidated muhurta object
    muhurta: {
      brahmaMuhurta: formatPeriod(brahmaMuhurta),
      abhijitMuhurta: formatPeriod(abhijitMuhurta),
      rahuKaal: formatPeriod(rahuKaal),
      yamaghanda: formatPeriod(yamaghanda),
      gulikaKaal: formatPeriod(gulikaKaal),
    },
    // Hindu calendar
    hinduMonth,
    paksha: tithi.paksha,
    vikramSamvat,
    samvatName, // NEW
    samvatYear: vikramSamvat,
    shakaSamvat: calculateShakaSamvat(date),
    ritu: calculateRitu(hinduMonth),
    ayana: calculateAyana(observance),
    // Choghadiya
    choghadiya: {
      day: choghadiya.day.map((period) => ({
        ...period,
        start: formatTime24(new Date(period.start), timezone),
        end: formatTime24(new Date(period.end), timezone),
        startIso: period.start,
        endIso: period.end,
      })),
      night: choghadiya.night.map((period) => ({
        ...period,
        start: formatTime24(new Date(period.start), timezone),
        end: formatTime24(new Date(period.end), timezone),
        startIso: period.start,
        endIso: period.end,
      })),
    },
    // Festivals & Vrat
    festivals,
    festival: festivals[0] || null,
    ekadashi,
    isPurnima: tithi.number === 15,
    isAmavasya: tithi.number === 30,
    vratDays,
    // Auspicious activities (NEW)
    auspiciousActivities,
    // Raw astronomical data
    sunLongitude: siderealSunLongitude,
    moonLongitude: siderealMoonLongitude,
    tropicalSunLongitude,
    tropicalMoonLongitude,
    ayanamsha: {
      name: 'Lahiri',
      degrees: Math.round(ayanamshaDegrees * 10000) / 10000,
      mode: 'approximate' as const,
    },
    calculationMethod: {
      engineVersion: PANCHANG_ENGINE_VERSION,
      zodiac: 'sidereal' as const,
      ayanamsha: 'Approximate Lahiri',
      locationBased: true,
      observanceGrade: 'beta' as const,
      notes: [
        'Core Panchang zodiac fields use a sidereal correction instead of raw tropical longitudes.',
        'Festival, vrat, and lunar month observance logic is still under active validation and should be verified for high-stakes ritual use.',
      ],
    },
    timezone,
    generatedAtIso: date.toISOString(),
    sunriseDisplay: formatTime(sunTimes.sunrise, timezone),
    sunsetDisplay: formatTime(sunTimes.sunset, timezone),
  };
}
