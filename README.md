# Paperlytic
<br>

```text
Paperlytic: System Architecture

[ 1 ] The Data Source
  │
  ├── 🌍 Croosref API
  │      ↳ Role: A global database of the latest research papers.
  │      ↳ Action: Provides data in raw JSON format.
  │
  ▼  (Data Pulled via HTTP GET)

[ 2 ] The Backend Logic
  │
  ├── ⚙️ Google Apps Script (Serverless Worker)
  │      ↳ ⏱️ Trigger: Every 1 Hour (Automated)
  │      ↳ Logic 1: Fetches new papers and prevents duplicate DOIs.
  │      ↳ Logic 2: Cleans the data and maps it to the database format.
  │      ↳ Backup: Saves a duplicate copy in a Google Sheet.
  │
  ▼  (Clean Data Pushed via HTTP POST + API Key)

[ 3 ] The Database & Storage
  │
  ├── 🗄️ Supabase (PostgreSQL Database)
  │      ↳ Table: `articles` (date, doi, title, journal)
  │      ↳ Speed: Handles API requests in milliseconds.
  │      ↳ 🧹 Auto-Cleaner: pg_cron (Runs daily at 03:00) 
  │          ↳ Deletes old data once the storage limit is exceeded.
  │
  ▼  (Data Requested via HTTP GET limit=100)

[ 4 ] The Frontend UI
  │
  ├── 💻 Netlify Hosting / Web Browser
  │      ↳ File: index.html (HTML/CSS/Vanilla JS)
  │      ↳ Action: Connects directly to Supabase without a middleman server.
  │      ↳ UI Logic: Powers a live search bar and generates direct DOI links.
  │      ↳ End User: Experiences a fast, real time research feed.
```
