-- Spill: run once in Supabase → SQL Editor → New query → Run.
-- Stories are static files on Vercel. Supabase stores only reader data:
--   votes/<user id>      votes, poll and quiz answers (public, like Reddit scores)
--   takes/<user id>      comments and tips (public)
--   data/users/<user id> private reading progress, synced across devices
-- Readers get an anonymous account automatically, so no sign-up is needed.
-- Also enable: Authentication → Sign In / Providers → "Allow anonymous sign-ins".

create table if not exists public.docs (
  collection text not null,
  id         text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
create index if not exists docs_collection_idx on public.docs (collection);

alter table public.docs enable row level security;

drop policy if exists "read votes and takes" on public.docs;
create policy "read votes and takes" on public.docs
  for select using (collection in ('votes', 'takes'));

drop policy if exists "read own progress" on public.docs;
create policy "read own progress" on public.docs
  for select to authenticated using (collection = 'data/users/' || auth.uid()::text);

drop policy if exists "write own vote or take" on public.docs;
create policy "write own vote or take" on public.docs
  for insert to authenticated
  with check (collection in ('votes', 'takes') and id = auth.uid()::text);

drop policy if exists "update own vote or take" on public.docs;
create policy "update own vote or take" on public.docs
  for update to authenticated
  using (collection in ('votes', 'takes') and id = auth.uid()::text)
  with check (collection in ('votes', 'takes') and id = auth.uid()::text);

drop policy if exists "write own progress" on public.docs;
create policy "write own progress" on public.docs
  for insert to authenticated
  with check (collection = 'data/users/' || auth.uid()::text);

drop policy if exists "update own progress" on public.docs;
create policy "update own progress" on public.docs
  for update to authenticated
  using (collection = 'data/users/' || auth.uid()::text)
  with check (collection = 'data/users/' || auth.uid()::text);

-- Keep each document small so nobody can stuff the database.
alter table public.docs drop constraint if exists docs_size_limit;
alter table public.docs add constraint docs_size_limit check (pg_column_size(data) < 200000);

-- Live comments and votes.
do $$
begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null;
end $$;
