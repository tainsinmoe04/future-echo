-- Cross-device journal document: one bounded saved snapshot per signed-in owner.
-- Writes stay server-only through /api/journal (service role); the authenticated
-- role can read only its own row, matching the existing fe_* isolation pattern.
create table public.fe_journal (
  user_id uuid primary key references public.fe_profiles(user_id) on delete cascade,
  revision integer not null default 1 check (revision > 0),
  saved_at timestamptz not null default now(),
  document jsonb not null
);

alter table public.fe_journal enable row level security;
create policy fe_journal_read on public.fe_journal for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.fe_journal from anon,authenticated;
grant select on public.fe_journal to authenticated;
grant all on public.fe_journal to service_role;
