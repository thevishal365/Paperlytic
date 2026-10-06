-- Per-user bookmarks for the Paperlytic frontend (Google sign-in).
--
-- MANUAL STEP: apply this migration to the production Supabase project
-- (the same project that hosts the `articles` table) via the Supabase
-- dashboard SQL editor or `supabase db push`. It is additive only:
-- it creates `public.bookmarks` if missing and never touches the
-- existing ingestion tables (`articles`, `ingestion_runs`, ...).
--
-- Required columns: user_id, doi, title, journal, published_date,
-- created_at, with a UNIQUE (user_id, doi) constraint and RLS so
-- users can only read/write their own rows.

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  doi text not null,
  title text not null,
  journal text,
  published_date text,
  created_at timestamptz not null default now(),
  unique (user_id, doi)
);

create index if not exists bookmarks_user_created_idx
  on public.bookmarks (user_id, created_at desc);

grant select, insert, update, delete on public.bookmarks to authenticated;
grant all on public.bookmarks to service_role;

alter table public.bookmarks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bookmarks'
      and policyname = 'Users can read their own bookmarks'
  ) then
    create policy "Users can read their own bookmarks"
      on public.bookmarks for select to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bookmarks'
      and policyname = 'Users can create their own bookmarks'
  ) then
    create policy "Users can create their own bookmarks"
      on public.bookmarks for insert to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bookmarks'
      and policyname = 'Users can update their own bookmarks'
  ) then
    create policy "Users can update their own bookmarks"
      on public.bookmarks for update to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bookmarks'
      and policyname = 'Users can delete their own bookmarks'
  ) then
    create policy "Users can delete their own bookmarks"
      on public.bookmarks for delete to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;
