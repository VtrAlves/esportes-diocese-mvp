-- Placar Vôlei — schema
create extension if not exists pgcrypto;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_code text not null check (group_code in ('A','B','C','D')),
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  phase text not null check (phase in ('group','qf','sf','third','final')),
  group_code text check (group_code in ('A','B','C','D')),
  slot text not null unique,
  home_team_id uuid references public.teams(id) on delete set null,
  away_team_id uuid references public.teams(id) on delete set null,
  home_source text,
  away_source text,
  teams_locked boolean not null default false,
  order_index integer not null default 0,
  target_points integer not null check (target_points > 0),
  duration_seconds integer not null check (duration_seconds > 0),
  status text not null default 'scheduled' check (status in ('scheduled','live','paused','finished')),
  home_score integer not null default 0 check (home_score >= 0),
  away_score integer not null default 0 check (away_score >= 0),
  elapsed_seconds integer not null default 0,
  timer_started_at timestamptz,
  golden_point boolean not null default false,
  walkover boolean not null default false,
  winner_id uuid references public.teams(id) on delete set null,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists matches_order_idx on public.matches(order_index);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  team_id uuid references public.teams(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists matches_touch on public.matches;
create trigger matches_touch before update on public.matches
for each row execute function public.touch_updated_at();

-- RLS: leitura pública; escrita apenas via service role (API do juiz)
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "teams_public_read" on public.teams;
create policy "teams_public_read" on public.teams for select using (true);

drop policy if exists "matches_public_read" on public.matches;
create policy "matches_public_read" on public.matches for select using (true);

-- Realtime
do $$
begin
  begin
    alter publication supabase_realtime add table public.matches;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.teams;
  exception when duplicate_object then null;
  end;
end $$;
