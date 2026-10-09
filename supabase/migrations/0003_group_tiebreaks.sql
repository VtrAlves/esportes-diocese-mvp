-- Desempate definido pelo juiz por grupo (critério escolhido ou sorteio).
create table if not exists public.group_tiebreaks (
  group_code text primary key check (group_code in ('A','B','C','D')),
  manual_order uuid[] not null,
  criterion text not null check (criterion in ('saldo','pro','h2h','sorteio')),
  -- "Assinatura" dos resultados do grupo: se algum resultado mudar, a escolha deixa de valer.
  results_key text not null,
  updated_at timestamptz not null default now()
);

alter table public.group_tiebreaks enable row level security;
drop policy if exists "group_tiebreaks_public_read" on public.group_tiebreaks;
create policy "group_tiebreaks_public_read" on public.group_tiebreaks for select using (true);

do $$
begin
  alter publication supabase_realtime add table public.group_tiebreaks;
exception when duplicate_object then null;
end $$;
