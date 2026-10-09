-- W.O. (vitória por ausência do adversário)
alter table public.matches add column if not exists walkover boolean not null default false;
