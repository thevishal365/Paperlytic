# Paperlytic

> A minimal, hourly-updated index of newly published academic research.

## Features

- Server-rendered initial research feed
- Search by title or journal
- Show More loading for additional papers
- Offset-based infinite fetching through TanStack Query
- Direct DOI links
- Subject/category filter chips
- Redesigned responsive article cards with per-card bookmark actions
- Four-section navigation: Feed, About, Bookmarks, Profile
- Mobile bottom navigation
- Google OAuth sign-in through Supabase Auth with persistent sessions
- Private per-user bookmarks isolated by PostgreSQL Row Level Security
- `/bookmarks` and `/profile` pages
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

The frontend reads Supabase through TanStack Start server functions. Eleven staggered pg_cron jobs invoke the ingest-crossref Edge Function every hour with explicit two-subject batches; the function fetches Crossref records, validates them, and upserts them into Supabase, using the articles primary key on DOI for deduplication. Authenticated bookmark reads and writes go directly to the Supabase `bookmarks` table from the browser client, scoped to the signed-in user by Row Level Security.

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
- Space Mono and Rubik fonts
- Supabase Auth for Google OAuth sign-in and session persistence

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
│   ├── apple-touch-icon.png
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── SiteHeader.tsx
│   │   ├── MobileNav.tsx
│   │   ├── BookmarkButton.tsx
│   │   └── ui/
│   ├── hooks/
│   │   └── use-auth.tsx
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── types.ts
│   ├── lib/
│   │   ├── articles.functions.ts
│   │   ├── articles.server.ts
│   │   ├── articles.ts
│   │   ├── error-capture.ts
│   │   ├── error-page.ts
│   │   └── utils.ts
│   └── routes/
│       ├── __root.tsx
│       ├── index.tsx
│       ├── about.tsx
│       ├── bookmarks.tsx
│       ├── profile.tsx
│       ├── guides/
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

The backend handles Crossref ingestion and stores clean records in the database. Ingestion is Supabase-native: eleven staggered pg_cron jobs invoke the ingest-crossref Edge Function every hour (minutes 00, 03, 06, 09, 12, 15, 18, 21, 24, 27, 30 UTC), each with an explicit pair of subjects. A database-backed lease allows only one invocation to write at a time, and every run is logged to ingestion_runs and ingestion_subject_results. The `backend/` Google Apps Script files are retained in the repository for compatibility and history but are not part of the current frontend data pipeline.

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
  Creates the ingestion_runs, ingestion_subject_results, and ingestion_lease tables used for logging and single-flight protection, plus the per-user `bookmarks` table used by the frontend.

## Authentication

Sign-in uses Supabase Auth with the Google OAuth provider. The browser client (`src/integrations/supabase/client.ts`) persists the session and refreshes tokens automatically, and `src/hooks/use-auth.tsx` exposes the signed-in user, loading state, Google sign-in, and sign-out to the UI.

Auth UX rules:

- Tapping Profile while logged out navigates to `/profile`, which shows the Paperlytic sign-in screen. Google OAuth starts only when the user clicks "Continue with Google".
- Tapping an article bookmark icon while logged out navigates to `/profile` without writing anything to the database.
- `/bookmarks` stays publicly viewable; logged-out visitors see the empty library state.
- Logged-in users save, remove, and list only their own bookmarks.

## Database

Besides the ingestion tables, the frontend uses `public.bookmarks`:

- `user_id`
- `doi`
- `title`
- `journal`
- `published_date`
- `created_at`
- Unique constraint on `(user_id, doi)`
- Row Level Security enabled, with policies so authenticated users can read, insert, update, and delete only rows where `user_id` matches their own auth user id

The table is created by `supabase/migrations/20261006000000_bookmarks.sql`, which is additive and must be applied to the production Supabase project that already hosts the `articles` table.

## Configuration

The backend uses Supabase Edge Function secrets for configuration.

Custom secrets (set via `supabase secrets set`):

```text
CROSSREF_MAILTO
INGEST_CRON_SECRET
```

SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by the Supabase platform and are not set manually. The hourly scheduler reads the same ingest secret from Supabase Vault at fire time, so the secret never appears in cron commands or source code.

Do not store secret values directly in the source code.

The frontend auth/bookmark client optionally reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (names only, never values) and otherwise falls back to the built-in production article API constants in `src/lib/articles.ts`. Google OAuth also requires the Google provider to be enabled and the production redirect URLs to be configured in the Supabase Auth dashboard; no OAuth client secrets belong in this repository.

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

The feed query orders Supabase records by `date.desc.nullslast,created_at.desc`, fetches up to 30 rows with an offset, and applies title/journal search filters when a search term is present. Frontend filtering removes missing-title, all-uppercase, and non-English titles.

## Routes

- `/` — live research feed with search, subject chips, and show-more loading
- `/about` — how the research feed is built
- `/bookmarks` — signed-in users see their saved papers; logged-out visitors see the empty library state
- `/profile` — signed-in users see account details and sign-out; logged-out visitors see the Paperlytic Google sign-in screen
- `/guides/google-scholar-alternatives` — research guide
- `/guides/tracking-new-research` — research guide
- `/sitemap.xml` — generated sitemap for the public pages

## Live Application

[paperlytic.netlify.app](https://paperlytic.netlify.app)

## Project Status

Paperlytic is an actively developed academic research indexing project. The frontend has been redesigned around a mobile-first feed with article cards, subject chips, and four-section navigation, while the production Supabase article pipeline is preserved unchanged: hourly pg_cron batches drive the ingest-crossref Edge Function, and search, recency sorting, infinite loading, and DOI links work as before. Google OAuth is enabled through Supabase Auth with private per-user bookmarks protected by Row Level Security, and Netlify remains the deployment target.

## License

No license is specified in the repository.
