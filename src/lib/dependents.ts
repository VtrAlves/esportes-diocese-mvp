import type { Match } from "./types";

/** Partidas do mata-mata já iniciadas/encerradas que dependem do resultado de `m`. */
export function startedDependents(m: Match, matches: Match[]): Match[] {
  const refs = m.phase === "group" ? [`1${m.group_code}`, `2${m.group_code}`] : [`W:${m.slot}`, `L:${m.slot}`];
  return matches.filter(
    (x) =>
      x.status !== "scheduled" &&
      ((x.home_source && refs.includes(x.home_source)) || (x.away_source && refs.includes(x.away_source))),
  );
}
