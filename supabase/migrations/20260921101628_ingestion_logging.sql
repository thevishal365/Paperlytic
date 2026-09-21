-- Ingestion run logging for the ingest-crossref Edge Function.
--
-- CREATED ONLY. Do NOT apply to the live database in Step 1.
-- Scheduling, deployment, and cutover happen in later steps; the Google
-- Apps Script writer remains active until then.
--
-- Tables are service-role only: RLS is enabled with no public policies.

create table public.ingestion_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null
    check (status in ('running', 'completed', 'failed', 'skipped')),
  trigger text not null default 'manual',
  subjects_succeeded integer not null default 0,
  subjects_failed integer not null default 0,
  fetched_count integer not null default 0,
  accepted_count integer not null default 0,
  duplicate_count integer not null default 0,
  rejected_count integer not null default 0,
  inserted_count integer not null default 0,
  error text
);

create table public.ingestion_subject_results (
  id bigint generated always as identity primary key,
  run_id bigint not null references public.ingestion_runs (id) on delete cascade,
  subject text not null,
  status text not null
    check (status in ('ok', 'failed')),
  fetched integer not null default 0,
  accepted integer not null default 0,
  duplicates integer not null default 0,
  rejected integer not null default 0,
  error text
);

create index ingestion_subject_results_run_id_idx
  on public.ingestion_subject_results (run_id);

alter table public.ingestion_runs enable row level security;
alter table public.ingestion_subject_results enable row level security;
