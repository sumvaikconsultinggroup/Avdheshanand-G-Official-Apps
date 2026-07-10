import OpenAI from 'openai';

/**
 * Generates a fresh "Daily Vichar" (spiritual thought) for a given day using
 * OpenAI. Returns null on any failure (missing key, API error, bad JSON) so the
 * caller can fall back to a stored vichar — generation must never hard-fail.
 *
 * Requires OPENAI_API_KEY in the environment.
 */

export interface GeneratedVichar {
  titleHindi: string;
  titleEnglish: string;
  contentHindi: string;
  contentEnglish: string;
  source: string;
}

let cachedClient: OpenAI | null = null;
function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

export async function generateDailyVichar(date: Date): Promise<GeneratedVichar | null> {
  const client = getClient();
  if (!client) {
    console.warn('[dailyVichar] OPENAI_API_KEY not set — cannot generate');
    return null;
  }

  const dateLabel = date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.9,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You compose a short daily spiritual reflection ("Daily Vichar") in the ' +
            'voice of Swami Avdheshanand G — a revered Sanatana Dharma / Vedanta master. ' +
            'The reflection is uplifting, rooted in Indian spiritual wisdom (dharma, bhakti, ' +
            'karma, seva, self-realization), and accessible to everyday devotees. ' +
            'Always return STRICT JSON with exactly these keys: titleHindi, titleEnglish, ' +
            'contentHindi, contentEnglish, source. ' +
            'Titles: 2-5 words. Content: ONE or TWO sentences (max ~280 characters), in the ' +
            'respective language, devotional and original (do NOT quote famous people). ' +
            'Hindi fields must be in Devanagari script. Set source to "Swami Avdheshanand G".',
        },
        {
          role: 'user',
          content:
            `Compose a unique Daily Vichar for ${dateLabel}. Make it distinct and fresh — ` +
            `vary the theme (e.g. inner peace, seva, devotion, detachment, gratitude, the Self). ` +
            `Return only the JSON object.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<GeneratedVichar>;
    if (
      !parsed.titleHindi ||
      !parsed.titleEnglish ||
      !parsed.contentHindi ||
      !parsed.contentEnglish
    ) {
      console.warn('[dailyVichar] OpenAI returned incomplete fields');
      return null;
    }

    return {
      titleHindi: String(parsed.titleHindi).slice(0, 200),
      titleEnglish: String(parsed.titleEnglish).slice(0, 200),
      contentHindi: String(parsed.contentHindi).slice(0, 1900),
      contentEnglish: String(parsed.contentEnglish).slice(0, 1900),
      source: parsed.source ? String(parsed.source) : 'Swami Avdheshanand G',
    };
  } catch (error) {
    console.error('[dailyVichar] Generation failed:', error);
    return null;
  }
}
