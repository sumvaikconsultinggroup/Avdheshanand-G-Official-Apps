'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sunrise, Sunset, Moon, Sun, Star, Sparkles, AlertTriangle,
  CalendarDays, MapPin, Compass, Clock, Activity, ChevronDown,
  ChevronRight, Check, X, Share2, Printer,
} from 'lucide-react';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────

interface PanchangData {
  tithi?: { name?: string; number?: number; paksha?: string; endTime?: string; startTime?: string };
  nakshatra?: { name?: string; deity?: string; planet?: string; pada?: number; endTime?: string };
  yoga?: { name?: string; nature?: string; number?: number };
  karana?: { name?: string; first?: string; second?: string };
  moonRashi?: { name?: string; nameHindi?: string; lord?: string; degree?: number };
  sunRashi?: { name?: string; nameHindi?: string; lord?: string };
  hora?: { planet?: string; planetHindi?: string; nature?: string; suitableFor?: string; number?: number };
  dishaShool?: { direction?: string; directionHindi?: string; avoidTravel?: string; remedy?: string };
  durMuhurta?: Array<{ start?: string; end?: string; warning?: string }>;
  varjyam?: { start?: string; end?: string } | null;
  dayQuality?: { score?: number; label?: string; labelHindi?: string; color?: string };
  auspiciousActivities?: Array<{ activity?: string; activityHindi?: string; suitable?: boolean; reason?: string }>;
  hinduMonth?: string;
  vikramSamvat?: number;
  samvatName?: string;
  shakaSamvat?: number;
  ritu?: string;
  ayana?: string;
  paksha?: string;
  sunrise?: string;
  sunset?: string;
  moonrise?: string;
  moonset?: string;
  rahuKaal?: { start?: string; end?: string };
  yamaghanda?: { start?: string; end?: string };
  gulikaKaal?: { start?: string; end?: string };
  brahmaMuhurta?: { start?: string; end?: string };
  abhijitMuhurta?: { start?: string; end?: string };
  festivals?: string[];
  ekadashi?: { name?: string; significance?: string };
  isPurnima?: boolean;
  isAmavasya?: boolean;
  vratDays?: string[];
  dayName?: string;
  dayNameHindi?: string;
  ayanamsha?: { name?: string; degrees?: number; mode?: string };
  calculationMethod?: {
    engineVersion?: string;
    zodiac?: string;
    ayanamsha?: string;
    locationBased?: boolean;
    observanceGrade?: string;
    notes?: string[];
  };
  choghadiya?: {
    day?: Array<{ name?: string; start?: string; end?: string; nature?: string }>;
    night?: Array<{ name?: string; start?: string; end?: string; nature?: string }>;
  };
  date?: string;
}

interface City { name: string; state: string; lat: number; lng: number; timezone?: string; }

// ─── Helpers ─────────────────────────────────────────────────────────

function fmt(t?: string): string {
  if (!t || t === 'N/A') return '--:--';
  if (/^\d{1,2}:\d{2}/.test(t.trim())) {
    const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
    if (!m) return t;
    let h = parseInt(m[1], 10);
    const min = m[2];
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${min} ${ap}`;
  }
  return t;
}

function period(p?: { start?: string; end?: string }): string {
  if (!p) return '--';
  return `${fmt(p.start)} — ${fmt(p.end)}`;
}

const NATURE_COLORS: Record<string, string> = {
  shubh: 'bg-green-100 text-green-800 border-green-200',
  amrit: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  labh: 'bg-blue-100 text-blue-800 border-blue-200',
  char: 'bg-amber-100 text-amber-800 border-amber-200',
  rog: 'bg-red-100 text-red-800 border-red-200',
  kaal: 'bg-gray-100 text-gray-800 border-gray-200',
  udveg: 'bg-orange-100 text-orange-800 border-orange-200',
};

// ─── Section Component ───────────────────────────────────────────────

function Section({ title, icon: IconComp, children, defaultOpen = true }: {
  title: string; icon: typeof Sun; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/70 backdrop-blur-sm rounded-xl border border-gold-100/50 overflow-hidden"
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gold-50/50 transition-colors"
      >
        <IconComp className="w-5 h-5 text-spiritual-saffron flex-shrink-0" />
        <span className="font-display text-spiritual-maroon font-semibold text-lg flex-1">{title}</span>
        <ChevronDown className={`w-4 h-4 text-spiritual-warmGray transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="px-5 pb-5"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Day Quality Badge ───────────────────────────────────────────────

function DayQualityBadge({ quality }: { quality?: PanchangData['dayQuality'] }) {
  if (!quality) return null;
  const dots = Array.from({ length: 10 }, (_, i) => i < (quality.score || 0));
  return (
    <div className="flex items-center gap-3 bg-white/80 rounded-xl px-4 py-3 border border-gold-100/50">
      <div className="flex gap-0.5">
        {dots.map((filled, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-full ${filled ? '' : 'bg-gray-200'}`}
            style={filled ? { backgroundColor: quality.color || '#CA8A04' } : undefined} />
        ))}
      </div>
      <div>
        <span className="font-semibold text-sm" style={{ color: quality.color }}>{quality.score}/10</span>
        <span className="text-spiritual-warmGray text-sm ml-2">{quality.label}</span>
        {quality.labelHindi && <span className="text-spiritual-warmGray text-xs ml-1">({quality.labelHindi})</span>}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function EnhancedPanchangPage() {
  const { t, i18n } = useTranslation('panchang');
  const lang = i18n.language;

  const [panchang, setPanchang] = useState<PanchangData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City>({ name: 'Haridwar', state: 'Uttarakhand', lat: 29.9457, lng: 78.1642 });
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  useEffect(() => {
    api.get('/panchang/cities').then(r => {
      const data = r.data?.data || r.data || [];
      setCities(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  const fetchPanchang = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/panchang/today?lat=${selectedCity.lat}&lng=${selectedCity.lng}&city=${encodeURIComponent(selectedCity.name)}&date=${selectedDate}`);
      setPanchang(res.data?.data || res.data);
      setErrorMessage(null);
    } catch {
      setPanchang(null);
      setErrorMessage(
        process.env.NODE_ENV === 'development'
          ? 'Unable to connect to Panchang service. Start the dashboard API on port 3001 or configure NEXT_PUBLIC_API_URL.'
          : t('retry')
      );
    }
    finally { setLoading(false); }
  }, [selectedCity, selectedDate, t]);

  useEffect(() => { fetchPanchang(); }, [fetchPanchang]);

  const filteredCities = cities.filter(c =>
    c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
    c.state?.toLowerCase().includes(citySearch.toLowerCase())
  );

  const isHindi = lang === 'hi';

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FFFDF5] via-[#FFF8E7] to-[#FFECB3]">
      {/* Hero Header */}
      <section className="relative pt-20 pb-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-display text-spiritual-maroon font-bold mb-2">
            {isHindi ? 'ॐ' : ''} {t('title')}
          </h1>
          <p className="text-spiritual-warmGray font-body">{t('subtitle')}</p>
        </div>
      </section>

      {/* Controls: City + Date */}
      <section className="max-w-4xl mx-auto px-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center justify-center">
          {/* City Selector */}
          <div className="relative">
            <button
              onClick={() => setShowCityDropdown(o => !o)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/80 border border-gold-200 rounded-xl text-sm font-medium text-spiritual-maroon hover:bg-gold-50 transition-colors"
            >
              <MapPin className="w-4 h-4 text-spiritual-saffron" />
              {selectedCity.name}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showCityDropdown && (
              <div className="absolute z-50 top-full mt-1 w-72 bg-white rounded-xl shadow-lg border border-gold-100 max-h-64 overflow-auto">
                <input
                  type="text"
                  placeholder="Search cities..."
                  value={citySearch}
                  onChange={e => setCitySearch(e.target.value)}
                  className="w-full px-3 py-2 border-b border-gold-100 text-sm focus:outline-none"
                  autoFocus
                />
                {filteredCities.map(c => (
                  <button
                    key={c.name}
                    onClick={() => { setSelectedCity(c); setShowCityDropdown(false); setCitySearch(''); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gold-50 flex justify-between"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-spiritual-warmGray">{c.state}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white/80 border border-gold-200 rounded-xl">
            <CalendarDays className="w-4 h-4 text-spiritual-saffron" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-sm font-medium text-spiritual-maroon bg-transparent focus:outline-none"
            />
          </div>

          {/* Share & Print */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!panchang) return;
                const text = `Today's Panchang (${selectedCity.name})\nTithi: ${panchang.tithi?.name || '--'} (${panchang.tithi?.paksha || ''})\nNakshatra: ${panchang.nakshatra?.name || '--'}\nSunrise: ${panchang.sunrise || '--'}`;
                if (navigator.share) {
                  navigator.share({ title: "Today's Panchang", text });
                } else {
                  navigator.clipboard.writeText(text);
                  alert('Panchang copied to clipboard!');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white/80 border border-gold-200 rounded-xl text-sm font-medium text-spiritual-maroon hover:bg-gold-50 transition-colors"
              title="Share Panchang"
            >
              <Share2 className="w-4 h-4 text-spiritual-saffron" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white/80 border border-gold-200 rounded-xl text-sm font-medium text-spiritual-maroon hover:bg-gold-50 transition-colors"
              title="Print Panchang"
            >
              <Printer className="w-4 h-4 text-spiritual-saffron" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </section>

      {/* Loading / Error */}
      {loading && (
        <div className="max-w-4xl mx-auto px-4 text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-spiritual-saffron border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-spiritual-warmGray">{t('loading')}</p>
        </div>
      )}

      {!loading && !panchang && (
        <div className="max-w-4xl mx-auto px-4 text-center py-12">
          <p className="text-spiritual-warmGray text-lg">{t('error')}</p>
          <p className="text-sm text-spiritual-warmGray mt-1">{errorMessage || t('retry')}</p>
        </div>
      )}

      {!loading && panchang && (
        <section className="max-w-4xl mx-auto px-4 pb-16 space-y-4">

          {/* Day Quality + Date Header */}
          <div className="text-center mb-2">
            <p className="text-xs text-spiritual-warmGray uppercase tracking-widest mb-1">
              {panchang.dayNameHindi && isHindi ? panchang.dayNameHindi : panchang.dayName} &middot;{' '}
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-sm text-spiritual-saffron font-spiritual">
              {panchang.hinduMonth} &middot; {panchang.samvatName && `${panchang.samvatName} `}
              {t('vikramSamvat')} {panchang.vikramSamvat} &middot; {t('shakaSamvat')} {panchang.shakaSamvat}
            </p>
            <DayQualityBadge quality={panchang.dayQuality} />
          </div>

          {/* ── Core Panchang (5 Elements) ── */}
          <Section title={`${t('tithi')} · ${t('nakshatra')} · ${t('yoga')} · ${t('karana')}`} icon={Star}>
            {/* Tithi Hero */}
            <div className="text-center mb-6">
              <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 ${
                panchang.tithi?.paksha?.toLowerCase() === 'shukla' ? 'bg-gold-100 text-gold-600' : 'bg-spiritual-maroon/10 text-spiritual-maroon'
              }`}>
                {panchang.tithi?.paksha} {t('paksha')}
              </span>
              <h2 className="text-3xl font-display text-spiritual-maroon font-bold">{panchang.tithi?.name}</h2>
              {panchang.tithi?.endTime && (
                <p className="text-sm text-spiritual-warmGray">{t('tithi')} &middot; {t('ends')} {fmt(panchang.tithi.endTime)}</p>
              )}
            </div>

            {/* Nakshatra, Yoga, Karana */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/60 rounded-xl p-4 text-center border border-gold-100/50">
                <Star className="w-5 h-5 text-spiritual-saffron mx-auto mb-1" />
                <p className="text-xs text-spiritual-warmGray mb-0.5">{t('nakshatra')}</p>
                <p className="font-display text-spiritual-maroon font-semibold text-lg">{panchang.nakshatra?.name || '--'}</p>
                {panchang.nakshatra?.deity && <p className="text-xs text-spiritual-warmGray">{t('deity')}: {panchang.nakshatra.deity}</p>}
                {panchang.nakshatra?.planet && <p className="text-xs text-spiritual-warmGray">{t('planet')}: {panchang.nakshatra.planet}</p>}
                {panchang.nakshatra?.pada && <p className="text-xs text-spiritual-warmGray">{t('pada')}: {panchang.nakshatra.pada}</p>}
              </div>
              <div className="bg-white/60 rounded-xl p-4 text-center border border-gold-100/50">
                <Sparkles className="w-5 h-5 text-gold-400 mx-auto mb-1" />
                <p className="text-xs text-spiritual-warmGray mb-0.5">{t('yoga')}</p>
                <p className="font-display text-spiritual-maroon font-semibold text-lg">{panchang.yoga?.name || '--'}</p>
                {panchang.yoga?.nature && (
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    panchang.yoga.nature === 'shubh' ? 'bg-green-100 text-green-700' : panchang.yoga.nature === 'ashubh' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {t(panchang.yoga.nature)}
                  </span>
                )}
              </div>
              <div className="bg-white/60 rounded-xl p-4 text-center border border-gold-100/50">
                <Moon className="w-5 h-5 text-spiritual-maroon/60 mx-auto mb-1" />
                <p className="text-xs text-spiritual-warmGray mb-0.5">{t('karana')}</p>
                <p className="font-display text-spiritual-maroon font-semibold text-lg">{panchang.karana?.name || '--'}</p>
              </div>
            </div>
          </Section>

          {/* ── Rashi + Hora (NEW) ── */}
          <Section title={`${t('rashi')} · ${t('hora')}`} icon={Compass}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Moon Rashi */}
              <div className="bg-white/60 rounded-xl p-4 text-center border border-gold-100/50">
                <Moon className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-xs text-spiritual-warmGray mb-0.5">{t('moonRashi')}</p>
                <p className="font-display text-spiritual-maroon font-semibold">{panchang.moonRashi?.name || '--'}</p>
                {panchang.moonRashi?.nameHindi && <p className="text-spiritual-saffron text-sm">{panchang.moonRashi.nameHindi}</p>}
                {panchang.moonRashi?.lord && <p className="text-xs text-spiritual-warmGray">{t('lord')}: {panchang.moonRashi.lord}</p>}
              </div>
              {/* Sun Rashi */}
              <div className="bg-white/60 rounded-xl p-4 text-center border border-gold-100/50">
                <Sun className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                <p className="text-xs text-spiritual-warmGray mb-0.5">{t('sunRashi')}</p>
                <p className="font-display text-spiritual-maroon font-semibold">{panchang.sunRashi?.name || '--'}</p>
                {panchang.sunRashi?.nameHindi && <p className="text-spiritual-saffron text-sm">{panchang.sunRashi.nameHindi}</p>}
              </div>
              {/* Current Hora */}
              <div className="bg-white/60 rounded-xl p-4 text-center border border-gold-100/50">
                <Clock className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-xs text-spiritual-warmGray mb-0.5">{t('currentHora')}</p>
                <p className="font-display text-spiritual-maroon font-semibold">
                  {panchang.hora?.planet || '--'}
                  {panchang.hora?.planetHindi && ` (${panchang.hora.planetHindi})`}
                </p>
                {panchang.hora?.nature && (
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${
                    panchang.hora.nature === 'shubh' ? 'bg-green-100 text-green-700' : panchang.hora.nature === 'ashubh' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {t(panchang.hora.nature || 'neutral')}
                  </span>
                )}
                {panchang.hora?.suitableFor && <p className="text-xs text-spiritual-warmGray mt-1">{panchang.hora.suitableFor}</p>}
              </div>
            </div>
          </Section>

          {/* ── Sun & Moon Timings ── */}
          <Section title={`${t('sunrise')} · ${t('sunset')}`} icon={Sunrise}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Sunrise, label: t('sunrise'), value: panchang.sunrise, color: 'text-orange-400' },
                { icon: Sunset, label: t('sunset'), value: panchang.sunset, color: 'text-orange-500' },
                { icon: Moon, label: t('moonrise'), value: panchang.moonrise, color: 'text-blue-300' },
                { icon: Sun, label: t('moonset'), value: panchang.moonset, color: 'text-gray-400' },
              ].map(({ icon: I, label, value, color }) => (
                <div key={label} className="flex items-center gap-2 bg-white/50 rounded-lg px-3 py-2.5 border border-gold-100/30">
                  <I className={`w-4 h-4 ${color} flex-shrink-0`} />
                  <div>
                    <p className="text-[10px] text-spiritual-warmGray uppercase tracking-wider">{label}</p>
                    <p className="font-semibold text-spiritual-maroon text-sm">{fmt(value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Auspicious / Inauspicious Timings ── */}
          <Section title={t('muhurtaTimings')} icon={Clock}>
            <div className="space-y-3">
              {/* Good */}
              <div>
                <p className="text-xs text-green-600 uppercase tracking-wider font-semibold mb-2">{t('auspiciousTimings')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: t('brahmaMuhurta'), value: period(panchang.brahmaMuhurta) },
                    { label: t('abhijitMuhurta'), value: period(panchang.abhijitMuhurta) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between bg-green-50 rounded-lg px-3 py-2 border border-green-100">
                      <span className="text-sm text-green-800 font-medium">{label}</span>
                      <span className="text-sm text-green-900 font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Bad */}
              <div>
                <p className="text-xs text-red-600 uppercase tracking-wider font-semibold mb-2">{t('inauspiciousTimings')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: t('rahuKaal'), value: period(panchang.rahuKaal) },
                    { label: t('yamaghanda'), value: period(panchang.yamaghanda) },
                    { label: t('gulikaKaal'), value: period(panchang.gulikaKaal) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                      <span className="text-sm text-red-800 font-medium">{label}</span>
                      <span className="text-sm text-red-900 font-semibold">{value}</span>
                    </div>
                  ))}
                  {panchang.durMuhurta?.map((dm, i) => (
                    <div key={i} className="flex justify-between bg-orange-50 rounded-lg px-3 py-2 border border-orange-100">
                      <span className="text-sm text-orange-800 font-medium">{t('durMuhurta')}</span>
                      <span className="text-sm text-orange-900 font-semibold">{fmt(dm.start)} — {fmt(dm.end)}</span>
                    </div>
                  ))}
                  {panchang.varjyam && (
                    <div className="flex justify-between bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
                      <span className="text-sm text-purple-800 font-medium">{t('varjyam')}</span>
                      <span className="text-sm text-purple-900 font-semibold">{fmt(panchang.varjyam.start)} — {fmt(panchang.varjyam.end)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Section>

          {/* ── Disha Shool (NEW) ── */}
          {panchang.dishaShool && (
            <Section title={t('dishaShool')} icon={AlertTriangle} defaultOpen={false}>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-start gap-3">
                  <Compass className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900">
                      {panchang.dishaShool.direction}
                      {panchang.dishaShool.directionHindi && ` (${panchang.dishaShool.directionHindi})`}
                    </p>
                    <p className="text-sm text-amber-800 mt-1">{panchang.dishaShool.avoidTravel}</p>
                    <p className="text-xs text-amber-700 mt-1">
                      <strong>{t('remedy')}:</strong> {panchang.dishaShool.remedy}
                    </p>
                  </div>
                </div>
              </div>
            </Section>
          )}

          {/* ── Auspicious Activities (NEW) ── */}
          {panchang.auspiciousActivities && panchang.auspiciousActivities.length > 0 && (
            <Section title={t('auspiciousActivities')} icon={Activity} defaultOpen={false}>
              <div className="space-y-2">
                {panchang.auspiciousActivities.map((act, i) => (
                  <div key={i} className={`flex items-start gap-3 rounded-lg px-4 py-3 border ${
                    act.suitable ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                  }`}>
                    {act.suitable ? <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /> : <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-medium text-sm">
                        {act.activity}
                        {act.activityHindi && <span className="text-spiritual-warmGray"> ({act.activityHindi})</span>}
                      </p>
                      <p className="text-xs text-spiritual-warmGray mt-0.5">{act.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Choghadiya ── */}
          {panchang.choghadiya && (
            <Section title={t('choghadiya')} icon={Clock} defaultOpen={false}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Day */}
                <div>
                  <p className="text-xs uppercase tracking-wider text-spiritual-saffron font-semibold mb-2">{t('dayChoghadiya')}</p>
                  <div className="space-y-1">
                    {panchang.choghadiya.day?.map((p, i) => (
                      <div key={i} className={`flex justify-between items-center px-3 py-1.5 rounded-lg text-xs border ${NATURE_COLORS[p.nature || 'char'] || 'bg-gray-50'}`}>
                        <span className="font-medium">{p.name}</span>
                        <span>{fmt(p.start)} — {fmt(p.end)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Night */}
                <div>
                  <p className="text-xs uppercase tracking-wider text-spiritual-maroon font-semibold mb-2">{t('nightChoghadiya')}</p>
                  <div className="space-y-1">
                    {panchang.choghadiya.night?.map((p, i) => (
                      <div key={i} className={`flex justify-between items-center px-3 py-1.5 rounded-lg text-xs border ${NATURE_COLORS[p.nature || 'char'] || 'bg-gray-50'}`}>
                        <span className="font-medium">{p.name}</span>
                        <span>{fmt(p.start)} — {fmt(p.end)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          )}

          {/* ── Festivals & Vrat ── */}
          {((panchang.festivals && panchang.festivals.length > 0) || (panchang.vratDays && panchang.vratDays.length > 0)) && (
            <Section title={t('todaysFestivals')} icon={Sparkles}>
              <div className="flex flex-wrap gap-2">
                {panchang.festivals?.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-gold-50 to-gold-100 text-spiritual-maroon border border-gold-200/50">
                    <span className="text-gold-500">&#10022;</span> {f}
                  </span>
                ))}
                {panchang.vratDays?.map((v, i) => (
                  <span key={`vrat-${i}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-orange-50 text-orange-800 border border-orange-200">
                    {v}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Special Day Banners */}
          {(panchang.isPurnima || panchang.isAmavasya || panchang.ekadashi) && (
            <div className="text-center">
              {panchang.ekadashi && (
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-gold-200 to-gold-300 text-spiritual-maroon shadow-glow text-sm font-semibold">
                  {t('ekadashiFasting')} — {panchang.ekadashi.name}
                </div>
              )}
              {panchang.isPurnima && (
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/80 text-spiritual-saffron border border-gold-300 text-sm font-semibold mt-2">
                  {t('purnima')}
                </div>
              )}
              {panchang.isAmavasya && (
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-spiritual-maroon/10 text-spiritual-maroon border border-spiritual-maroon/20 text-sm font-semibold mt-2">
                  {t('amavasya')}
                </div>
              )}
            </div>
          )}

          {/* Hindu Calendar Info */}
          <Section title={`${t('hinduMonth')} · ${t('ritu')} · ${t('ayana')}`} icon={CalendarDays} defaultOpen={false}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white/60 rounded-lg p-3 border border-gold-100/50">
                <p className="text-xs text-spiritual-warmGray">{t('hinduMonth')}</p>
                <p className="font-semibold text-spiritual-maroon">{panchang.hinduMonth}</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 border border-gold-100/50">
                <p className="text-xs text-spiritual-warmGray">{t('ritu')}</p>
                <p className="font-semibold text-spiritual-maroon">{panchang.ritu}</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 border border-gold-100/50">
                <p className="text-xs text-spiritual-warmGray">{t('ayana')}</p>
                <p className="font-semibold text-spiritual-maroon">{panchang.ayana === 'Uttarayana' ? t('uttarayana') : t('dakshinayana')}</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 border border-gold-100/50">
                <p className="text-xs text-spiritual-warmGray">{t('samvatName')}</p>
                <p className="font-semibold text-spiritual-maroon">{panchang.samvatName}</p>
              </div>
            </div>
          </Section>

          {panchang.calculationMethod && (
            <Section title="Calculation Method" icon={Compass} defaultOpen={false}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="bg-white/60 rounded-lg p-3 border border-gold-100/50">
                  <p className="text-xs text-spiritual-warmGray">Zodiac</p>
                  <p className="font-semibold text-spiritual-maroon capitalize">{panchang.calculationMethod.zodiac || '--'}</p>
                </div>
                <div className="bg-white/60 rounded-lg p-3 border border-gold-100/50">
                  <p className="text-xs text-spiritual-warmGray">Ayanamsha</p>
                  <p className="font-semibold text-spiritual-maroon">
                    {panchang.ayanamsha?.name || panchang.calculationMethod.ayanamsha || '--'}
                    {typeof panchang.ayanamsha?.degrees === 'number' ? ` (${panchang.ayanamsha.degrees.toFixed(4)}°)` : ''}
                  </p>
                </div>
                <div className="bg-white/60 rounded-lg p-3 border border-gold-100/50">
                  <p className="text-xs text-spiritual-warmGray">Engine Version</p>
                  <p className="font-semibold text-spiritual-maroon">{panchang.calculationMethod.engineVersion || '--'}</p>
                </div>
                <div className="bg-white/60 rounded-lg p-3 border border-gold-100/50">
                  <p className="text-xs text-spiritual-warmGray">Ritual Confidence</p>
                  <p className="font-semibold text-spiritual-maroon capitalize">{panchang.calculationMethod.observanceGrade || '--'}</p>
                </div>
              </div>
              {panchang.calculationMethod.notes && panchang.calculationMethod.notes.length > 0 && (
                <div className="mt-4 space-y-2">
                  {panchang.calculationMethod.notes.map((note, index) => (
                    <div key={index} className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

        </section>
      )}
    </main>
  );
}
