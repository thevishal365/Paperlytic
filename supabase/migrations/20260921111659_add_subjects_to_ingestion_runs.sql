-- Run batch metadata for the ingest-crossref Edge Function.
--
-- CREATED ONLY. Do NOT apply to the live database yet. The base logging
-- tables (20260921101628) were already applied WITHOUT this column, so it
-- ships as a follow-up migration rather than a rewrite of applied history.
-- Apply together with the pending migrations before deploying the
-- batch-model function, which writes ingestion_runs.subjects on every run.

alter table public.ingestion_runs
  add column subjects text[] not null default '{}';
