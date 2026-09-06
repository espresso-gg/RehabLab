create table if not exists public.daily_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  log jsonb not null,
  saved_at timestamptz,
  primary key (user_id, date)
);

alter table public.daily_logs enable row level security;

create policy "Users can read their own daily logs"
  on public.daily_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own daily logs"
  on public.daily_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own daily logs"
  on public.daily_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
