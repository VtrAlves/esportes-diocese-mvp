import { computeStandings, isGroupComplete } from "./standings";
import type { GroupCode, GroupTiebreak, Match, Team } from "./types";

export function loserId(m: Match): string | null {
  if (m.status !== "finished" || !m.winner_id) return null;
  return m.winner_id === m.home_team_id ? m.away_team_id : m.home_team_id;
}

/** Resolve uma origem ("1A", "W:QF1", "L:SF2") para o id do time, se já definido. */
export function resolveSource(source: string | null, teams: Team[], matches: Match[], tiebreaks: GroupTiebreak[] = []): string | null {
  if (!source) return null;
  const pos = source.match(/^([12])([A-D])$/);
  if (pos) {
    const group = pos[2] as GroupCode;
    if (!isGroupComplete(matches, group)) return null;
    return computeStandings(teams, matches, group, tiebreaks)[Number(pos[1]) - 1]?.team.id ?? null;
  }
  const wl = source.match(/^([WL]):(.+)$/);
  if (wl) {
    const m = matches.find((x) => x.slot === wl[2]);
    if (!m || m.status !== "finished") return null;
    return wl[1] === "W" ? m.winner_id : loserId(m);
  }
  return null;
}

export type TeamUpdate = { id: string; home_team_id: string | null; away_team_id: string | null };

/**
 * Recalcula os times das partidas do mata-mata que ainda não começaram.
 * Partidas com `teams_locked` (ajuste manual do juiz) são preservadas.
 */
export function computeBracketUpdates(teams: Team[], matches: Match[], tiebreaks: GroupTiebreak[] = []): TeamUpdate[] {
  const updates: TeamUpdate[] = [];
  for (const m of matches) {
    if (m.phase === "group" || m.status !== "scheduled" || m.teams_locked) continue;
    const home = resolveSource(m.home_source, teams, matches, tiebreaks);
    const away = resolveSource(m.away_source, teams, matches, tiebreaks);
    if (home !== m.home_team_id || away !== m.away_team_id) {
      updates.push({ id: m.id, home_team_id: home, away_team_id: away });
    }
  }
  return updates;
}
