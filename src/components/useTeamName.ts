"use client";
import { useMemo } from "react";
import { computeOverall } from "@/lib/standings";
import type { Match, Team } from "@/lib/types";

export function useTeamName(teams: Team[]) {
  return useMemo(() => {
    const map = new Map(teams.map((t) => [t.id, t.name]));
    return (id: string | null, fallback = "A definir") => (id ? map.get(id) ?? fallback : fallback);
  }, [teams]);
}

/** Campanha do time em todos os jogos encerrados: "V1-D2" (ou "V1-E1-D0" com empates). */
export function useTeamRecord(teams: Team[], matches: Match[]) {
  return useMemo(() => {
    const map = new Map(
      computeOverall(teams, matches).map((r) => [r.team.id, r.draws ? `V${r.wins}-E${r.draws}-D${r.losses}` : `V${r.wins}-D${r.losses}`]),
    );
    return (id: string | null) => (id ? map.get(id) ?? null : null);
  }, [teams, matches]);
}
