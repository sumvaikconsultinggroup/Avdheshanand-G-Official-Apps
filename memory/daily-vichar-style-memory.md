# Daily Vichar Style Memory

## Purpose

This file is the persistent working memory for Daily Vichar creation in this repo. It exists because platform-limited browsing does not guarantee full access to Instagram content, and model memory is not a durable project artifact. Use this file as the canonical style reference before creating or editing Daily Vichar entries.

## Source Status

- Target profile: `https://www.instagram.com/avdheshanandg_official/`
- Current limitation: the Instagram profile did not expose full post content reliably in this environment.
- Public context gathered so far:
  - Instagram handle reference: `https://www.instagram.com/avdheshanandg_official/`
  - Public video/title context: `https://www.youtube.com/watch?v=wfxkhkBF1JY`

## Confidence

- High confidence:
  - Swami Ji's public voice is spiritual, elevated, disciplined, reflective, and instructive.
  - The register should feel rooted in dharma, sadhana, seva, inner purity, restraint, compassion, and self-observation.
  - Hindi should be natural and dignified, not over-ornamented, not meme-like, and not corporate.
- Medium confidence:
  - Sanskrit should be used sparingly and purposefully, usually as short embedded terms or phrases, not as forced shlokas.
  - Daily Vichar should move from inner reflection to practical guidance, often in 1-3 compact lines.
- Low confidence:
  - Exact recurring Instagram caption patterns, punctuation habits, emoji usage, and repeated phrase structures.
  - The full balance of Hindi vs Sanskrit vs simple devotional vocabulary on the Instagram account.

## Voice Profile

- Calm authority, not motivational hype.
- Spiritual clarity over cleverness.
- Direct but compassionate instruction.
- Inner transformation before outer success.
- Moral and contemplative framing over worldly productivity language.
- The language should feel ashram-rooted, not influencer-rooted.

## Hindi Style

- Prefer simple, elevated Hindi.
- Use familiar spiritual vocabulary without sounding archaic in every line.
- Typical semantic zones:
  - `मन`
  - `चित्त`
  - `आत्मा`
  - `धर्म`
  - `साधना`
  - `सेवा`
  - `संयम`
  - `करुणा`
  - `शांति`
  - `मौन`
  - `अहंकार`
  - `विवेक`
  - `सत्य`
  - `प्रार्थना`
- Favor brevity and resonance.
- Avoid slang, internet phrasing, sarcasm, and self-help cliches.

## Sanskrit Usage

- Use Sanskrit as seasoning, not as constant density.
- Good use:
  - single terms such as `धर्म`, `विवेक`, `मौन`, `साधना`, `सेवा`, `श्रद्धा`
  - short compounds or compact phrases when accurate
- Avoid:
  - fabricated shlokas
  - decorative Sanskrit that sounds impressive but unnatural
  - long verses unless sourced and verified

## Structural Pattern For Strong Daily Vichar

- Pattern A:
  - inner observation
  - spiritual principle
  - practical direction
- Pattern B:
  - warning against ego/restlessness/desire
  - corrective wisdom
  - peaceful closure
- Pattern C:
  - one-line aphorism in Hindi
  - short clarifying second line
  - optional English rendering

## Tone Constraints

- Do not sound preachy in a punitive way.
- Do not sound generic like bulk quote pages.
- Do not imitate modern startup/productivity language.
- Do not overuse exclamation marks.
- Do not overstuff every entry with multiple Sanskrit nouns.
- Do not use English-heavy Hinglish unless explicitly requested.

## Content Themes To Rotate

- Self-discipline
- Inner silence
- Prayer
- Ego reduction
- Compassion
- Patience
- Right speech
- Service
- Humility
- Equanimity
- Duty
- Gratitude
- Guru-bhakti
- Satsang
- Time and impermanence
- Mind purification
- Desire and detachment
- Truthfulness
- Forgiveness
- Festival/devotional observances

## Daily Vichar Data Shape In This Repo

Each entry should align with `dashboard-next/src/models/DailyVichar.ts`:

- `date`
- `titleHindi`
- `titleEnglish`
- `contentHindi`
- `contentEnglish`
- `source`
- `category`
- `isPublished`

Allowed categories:

- `vedanta`
- `yoga`
- `dharma`
- `life`
- `prayer`
- `festival`

## Quality Bar

A publishable Daily Vichar should:

- feel spiritually grounded
- read naturally in Hindi
- carry one clear contemplative center
- be short enough for a card, notification, or caption
- remain original unless a verified source quote is intentionally cited

## Gaps To Close Before Building A 2000-Item Canon

For high-fidelity style matching, ingest one of these:

- exported Instagram captions/posts from the official account
- a CSV or JSON of post text
- screenshots/PDF of post captions
- official website thought archives
- verified pravachan transcripts

Without that source set, generated Vichar can be style-aligned but should be treated as original devotional writing, not authentic Swami Ji quotations.
