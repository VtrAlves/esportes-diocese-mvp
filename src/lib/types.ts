export type Phase = "group" | "qf" | "sf" | "third" | "final";
export type MatchStatus = "scheduled" | "live" | "paused" | "finished";
export type GroupCode = "A" | "B" | "C" | "D";

export interface Team {
  id: string;
  name: string;
  group_code: GroupCode;
}

export type TiebreakCriterion = "saldo" | "pro" | "h2h" | "sorteio";

export interface GroupTiebreak {
  group_code: GroupCode;
  manual_order: string[];
  criterion: TiebreakCriterion;
  results_key: string;
  updated_at?: string;
}

export interface Match {
  id: string;
  phase: Phase;
  group_code: GroupCode | null;
  slot: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_source: string | null;
  away_source: string | null;
  teams_locked: boolean;
  order_index: number;
  target_points: number;
  duration_seconds: number;
  status: MatchStatus;
  home_score: number;
  away_score: number;
  elapsed_seconds: number;
  timer_started_at: string | null;
  golden_point: boolean;
  walkover: boolean;
  winner_id: string | null;
  finished_at: string | null;
  updated_at: string;
}
