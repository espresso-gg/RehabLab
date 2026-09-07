create table if not exists public.daily_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  log_data jsonb not null check (jsonb_typeof(log_data) = 'object'),
  client_updated_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);

alter table public.daily_logs enable row level security;

revoke all on table public.daily_logs from anon, authenticated;
grant select, insert, update, delete on table public.daily_logs to authenticated;

drop policy if exists "Users can read their own recovery logs" on public.daily_logs;
create policy "Users can read their own recovery logs"
on public.daily_logs for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can create their own recovery logs" on public.daily_logs;
create policy "Users can create their own recovery logs"
on public.daily_logs for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update their own recovery logs" on public.daily_logs;
create policy "Users can update their own recovery logs"
on public.daily_logs for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can delete their own recovery logs" on public.daily_logs;
create policy "Users can delete their own recovery logs"
on public.daily_logs for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function public.set_rehablab_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_rehablab_daily_logs_updated_at on public.daily_logs;
create trigger set_rehablab_daily_logs_updated_at
before update on public.daily_logs
for each row execute function public.set_rehablab_updated_at();
