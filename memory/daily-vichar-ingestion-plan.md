# Daily Vichar Ingestion Plan

## Goal

Build a high-quality bank of at least 2000 Daily Vichar entries for the existing dashboard, website, and mobile app flow.

## Non-Negotiable Accuracy Rule

Do not present generated devotional writing as direct Swami Ji quotations unless the wording is verified from a source archive.

## Recommended Pipeline

1. Collect source material.
2. Extract captions/transcripts into plain text.
3. Tag each source line by theme, tone, and Sanskrit density.
4. Build a style profile from the source corpus.
5. Generate original Daily Vichar inspired by the style.
6. Review for authenticity, theological coherence, and Hindi naturalness.
7. Import into the existing `DailyVichar` model format.

## Best Input Formats

- Instagram export as CSV/JSON
- caption text in Markdown
- Google Sheet
- PDF booklet
- website archives
- YouTube transcript files

## Suggested Batch Strategy

- Batch 1: 100 source-backed style examples
- Batch 2: 300 reviewed originals
- Batch 3: 800 expanded originals
- Batch 4: 800 more with category balancing

## Review Dimensions

- Hindi naturalness
- spiritual authenticity
- non-repetition
- Sanskrit restraint
- category balance
- suitable length for app card and notification

## Delivery Shape

For import-ready records, each item should have:

- `date`
- `titleHindi`
- `titleEnglish`
- `contentHindi`
- `contentEnglish`
- `source`
- `category`
- `isPublished`

## Current Project Reality

- The repo already has a Daily Vichar model and CRUD API.
- What is missing is a trustworthy source corpus plus a large reviewed content bank.
- The fastest honest route is source ingestion first, then generation.
