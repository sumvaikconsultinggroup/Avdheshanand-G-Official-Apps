// dashboard-next/src/lib/panchang/types.ts

export interface TithiInfo {
  name: string;
  number: number; // 1-30 (1-15 Shukla, 16-30 mapped as 1-15 Krishna)
  paksha: 'Shukla' | 'Krishna';
  startTime: string; // ISO string
  endTime: string; // ISO string
}

export interface NakshatraInfo {
  name: string;
  number: number; // 1-27
  pada: number; // 1-4
  startTime: string;
  endTime: string;
  deity: string;
  planet: string;
}

export interface YogaInfo {
  name: string;
  number: number; // 1-27
  nature: 'shubh' | 'ashubh' | 'neutral';
}

export interface KaranaInfo {
  first: string;
  second: string;
}

export interface TimePeriod {
  start: string;
  end: string;
}

export interface ChoghadiyaPeriod {
  name: string;
  start: string;
  end: string;
  nature: 'shubh' | 'amrit' | 'labh' | 'char' | 'rog' | 'kaal' | 'udveg';
}

export interface EkadashiInfo {
  name: string;
  significance: string;
  paranaTime?: string;
}

export interface PanchangResult {
  date: string; // YYYY-MM-DD
  locationName: string;
  lat: number;
  lng: number;
  tithi: TithiInfo;
  nakshatra: NakshatraInfo;
  yoga: YogaInfo;
  karana: KaranaInfo;
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  rahuKaal: TimePeriod;
  yamaghanda: TimePeriod;
  gulikaKaal: TimePeriod;
  brahmaMuhurta: TimePeriod;
  abhijitMuhurta: TimePeriod;
  hinduMonth: string;
  paksha: 'Shukla' | 'Krishna';
  vikramSamvat: number;
  shakaSamvat: number;
  ritu: string;
  ayana: 'Uttarayana' | 'Dakshinayana';
  choghadiya: {
    day: ChoghadiyaPeriod[];
    night: ChoghadiyaPeriod[];
  };
  festivals: string[];
  ekadashi?: EkadashiInfo;
  isPurnima: boolean;
  isAmavasya: boolean;
  vratDays: string[];
  sunLongitude: number;
  moonLongitude: number;
  tropicalSunLongitude?: number;
  tropicalMoonLongitude?: number;
  ayanamsha?: {
    name: string;
    degrees: number;
    mode: 'approximate';
  };
  calculationMethod?: {
    engineVersion: string;
    zodiac: 'sidereal';
    ayanamsha: string;
    locationBased: boolean;
    observanceGrade: 'beta';
    notes: string[];
  };
}

// Tithi names (1-30)
export const TITHI_NAMES: string[] = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya',
];

// Nakshatra names (1-27)
export const NAKSHATRA_NAMES: string[] = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
  'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
  'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
  'Vishakha', 'Anuradha', 'Jyeshtha', 'Moola', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

// Nakshatra deities
export const NAKSHATRA_DEITIES: string[] = [
  'Ashwini Kumaras', 'Yama', 'Agni', 'Brahma', 'Soma',
  'Rudra', 'Aditi', 'Brihaspati', 'Sarpas', 'Pitris',
  'Bhaga', 'Aryaman', 'Savita', 'Tvashta', 'Vayu',
  'Indragni', 'Mitra', 'Indra', 'Nirrti', 'Apah',
  'Vishvedevas', 'Vishnu', 'Vasus', 'Varuna',
  'Ajaikapada', 'Ahirbudhnya', 'Pushan',
];

// Nakshatra ruling planets
export const NAKSHATRA_PLANETS: string[] = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars',
  'Rahu', 'Jupiter', 'Saturn', 'Mercury', 'Ketu',
  'Venus', 'Sun', 'Moon', 'Mars', 'Rahu',
  'Jupiter', 'Saturn', 'Mercury', 'Ketu', 'Venus',
  'Sun', 'Moon', 'Mars', 'Rahu',
  'Jupiter', 'Saturn', 'Mercury',
];

// Yoga names (1-27)
export const YOGA_NAMES: string[] = [
  'Vishkumbha', 'Preeti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarman', 'Dhriti', 'Shoola', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Indra', 'Vaidhriti',
];

// Yoga natures
export const YOGA_NATURES: ('shubh' | 'ashubh' | 'neutral')[] = [
  'ashubh', 'shubh', 'shubh', 'shubh', 'shubh',
  'ashubh', 'shubh', 'shubh', 'ashubh', 'ashubh',
  'shubh', 'shubh', 'ashubh', 'shubh', 'ashubh',
  'shubh', 'ashubh', 'shubh', 'ashubh', 'shubh',
  'shubh', 'shubh', 'shubh', 'shubh', 'shubh',
  'shubh', 'ashubh',
];

// Karana names (11 types, 7 recurring + 4 fixed)
export const KARANA_NAMES: string[] = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garija',
  'Vanija', 'Vishti', // 7 recurring
  'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna', // 4 fixed
];

// Hindu months
export const HINDU_MONTHS: string[] = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha',
  'Shravana', 'Bhadrapada', 'Ashwin', 'Kartik',
  'Margashirsha', 'Pausha', 'Magha', 'Phalguna',
];

// Ritus (seasons)
export const RITUS: string[] = [
  'Vasanta', 'Grishma', 'Varsha', 'Sharad', 'Hemanta', 'Shishira',
];

// Rahu Kaal order by day of week (0=Sunday to 6=Saturday)
// Value = which 1/8th segment of the day (1-indexed)
export const RAHU_KAAL_ORDER: number[] = [8, 2, 7, 5, 6, 4, 3];

// Yamaghanda order by day of week
export const YAMAGHANDA_ORDER: number[] = [5, 4, 3, 7, 2, 1, 6];

// Gulika Kaal order by day of week
export const GULIKA_KAAL_ORDER: number[] = [7, 6, 5, 4, 3, 2, 1];

// Choghadiya names and natures for day periods by day of week
export const CHOGHADIYA_DAY_ORDER: Record<number, string[]> = {
  0: ['Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg'],
  1: ['Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit'],
  2: ['Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog'],
  3: ['Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh'],
  4: ['Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh'],
  5: ['Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char'],
  6: ['Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal'],
};

// Choghadiya natures
export const CHOGHADIYA_NATURES: Record<string, 'shubh' | 'amrit' | 'labh' | 'char' | 'rog' | 'kaal' | 'udveg'> = {
  Udveg: 'udveg',
  Char: 'char',
  Labh: 'labh',
  Amrit: 'amrit',
  Kaal: 'kaal',
  Shubh: 'shubh',
  Rog: 'rog',
};

// 24 Ekadashi names (Shukla + Krishna for 12 months)
export const EKADASHI_NAMES: Record<string, { shukla: string; krishna: string }> = {
  Chaitra: { shukla: 'Kamada Ekadashi', krishna: 'Papamochani Ekadashi' },
  Vaishakha: { shukla: 'Mohini Ekadashi', krishna: 'Varuthini Ekadashi' },
  Jyeshtha: { shukla: 'Nirjala Ekadashi', krishna: 'Apara Ekadashi' },
  Ashadha: { shukla: 'Devshayani Ekadashi', krishna: 'Yogini Ekadashi' },
  Shravana: { shukla: 'Putrada Ekadashi', krishna: 'Kamika Ekadashi' },
  Bhadrapada: { shukla: 'Parivartini Ekadashi', krishna: 'Aja Ekadashi' },
  Ashwin: { shukla: 'Papankusha Ekadashi', krishna: 'Indira Ekadashi' },
  Kartik: { shukla: 'Devutthani Ekadashi', krishna: 'Rama Ekadashi' },
  Margashirsha: { shukla: 'Mokshada Ekadashi', krishna: 'Utpanna Ekadashi' },
  Pausha: { shukla: 'Putrada Ekadashi (Pausha)', krishna: 'Shattila Ekadashi' },
  Magha: { shukla: 'Jaya Ekadashi', krishna: 'Vijaya Ekadashi' },
  Phalguna: { shukla: 'Amalaki Ekadashi', krishna: 'Papmochani Ekadashi' },
};
