# Paperlytic

> A minimal, hourly-updated index of newly published academic research.

Paperlytic collects newly published research papers from Crossref and presents them in a clean, searchable feed.

## Features

* Hourly research paper updates
* Crossref API integration
* Duplicate DOI filtering
* Search by title or journal
* Direct DOI links
* Research feed with infinite scrolling
* Clean and simple interface
* About and Contact pages

## How It Works

```text
Crossref API
     ↓
Paper ingestion
     ↓
Data processing
     ↓
Duplicate filtering
     ↓
Database
     ↓
Paperlytic frontend
```

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* TanStack Router
* shadcn/ui

### Backend

* Google Apps Script
* Crossref API
* Supabase

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
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── routes/
│
├── .lovable/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## Backend

The backend handles research paper collection and data processing.

### Main Services

* `CrossrefService.js`
  Fetches research paper data from Crossref.

* `SheetRepository.js`
  Handles spreadsheet-related data operations.

* `SupabaseService.js`
  Handles database operations through Supabase.

* `Config.js`
  Reads application settings from Google Apps Script Script Properties.

* `WebApp.js`
  Provides the web/API interface.

* `Utils.js`
  Contains shared utility functions.

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

## Development

### Requirements

* Node.js
* npm

### Install Dependencies

```bash
npm install
```

### Start the Development Server

```bash
npm run dev
```

The local development server will be provided by Vite.

## Data Source

Paperlytic uses the Crossref API as its main source for newly registered academic publications.

## Live Application

[paperlytic.lovable.app](https://paperlytic.lovable.app)

## Project Status

Paperlytic is an actively developed academic research indexing project.

## License

License information will be added later.
