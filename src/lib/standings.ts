import type { GroupCode, Match, Team } from "./types";

export interface StandingRow {
  team: Team;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
}

export function groupMatches(matches: Match[], group: GroupCode): Match[] {
  return matches.filter((m) => m.phase === "group" && m.group_code === group);
}

export function isGroupComplete(matches: Match[], group: GroupCode): boolean {
  const gm = groupMatches(matches, group);
  return gm.length > 0 && gm.every((m) => m.status === "finished");
}

/** Classificação: vitórias > saldo > pontos feitos > confronto direto > nome. */
export function computeStandings(teams: Team[], matches: Match[], group: GroupCode): StandingRow[] {
  const finished = groupMatches(matches, group).filter((m) => m.status === "finished");
  const rows = new Map<string, StandingRow>();
  for (const team of teams.filter((t) => t.group_code === group)) {
    rows.set(team.id, { team, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, diff: 0 });
  }

  for (const m of finished) {
    const home = m.home_team_id ? rows.get(m.home_team_id) : undefined;
    const away = m.away_team_id ? rows.get(m.away_team_id) : undefined;
    if (!home || !away) continue;
    home.played++;
    away.played++;
    home.pointsFor += m.home_score;
    home.pointsAgainst += m.away_score;
    away.pointsFor += m.away_score;
    away.pointsAgainst += m.home_score;
    const homeWon = m.winner_id ? m.winner_id === home.team.id : m.home_score > m.away_score;
    if (homeWon) {
      home.wins++;
      away.losses++;
    } else {
      away.wins++;
      home.losses++;
    }
  }
  for (const r of rows.values()) r.diff = r.pointsFor - r.pointsAgainst;

  const headToHead = (a: string, b: string): number => {
    const m = finished.find(
      (x) =>
        (x.home_team_id === a && x.away_team_id === b) || (x.home_team_id === b && x.away_team_id === a),
    );
    if (!m?.winner_id) return 0;
    return m.winner_id === a ? -1 : 1;
  };

  return [...rows.values()].sort(
    (a, b) =>
      b.wins - a.wins ||
      b.diff - a.diff ||
      b.pointsFor - a.pointsFor ||
      headToHead(a.team.id, b.team.id) ||
      a.team.name.localeCompare(b.team.name),
  );
}
