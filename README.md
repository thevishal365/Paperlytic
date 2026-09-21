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
Supabase Edge Function ingestion (ingest-crossref)
     ↓
Normalization, validation, and duplicate filtering
     ↓
Supabase articles table
     ↓
TanStack Start server function
     ↓
Paperlytic frontend
```

The frontend reads Supabase through TanStack Start server functions. Eleven staggered pg_cron jobs invoke the ingest-crossref Edge Function every hour with explicit two-subject batches; the function fetches Crossref records, validates them, and upserts them into Supabase, using the articles primary key on DOI for deduplication.

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

- Supabase Edge Functions
- Crossref REST API
- Supabase REST API
- Supabase Postgres
- pg_cron
- pg_net
- Supabase Vault
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
├── supabase/
│   ├── functions/
│   │   └── ingest-crossref/
│   │       ├── index.ts
│   │       ├── config.ts
│   │       ├── crossref.ts
│   │       ├── normalize.ts
│   │       ├── lease.ts
│   │       └── subjects.ts
│   ├── migrations/
│   └── scheduler/
│       └── ingest-crossref-cron.sql
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

The backend handles Crossref ingestion and stores clean records in the database. Ingestion is Supabase-native: eleven staggered pg_cron jobs invoke the ingest-crossref Edge Function every hour (minutes 00, 03, 06, 09, 12, 15, 18, 21, 24, 27, 30 UTC), each with an explicit pair of subjects. A database-backed lease allows only one invocation to write at a time, and every run is logged to ingestion_runs and ingestion_subject_results. The Google Apps Script + Google Sheet ingestion system is retired and is no longer part of production.

### Main Services

- `index.ts`
  Entry point for the Edge Function. Authenticates scheduler requests, acquires the ingestion lease, processes one subject batch sequentially with per-subject error isolation, upserts articles, and records run metrics.

- `crossref.ts`
  Fetches recent journal articles from Crossref, retries requests, and validates response structure.

- `normalize.ts`
  Normalizes DOIs, cleans title markup and entities, checks language and page rules, and extracts the created date.

- `lease.ts`
  Provides atomic single-flight lease acquisition and release over the ingestion_lease table.

- `subjects.ts`
  Resolves the subject batch for one invocation from the request body.

- `config.ts`
  Holds ingestion constants and reads Edge Function configuration.

- `ingest-crossref-cron.sql`
  Defines the eleven staggered hourly pg_cron jobs that call the Edge Function through pg_net with the Vault-stored secret.

- `migrations/`
  Creates the ingestion_runs, ingestion_subject_results, and ingestion_lease tables used for logging and single-flight protection.

## Configuration

The backend uses Supabase Edge Function secrets for configuration.

Custom secrets (set via `supabase secrets set`):

```text
CROSSREF_MAILTO
INGEST_CRON_SECRET
```

SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by the Supabase platform and are not set manually. The hourly scheduler reads the same ingest secret from Supabase Vault at fire time, so the secret never appears in cron commands or source code.

Do not store secret values directly in the source code.

The current frontend has no `.env` or `import.meta.env` configuration; its Supabase read constants are defined in `src/lib/articles.ts` without documenting their values here.

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

Paperlytic's ingestion source is the Crossref API. The Edge Function requests journal articles for each scheduled subject pair, orders them by Crossref creation time, validates and cleans their metadata, and extracts the date portion of `created.date-time`.

Each invocation normalizes DOIs and skips duplicates against the articles primary key on DOI, so existing rows are never updated and reruns converge safely. Runs and per-subject results are recorded in ingestion_runs and ingestion_subject_results. The frontend reads the Supabase `articles` REST resource through server functions.

The feed query orders Supabase records by `created_at.desc`, fetches up to 30 rows with an offset, and applies title/journal search filters when a search term is present. Frontend filtering removes missing-title, all-uppercase, and non-English titles.

## Live Application

[paperlytic.netlify.app](https://paperlytic.netlify.app)

## Project Status

Paperlytic is an actively developed academic research indexing project. The Supabase-native ingestion migration is complete: hourly pg_cron batches drive the ingest-crossref Edge Function, and the Google Apps Script + Google Sheet ingestion system is retired. The migration was validated through source-parity checks, manual and concurrency tests, scheduler-path validation, shadow cycles, and GAS-off validation.

## License

No license is specified in the repository.
