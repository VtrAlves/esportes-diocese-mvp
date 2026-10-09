-- Placar Vôlei — dados iniciais (rode após 0001_init.sql)
-- ATENÇÃO: apaga jogos e times existentes.
delete from public.matches;
delete from public.teams;

insert into public.teams (name, group_code) values
  ('Black Mamba', 'A'),
  ('Panteros Cor de Rosa', 'A'),
  ('Marrom Bombom', 'A'),
  ('Imperialismo', 'B'),
  ('Cansados', 'B'),
  ('Palestra Italia', 'B'),
  ('Real Madrid', 'C'),
  ('???? (CRF)', 'C'),
  ('Levanta que Eu Erro', 'C'),
  ('Red Stars (RS)', 'D'),
  ('Sem Rumo', 'D');

with t as (select id, name from public.teams),
games(slot, group_code, home, away, ord, pts, secs) as (values
  ('A1','A','Black Mamba','Panteros Cor de Rosa', 1, 10, 480),
  ('B1','B','Imperialismo','Cansados',            2, 10, 480),
  ('C1','C','Real Madrid','???? (CRF)',           3, 10, 480),
  ('D1','D','Red Stars (RS)','Sem Rumo',          4, 10, 600),
  ('A2','A','Black Mamba','Marrom Bombom',        5, 10, 480),
  ('B2','B','Imperialismo','Palestra Italia',     6, 10, 480),
  ('C2','C','Real Madrid','Levanta que Eu Erro',  7, 10, 480),
  ('A3','A','Panteros Cor de Rosa','Marrom Bombom', 8, 10, 480),
  ('B3','B','Cansados','Palestra Italia',         9, 10, 480),
  ('C3','C','???? (CRF)','Levanta que Eu Erro',  10, 10, 480)
)
insert into public.matches (phase, group_code, slot, home_team_id, away_team_id, order_index, target_points, duration_seconds)
select 'group', g.group_code, g.slot, h.id, a.id, g.ord, g.pts, g.secs
from games g join t h on h.name = g.home join t a on a.name = g.away;

insert into public.matches (phase, slot, home_source, away_source, order_index, target_points, duration_seconds) values
  ('qf',    'QF1',   '1A',     '2B',     11, 12,  600),
  ('qf',    'QF2',   '1C',     '2D',     12, 12,  600),
  ('qf',    'QF3',   '1B',     '2A',     13, 12,  600),
  ('qf',    'QF4',   '1D',     '2C',     14, 12,  600),
  ('sf',    'SF1',   'W:QF1',  'W:QF2',  15, 12,  600),
  ('sf',    'SF2',   'W:QF3',  'W:QF4',  16, 12,  600),
  ('third', 'THIRD', 'L:SF1',  'L:SF2',  17, 15,  900),
  ('final', 'FINAL', 'W:SF1',  'W:SF2',  18, 21, 1200);
