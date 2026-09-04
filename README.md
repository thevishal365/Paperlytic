# Paperlytic

> A minimal, hourly-updated index of newly published academic research.

## Features

- Server-rendered initial research feed
- Search by title or journal
- Show More loading for additional papers
- Offset-based infinite fetching through TanStack Query
- Direct DOI links
- Frontend title and English-language filtering
- DOI duplicate filtering during ingestion
- Persisted default-feed query cache
- About page and research guides

## How It Works

```text
Crossref API
     ↓
Google Apps Script ingestion
     ↓
Normalization and duplicate filtering
     ↓
Supabase articles table
     ↓
TanStack Start server function
     ↓
Paperlytic frontend
```

The frontend reads Supabase through TanStack Start server functions. Google Apps Script separately fetches Crossref records and updates both Supabase and the configured Google Sheet.

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- TanStack Start
- TanStack Router
- TanStack Query
- Tailwind CSS
- Radix UI primitives and local UI components
- `franc` for English-language detection
- Instrument Serif and IBM Plex fonts

### Backend

- Google Apps Script
- Crossref REST API
- Supabase REST API
- Google Sheets
- Netlify

## Project Structure

```text
Paperlytic/
├── backend/
│   ├── Code.js
│   ├── Config.js
│   ├── CrossrefService.js
│   ├── SheetRepository.js
│   ├── SupabaseService.js
│   ├── Utils.js
│   ├── WebApp.js
│   ├── .clasp.json
│   └── appsscript.json
│
├── public/
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── SiteHeader.tsx
│   │   └── ui/
│   ├── hooks/
│   │   └── use-mobile.tsx
│   ├── lib/
│   │   ├── articles.functions.ts
│   │   ├── articles.server.ts
│   │   ├── articles.ts
│   │   ├── error-capture.ts
│   │   ├── error-page.ts
│   │   └── utils.ts
│   └── routes/
│       ├── __root.tsx
│       ├── about.tsx
│       ├── guides/
│       ├── index.tsx
│       ├── README.md
│       └── sitemap[.]xml.ts
│
├── package.json
├── package-lock.json
├── vite.config.ts
├── tsconfig.json
├── netlify.toml
└── README.md
```

## Backend

The backend handles Crossref ingestion and updates the database and spreadsheet.

### Main Services

- `CrossrefService.js`
  Fetches recent journal articles from Crossref, retries requests, normalizes records, and extracts the created date.

- `SheetRepository.js`
  Reads the configured sheet, detects existing normalized DOIs, inserts new rows, adds DOI links, and prunes old rows.

- `SupabaseService.js`
  Sends new article rows to Supabase in controlled batches and ignores duplicate DOI conflicts.

- `Config.js`
  Reads and validates Google Apps Script Script Properties.

- `Code.js`
  Coordinates ingestion with a script lock, Crossref fetching, Supabase writes, and Sheet updates.

- `WebApp.js`
  Provides a separate private JSON endpoint with `offset` and `limit` parameters. The current React frontend does not use this endpoint.

- `Utils.js`
  Provides retry and non-negative integer parsing helpers.

## Configuration

The backend uses Google Apps Script Script Properties for configuration.

Required properties:

```text
SUPABASE_URL
SUPABASE_KEY
SUPABASE_SECRET
SHEET_NAME
CROSSREF_MAILTO
```

Do not store secret values directly in the source code.

The Apps Script manifest uses the `Asia/Kolkata` time zone and restricts Web App access to `MYSELF`. The current frontend has no `.env` or `import.meta.env` configuration; its Supabase read constants are defined in `src/lib/articles.ts` without documenting their values here.

## Development

### Requirements

- Node.js
- npm

### Install Dependencies

```bash
npm ci
```

### Start the Development Server

```bash
npm run dev
```

The local development server is provided by Vite.

## Data Source

Paperlytic's ingestion source is the Crossref API. `CrossrefService.js` requests journal articles for the configured subject list, orders them by Crossref creation time, validates and cleans their metadata, and extracts the date portion of `created.date-time`.

`Code.js` normalizes DOIs and skips duplicates found in the Sheet. New records are sent to Supabase and then inserted into the configured Google Sheet. The frontend reads the Supabase `articles` REST resource through server functions, not through the Apps Script Web App endpoint.

The feed query orders Supabase records by `created_at.desc`, fetches up to 30 rows with an offset, and applies title/journal search filters when a search term is present. Frontend filtering removes missing-title, all-uppercase, and non-English titles.

## Live Application

[paperlytic.netlify.app](https://paperlytic.netlify.app)

## Project Status

Paperlytic is an actively developed academic research indexing project.

## License

No license is specified in the repository.
