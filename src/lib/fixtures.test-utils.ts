import type { GroupCode, Match, Phase, Team } from "./types";

export function team(id: string, group: GroupCode): Team {
  return { id, name: id, group_code: group };
}

let seq = 0;
export function match(p: Partial<Match> & { slot: string; phase?: Phase }): Match {
  return {
    id: p.id ?? `m${++seq}`,
    phase: "group",
    group_code: null,
    home_team_id: null,
    away_team_id: null,
    home_source: null,
    away_source: null,
    teams_locked: false,
    order_index: 0,
    target_points: 10,
    duration_seconds: 480,
    status: "scheduled",
    home_score: 0,
    away_score: 0,
    elapsed_seconds: 0,
    timer_started_at: null,
    golden_point: false,
    winner_id: null,
    finished_at: null,
    updated_at: "",
    ...p,
  };
}

export function result(slot: string, group: GroupCode, home: string, away: string, hs: number, as: number): Match {
  return match({
    slot,
    group_code: group,
    home_team_id: home,
    away_team_id: away,
    home_score: hs,
    away_score: as,
    status: "finished",
    winner_id: hs > as ? home : away,
  });
}
