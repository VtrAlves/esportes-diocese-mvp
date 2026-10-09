import type { GroupCode, Match, Phase } from "./types";

export const GROUPS: GroupCode[] = ["A", "B", "C", "D"];

export function defaultRules(phase: Phase, group?: GroupCode | null) {
  switch (phase) {
    case "group":
      return { target_points: 10, duration_seconds: group === "D" ? 600 : 480 };
    case "qf":
    case "sf":
      return { target_points: 12, duration_seconds: 600 };
    case "third":
      return { target_points: 15, duration_seconds: 900 };
    case "final":
      return { target_points: 21, duration_seconds: 1200 };
  }
}

export const PHASE_LABEL: Record<Phase, string> = {
  group: "Fase de grupos",
  qf: "Quartas de final",
  sf: "Semifinal",
  third: "Disputa de 3º lugar",
  final: "Final",
};

export function matchLabel(m: Pick<Match, "phase" | "slot" | "group_code">): string {
  switch (m.phase) {
    case "group":
      return `Grupo ${m.group_code} · Jogo ${m.slot.slice(1)}`;
    case "qf":
      return `Quartas · Jogo ${m.slot.slice(2)}`;
    case "sf":
      return `Semifinal ${m.slot.slice(2)}`;
    case "third":
      return "3º e 4º lugar";
    case "final":
      return "Final";
  }
}

/** Descreve a origem de uma vaga do mata-mata: "1A" → "1º Grupo A". */
export function sourceLabel(source: string | null): string {
  if (!source) return "A definir";
  const pos = source.match(/^([12])([A-D])$/);
  if (pos) return `${pos[1]}º Grupo ${pos[2]}`;
  const wl = source.match(/^([WL]):(QF|SF)(\d)$/);
  if (wl) {
    const who = wl[1] === "W" ? "Venc." : "Perd.";
    const what = wl[2] === "QF" ? `Jogo ${wl[3]}` : `Semi ${wl[3]}`;
    return `${who} ${what}`;
  }
  return source;
}

/** A partida já tem um vencedor definido pelas regras (aguardando confirmação do juiz)? */
export function decidedWinnerSide(m: Match, timeUp: boolean): "home" | "away" | null {
  const { home_score: h, away_score: a } = m;
  if (h === a) return null;
  const leader = h > a ? "home" : "away";
  if (Math.max(h, a) >= m.target_points) return leader;
  if (m.golden_point || timeUp) return leader;
  return null;
}
