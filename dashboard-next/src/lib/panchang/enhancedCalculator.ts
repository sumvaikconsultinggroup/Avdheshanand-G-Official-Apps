/**
 * Enhanced Panchang calculator.
 *
 * These helpers enrich the core Panchang response, but they should stay honest
 * about method limitations instead of branding themselves as "world class".
 */

import { getMoonSiderealLongitude, getSunSiderealLongitude } from './astronomy';

// ─── RASHI (Zodiac Sign) ─────────────────────────────────────────────

export const RASHI_NAMES = [
  'Mesha (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)',
  'Karka (Cancer)', 'Simha (Leo)', 'Kanya (Virgo)',
  'Tula (Libra)', 'Vrischika (Scorpio)', 'Dhanu (Sagittarius)',
  'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)',
];

export const RASHI_NAMES_HINDI = [
  'मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या',
  'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन',
];

export const RASHI_LORDS = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
];

export interface RashiInfo {
  name: string;
  nameHindi: string;
  number: number; // 1-12
  lord: string;
  degree: number; // Position within rashi (0-30)
}

export function getMoonRashi(date: Date): RashiInfo {
  const moonLon = getMoonSiderealLongitude(date);
  const rashiIndex = Math.floor(moonLon / 30);
  const degree = moonLon % 30;

  return {
    name: RASHI_NAMES[rashiIndex],
    nameHindi: RASHI_NAMES_HINDI[rashiIndex],
    number: rashiIndex + 1,
    lord: RASHI_LORDS[rashiIndex],
    degree: Math.round(degree * 100) / 100,
  };
}

export function getSunRashi(date: Date): RashiInfo {
  const sunLon = getSunSiderealLongitude(date);
  const rashiIndex = Math.floor(sunLon / 30);
  const degree = sunLon % 30;

  return {
    name: RASHI_NAMES[rashiIndex],
    nameHindi: RASHI_NAMES_HINDI[rashiIndex],
    number: rashiIndex + 1,
    lord: RASHI_LORDS[rashiIndex],
    degree: Math.round(degree * 100) / 100,
  };
}

// ─── HORA (Planetary Hour) ───────────────────────────────────────────

const HORA_SEQUENCE = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];
const DAY_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

export interface HoraInfo {
  planet: string;
  planetHindi: string;
  number: number; // Which hora of the day (1-24)
  isDay: boolean;
  nature: 'shubh' | 'ashubh' | 'mixed';
  suitableFor: string;
}

const HORA_PLANETS_HINDI: Record<string, string> = {
  Sun: 'सूर्य', Moon: 'चन्द्र', Mars: 'मंगल', Mercury: 'बुध',
  Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि',
};

const HORA_NATURES: Record<string, 'shubh' | 'ashubh' | 'mixed'> = {
  Sun: 'mixed', Moon: 'shubh', Mars: 'ashubh', Mercury: 'mixed',
  Jupiter: 'shubh', Venus: 'shubh', Saturn: 'ashubh',
};

const HORA_SUITABLE: Record<string, string> = {
  Sun: 'Government work, meeting authorities, medicines',
  Moon: 'Travel, new ventures, buying clothes',
  Mars: 'Avoid — conflict prone. Surgery, property disputes only',
  Mercury: 'Education, business, trade, communication',
  Jupiter: 'Religious activities, weddings, investments',
  Venus: 'Arts, romance, buying luxury items, beauty',
  Saturn: 'Avoid — delays likely. Only for agriculture, iron work',
};

export function getCurrentHora(
  date: Date,
  sunrise: Date,
  sunset: Date,
  dayOfWeek: number
): HoraInfo {
  const dayDuration = sunset.getTime() - sunrise.getTime();
  const nightDuration = 24 * 60 * 60 * 1000 - dayDuration;

  const dayHoraDuration = dayDuration / 12;
  const nightHoraDuration = nightDuration / 12;

  // Find day lord — first hora of the day belongs to the day's lord
  const dayLord = DAY_LORDS[dayOfWeek];
  const startIndex = HORA_SEQUENCE.indexOf(dayLord);

  let horaNumber: number;
  let isDay: boolean;

  if (date.getTime() >= sunrise.getTime() && date.getTime() < sunset.getTime()) {
    // Day hora
    horaNumber = Math.floor((date.getTime() - sunrise.getTime()) / dayHoraDuration) + 1;
    isDay = true;
  } else if (date.getTime() >= sunset.getTime()) {
    // Night hora (after sunset)
    horaNumber = Math.floor((date.getTime() - sunset.getTime()) / nightHoraDuration) + 13;
    isDay = false;
  } else {
    // Before sunrise (previous night)
    const prevSunset = new Date(sunset.getTime() - 24 * 60 * 60 * 1000);
    horaNumber = Math.floor((date.getTime() - prevSunset.getTime()) / nightHoraDuration) + 13;
    isDay = false;
  }

  const clampedHora = Math.min(Math.max(horaNumber, 1), 24);
  const planetIndex = (startIndex + clampedHora - 1) % 7;
  const planet = HORA_SEQUENCE[planetIndex];

  return {
    planet,
    planetHindi: HORA_PLANETS_HINDI[planet] || planet,
    number: clampedHora,
    isDay,
    nature: HORA_NATURES[planet] || 'mixed',
    suitableFor: HORA_SUITABLE[planet] || '',
  };
}

// ─── DISHA SHOOL (Directional Hazard) ────────────────────────────────

export interface DishaShoolInfo {
  direction: string;
  directionHindi: string;
  avoidTravel: string;
  remedy: string;
}

const DISHA_SHOOL_MAP: Record<number, DishaShoolInfo> = {
  0: { direction: 'West', directionHindi: 'पश्चिम', avoidTravel: 'Avoid travel towards West', remedy: 'Eat jaggery before leaving' },
  1: { direction: 'East', directionHindi: 'पूर्व', avoidTravel: 'Avoid travel towards East', remedy: 'Drink milk before leaving' },
  2: { direction: 'North', directionHindi: 'उत्तर', avoidTravel: 'Avoid travel towards North', remedy: 'Eat til (sesame) before leaving' },
  3: { direction: 'North', directionHindi: 'उत्तर', avoidTravel: 'Avoid travel towards North', remedy: 'Eat green gram before leaving' },
  4: { direction: 'South', directionHindi: 'दक्षिण', avoidTravel: 'Avoid travel towards South', remedy: 'Eat curd before leaving' },
  5: { direction: 'West', directionHindi: 'पश्चिम', avoidTravel: 'Avoid travel towards West', remedy: 'Eat sugar before leaving' },
  6: { direction: 'East', directionHindi: 'पूर्व', avoidTravel: 'Avoid travel towards East', remedy: 'Eat ginger before leaving' },
};

export function getDishaShool(dayOfWeek: number): DishaShoolInfo {
  return DISHA_SHOOL_MAP[dayOfWeek] || DISHA_SHOOL_MAP[0];
}

// ─── DUR MUHURTA (Inauspicious Period) ──────────────────────────────

export interface DurMuhurtaInfo {
  start: string;
  end: string;
  warning: string;
}

/**
 * Dur Muhurta — each day of the week has specific inauspicious periods
 * calculated as fractions of the day (sunrise to sunset).
 * Each muhurta = dayDuration / 15
 */
const DUR_MUHURTA_SEGMENTS: Record<number, number[]> = {
  0: [13],     // Sunday: 13th muhurta
  1: [7, 12],  // Monday: 7th and 12th muhurtas
  2: [5],      // Tuesday: 5th muhurta
  3: [8],      // Wednesday: 8th muhurta
  4: [11, 14], // Thursday: 11th and 14th muhurtas
  5: [9],      // Friday: 9th muhurta
  6: [1, 2],   // Saturday: 1st and 2nd muhurtas
};

export function calculateDurMuhurta(sunrise: Date, sunset: Date, dayOfWeek: number): DurMuhurtaInfo[] {
  const dayDuration = sunset.getTime() - sunrise.getTime();
  const muhurtaDuration = dayDuration / 15;
  const segments = DUR_MUHURTA_SEGMENTS[dayOfWeek] || [];

  return segments.map(seg => {
    const start = new Date(sunrise.getTime() + (seg - 1) * muhurtaDuration);
    const end = new Date(start.getTime() + muhurtaDuration);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      warning: `Avoid new beginnings during Dur Muhurta (${seg}th muhurta of the day)`,
    };
  });
}

// ─── VARJYAM (Inauspicious Nakshatra Period) ─────────────────────────

/**
 * Varjyam — a specific inauspicious period within each Nakshatra.
 * Calculated based on the Nakshatra number.
 * Duration is approximately 1 hour 36 minutes (96 minutes).
 */
const VARJYAM_GHATI_FROM_START: Record<number, number> = {
  1: 50, 2: 4, 3: 30, 4: 32, 5: 50, 6: 42, 7: 16,
  8: 24, 9: 30, 10: 14, 11: 8, 12: 30, 13: 22,
  14: 50, 15: 14, 16: 12, 17: 46, 18: 42, 19: 10,
  20: 50, 21: 46, 22: 40, 23: 40, 24: 20, 25: 10,
  26: 22, 27: 30,
};

export interface VarjyamInfo {
  start: string;
  end: string;
}

export function calculateVarjyam(
  nakshatraNumber: number,
  nakshatraStartTime: string,
  nakshatraEndTime: string
): VarjyamInfo | null {
  const ghatiFromStart = VARJYAM_GHATI_FROM_START[nakshatraNumber];
  if (ghatiFromStart === undefined) return null;

  const startMs = new Date(nakshatraStartTime).getTime();
  const endMs = new Date(nakshatraEndTime).getTime();
  const nakshatraDuration = endMs - startMs;

  if (nakshatraDuration <= 0) return null;

  // Each Nakshatra = 60 ghatis, Varjyam = 4 ghatis duration
  const ghatiDuration = nakshatraDuration / 60;
  const varjyamStart = new Date(startMs + ghatiFromStart * ghatiDuration);
  const varjyamEnd = new Date(varjyamStart.getTime() + 4 * ghatiDuration);

  return {
    start: varjyamStart.toISOString(),
    end: varjyamEnd.toISOString(),
  };
}

// ─── SAMVAT NAMES ────────────────────────────────────────────────────

const SAMVAT_NAMES = [
  'Prabhava', 'Vibhava', 'Shukla', 'Pramodoota', 'Prajothpatti',
  'Angirasa', 'Shrimukha', 'Bhava', 'Yuva', 'Dhatu',
  'Ishwara', 'Bahudhanya', 'Pramathi', 'Vikrama', 'Vrisha',
  'Chitrabhanu', 'Svabhanu', 'Tarana', 'Parthiva', 'Vyaya',
  'Sarvajit', 'Sarvadhari', 'Virodhi', 'Vikruti', 'Khara',
  'Nandana', 'Vijaya', 'Jaya', 'Manmatha', 'Durmukhi',
  'Hevilambi', 'Vilambi', 'Vikari', 'Sharvari', 'Plava',
  'Shubhakrut', 'Shobhakrut', 'Krodhi', 'Vishwavasu', 'Parabhava',
  'Plavanga', 'Keelaka', 'Saumya', 'Sadharana', 'Virodhikrut',
  'Pareedhavi', 'Pramadicha', 'Ananda', 'Rakshasa', 'Nala',
  'Pingala', 'Kalayukti', 'Siddharthi', 'Raudri', 'Durmathi',
  'Dundubhi', 'Rudhirodgari', 'Raktakshi', 'Krodhana', 'Akshaya',
];

export function getSamvatName(vikramSamvat: number): string {
  const index = (vikramSamvat - 1) % 60;
  return SAMVAT_NAMES[index] || 'Unknown';
}

// ─── AUSPICIOUS ACTIVITIES ──────────────────────────────────────────

export interface AuspiciousActivity {
  activity: string;
  activityHindi: string;
  suitable: boolean;
  reason: string;
}

export function getAuspiciousActivities(
  tithiNumber: number,
  nakshatraNumber: number,
  yogaNumber: number,
  dayOfWeek: number
): AuspiciousActivity[] {
  const activities: AuspiciousActivity[] = [];

  // Marriage (Vivah)
  const goodMarriageTithis = [2, 3, 5, 7, 10, 11, 12, 13];
  const goodMarriageNakshatras = [1, 4, 5, 7, 8, 11, 12, 13, 15, 21, 22, 27];
  const marriageSuitable = goodMarriageTithis.includes(tithiNumber) &&
    goodMarriageNakshatras.includes(nakshatraNumber) &&
    ![2, 6].includes(dayOfWeek);
  activities.push({
    activity: 'Marriage (Vivah)',
    activityHindi: 'विवाह',
    suitable: marriageSuitable,
    reason: marriageSuitable ? 'Favorable Tithi, Nakshatra and day' : 'Not recommended today',
  });

  // Griha Pravesh (Housewarming)
  const goodGrihaNakshatras = [4, 7, 8, 12, 13, 21, 22, 27];
  const grihaSuitable = goodGrihaNakshatras.includes(nakshatraNumber) && tithiNumber !== 30 && tithiNumber !== 8;
  activities.push({
    activity: 'Griha Pravesh',
    activityHindi: 'गृह प्रवेश',
    suitable: grihaSuitable,
    reason: grihaSuitable ? 'Auspicious Nakshatra for housewarming' : 'Not ideal today',
  });

  // Travel (Yatra)
  const goodTravelNakshatras = [1, 2, 4, 5, 7, 8, 13, 14, 15, 22, 27];
  const travelSuitable = goodTravelNakshatras.includes(nakshatraNumber) && dayOfWeek !== 2 && dayOfWeek !== 6;
  activities.push({
    activity: 'Travel (Yatra)',
    activityHindi: 'यात्रा',
    suitable: travelSuitable,
    reason: travelSuitable ? 'Good day for travel' : 'Avoid starting travel today',
  });

  // Business (Vyapar)
  const goodBusinessTithis = [2, 3, 5, 6, 10, 11, 12, 13];
  const businessSuitable = goodBusinessTithis.includes(tithiNumber) && dayOfWeek !== 6;
  activities.push({
    activity: 'Business/Trade',
    activityHindi: 'व्यापार',
    suitable: businessSuitable,
    reason: businessSuitable ? 'Auspicious for new business activities' : 'Not ideal for business today',
  });

  // Education (Vidya)
  const goodEduNakshatras = [1, 5, 7, 8, 12, 13, 14, 15, 22, 27];
  const eduSuitable = goodEduNakshatras.includes(nakshatraNumber) && [1, 3, 4, 5].includes(dayOfWeek);
  activities.push({
    activity: 'Education/Learning',
    activityHindi: 'शिक्षा/विद्या',
    suitable: eduSuitable,
    reason: eduSuitable ? 'Good day for starting education' : 'Average day for studies',
  });

  // Medicine (Chikitsa)
  const medSuitable = [1, 7, 8, 13, 22].includes(nakshatraNumber) && tithiNumber !== 14;
  activities.push({
    activity: 'Medical Treatment',
    activityHindi: 'चिकित्सा',
    suitable: medSuitable,
    reason: medSuitable ? 'Favorable for medical treatment' : 'Prefer another day if possible',
  });

  return activities;
}

// ─── DAY QUALITY SCORE ──────────────────────────────────────────────

export interface DayQuality {
  score: number; // 1-10
  label: string;
  labelHindi: string;
  color: string;
}

export function calculateDayQuality(
  tithiNumber: number,
  yogaNature: string,
  nakshatraNumber: number,
  dayOfWeek: number
): DayQuality {
  let score = 5; // Start neutral

  // Tithi bonus
  const shubhTithis = [2, 3, 5, 7, 10, 11, 12, 13];
  const ashubhTithis = [4, 8, 9, 14, 30];
  if (shubhTithis.includes(tithiNumber)) score += 1;
  if (ashubhTithis.includes(tithiNumber)) score -= 1;

  // Yoga bonus
  if (yogaNature === 'shubh') score += 1;
  if (yogaNature === 'ashubh') score -= 1;

  // Nakshatra bonus
  const shubhNakshatras = [1, 4, 7, 8, 12, 13, 22, 27];
  const ashubhNakshatras = [6, 9, 18, 19];
  if (shubhNakshatras.includes(nakshatraNumber)) score += 1;
  if (ashubhNakshatras.includes(nakshatraNumber)) score -= 1;

  // Special days
  if (tithiNumber === 15) score += 1; // Purnima
  if (tithiNumber === 11 || tithiNumber === 26) score += 1; // Ekadashi

  // Day of week — Friday, Wednesday, Thursday are generally good
  if ([3, 4, 5].includes(dayOfWeek)) score += 0.5;

  // Clamp
  score = Math.max(1, Math.min(10, Math.round(score)));

  const labels: Record<number, { en: string; hi: string; color: string }> = {
    1: { en: 'Highly Inauspicious', hi: 'अत्यंत अशुभ', color: '#DC2626' },
    2: { en: 'Very Inauspicious', hi: 'बहुत अशुभ', color: '#DC2626' },
    3: { en: 'Inauspicious', hi: 'अशुभ', color: '#EA580C' },
    4: { en: 'Below Average', hi: 'सामान्य से कम', color: '#EA580C' },
    5: { en: 'Average', hi: 'सामान्य', color: '#CA8A04' },
    6: { en: 'Good', hi: 'अच्छा', color: '#65A30D' },
    7: { en: 'Auspicious', hi: 'शुभ', color: '#16A34A' },
    8: { en: 'Very Auspicious', hi: 'अति शुभ', color: '#16A34A' },
    9: { en: 'Highly Auspicious', hi: 'सर्वश्रेष्ठ', color: '#059669' },
    10: { en: 'Supremely Auspicious', hi: 'परम शुभ', color: '#059669' },
  };

  const info = labels[score] || labels[5];

  return {
    score,
    label: info.en,
    labelHindi: info.hi,
    color: info.color,
  };
}
