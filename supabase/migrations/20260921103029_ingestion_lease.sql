-- Single-flight lease for the ingest-crossref Edge Function.
--
-- CREATED ONLY. Do NOT apply to the live database in Step 2.
-- Deployment and scheduling happen in later steps; the Google Apps
-- Script writer remains active until cutover.
--
-- Design: one row per lock name. Acquisition is a single atomic
-- conditional PATCH over PostgREST (see lease.ts): exactly one
-- invocation can move the row from free to held, with no session to pin
-- (which rules out session-bound advisory locks from the Edge runtime).
-- A crashed holder never releases, but expiry bounds the stuck window to
-- the lease TTL; the next invocation atomically steals an expired lease.
-- The table is service-role only: RLS is enabled with no public policies.

create table public.ingestion_lease (
  lock_name text primary key,
  holder text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.ingestion_lease enable row level security;

insert into public.ingestion_lease (lock_name, holder, expires_at)
values ('ingest-crossref', null, null);
