import type { GroupCode, GroupTiebreak, Match, Team, TiebreakCriterion } from "./types";

export interface StandingRow {
  team: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
}

/** Resultado de uma partida encerrada: vencedor (inclusive escolhido pelo juiz) ou empate. */
export function outcomeOf(m: Match): "home" | "away" | "draw" {
  if (m.winner_id) return m.winner_id === m.home_team_id ? "home" : "away";
  if (m.home_score === m.away_score) return "draw";
  return m.home_score > m.away_score ? "home" : "away";
}

export function groupMatches(matches: Match[], group: GroupCode): Match[] {
  return matches.filter((m) => m.phase === "group" && m.group_code === group);
}

export function isGroupComplete(matches: Match[], group: GroupCode): boolean {
  const gm = groupMatches(matches, group);
  return gm.length > 0 && gm.every((m) => m.status === "finished");
}

/** "Assinatura" dos resultados do grupo — muda se qualquer resultado mudar. */
export function groupResultsKey(matches: Match[], group: GroupCode): string {
  return groupMatches(matches, group)
    .sort((a, b) => a.slot.localeCompare(b.slot))
    .map((m) => `${m.slot}:${m.status === "finished" ? `${m.home_team_id}:${m.home_score}-${m.away_team_id}:${m.away_score}` : "-"}`)
    .join("|");
}

/** Desempate do juiz que ainda vale (grupo encerrado e resultados iguais aos da decisão). */
export function activeTiebreak(matches: Match[], group: GroupCode, tiebreaks: GroupTiebreak[] = []): GroupTiebreak | null {
  const tb = tiebreaks.find((t) => t.group_code === group);
  if (!tb || !isGroupComplete(matches, group)) return null;
  return tb.results_key === groupResultsKey(matches, group) ? tb : null;
}

/**
 * Classificação: vitórias > empates > saldo > pontos feitos > confronto direto > nome.
 * Se o juiz definiu um desempate válido para o grupo, a ordem dele prevalece.
 */
export function computeStandings(teams: Team[], matches: Match[], group: GroupCode, tiebreaks: GroupTiebreak[] = []): StandingRow[] {
  const rows = computeStandingsAuto(teams, matches, group);
  const tb = activeTiebreak(matches, group, tiebreaks);
  if (!tb) return rows;
  const rank = (id: string) => {
    const i = tb.manual_order.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...rows].sort((a, b) => rank(a.team.id) - rank(b.team.id));
}

function computeStandingsAuto(teams: Team[], matches: Match[], group: GroupCode): StandingRow[] {
  const finished = groupMatches(matches, group).filter((m) => m.status === "finished");
  const rows = new Map<string, StandingRow>();
  for (const team of teams.filter((t) => t.group_code === group)) {
    rows.set(team.id, { team, played: 0, wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, diff: 0 });
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
    const result = outcomeOf(m);
    if (result === "draw") {
      home.draws++;
      away.draws++;
    } else if (result === "home") {
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
      b.draws - a.draws ||
      b.diff - a.diff ||
      b.pointsFor - a.pointsFor ||
      headToHead(a.team.id, b.team.id) ||
      a.team.name.localeCompare(b.team.name),
  );
}

export interface OverallRow extends StandingRow {
  winRate: number;
}

/**
 * Classificação geral: todas as partidas encerradas (grupos e mata-mata).
 * Ordem: vitórias > saldo > pontos feitos > menos pontos sofridos > nome.
 */
export function computeOverall(teams: Team[], matches: Match[]): OverallRow[] {
  const rows = new Map<string, OverallRow>();
  for (const team of teams) {
    rows.set(team.id, { team, played: 0, wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, diff: 0, winRate: 0 });
  }
  for (const m of matches) {
    if (m.status !== "finished") continue;
    const home = m.home_team_id ? rows.get(m.home_team_id) : undefined;
    const away = m.away_team_id ? rows.get(m.away_team_id) : undefined;
    if (!home || !away) continue;
    const result = outcomeOf(m);
    for (const [r, pf, pa, side] of [
      [home, m.home_score, m.away_score, "home"],
      [away, m.away_score, m.home_score, "away"],
    ] as const) {
      r.played++;
      r.pointsFor += pf;
      r.pointsAgainst += pa;
      if (result === "draw") r.draws++;
      else if (result === side) r.wins++;
      else r.losses++;
    }
  }
  for (const r of rows.values()) {
    r.diff = r.pointsFor - r.pointsAgainst;
    r.winRate = r.played ? (r.wins + r.draws / 2) / r.played : 0;
  }
  return [...rows.values()].sort(
    (a, b) =>
      b.wins - a.wins ||
      b.draws - a.draws ||
      b.diff - a.diff ||
      b.pointsFor - a.pointsFor ||
      a.pointsAgainst - b.pointsAgainst ||
      a.team.name.localeCompare(b.team.name),
  );
}

/** Blocos de times empatados em vitórias e empates (na ordem automática). */
export function tiedBlocks(rows: StandingRow[]): StandingRow[][] {
  const blocks: StandingRow[][] = [];
  for (const r of rows) {
    const last = blocks.at(-1);
    if (last && last[0].wins === r.wins && last[0].draws === r.draws) last.push(r);
    else blocks.push([r]);
  }
  return blocks.filter((b) => b.length > 1);
}

export const CRITERION_LABEL: Record<TiebreakCriterion, string> = {
  saldo: "Saldo de pontos",
  pro: "Pontos feitos",
  h2h: "Confronto direto",
  sorteio: "Definido pelo juiz",
};

export interface CriterionOption {
  criterion: Exclude<TiebreakCriterion, "sorteio">;
  /** Bloco reordenado pelo critério. */
  order: StandingRow[];
  /** Valor exibido de cada time, na mesma ordem. */
  values: string[];
  /** O critério separa todos os times do bloco? */
  resolves: boolean;
  /** Separa alguns times, mas outros continuam empatados. */
  partial: boolean;
}

/** Como cada critério ordenaria um bloco empatado. */
export function criterionOptions(block: StandingRow[], matches: Match[]): CriterionOption[] {
  const ids = new Set(block.map((r) => r.team.id));
  // Vitórias nos jogos entre os próprios empatados.
  const h2hWins = new Map(block.map((r) => [r.team.id, 0]));
  for (const m of matches) {
    if (m.status !== "finished" || m.phase !== "group" || !m.winner_id) continue;
    if (m.home_team_id && m.away_team_id && ids.has(m.home_team_id) && ids.has(m.away_team_id)) {
      h2hWins.set(m.winner_id, (h2hWins.get(m.winner_id) ?? 0) + 1);
    }
  }
  const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
  const make = (criterion: CriterionOption["criterion"], value: (r: StandingRow) => number, show: (n: number) => string): CriterionOption => {
    const order = [...block].sort((a, b) => value(b) - value(a));
    const nums = order.map(value);
    const distinct = new Set(nums).size;
    return { criterion, order, values: nums.map(show), resolves: distinct === nums.length, partial: distinct > 1 && distinct < nums.length };
  };
  return [
    make("saldo", (r) => r.diff, signed),
    make("pro", (r) => r.pointsFor, String),
    make("h2h", (r) => h2hWins.get(r.team.id) ?? 0, (n) => `${n} ${n === 1 ? "vitória" : "vitórias"}`),
  ];
}

/** Ordem completa do grupo trocando um bloco empatado pela nova ordem. */
export function applyBlockOrder(rows: StandingRow[], block: StandingRow[], newBlockOrder: string[]): string[] {
  const blockIds = new Set(block.map((r) => r.team.id));
  const queue = [...newBlockOrder];
  return rows.map((r) => (blockIds.has(r.team.id) ? queue.shift()! : r.team.id));
}
