"use client";
import { useMemo } from "react";
import type { Team } from "@/lib/types";

export function useTeamName(teams: Team[]) {
  return useMemo(() => {
    const map = new Map(teams.map((t) => [t.id, t.name]));
    return (id: string | null, fallback = "A definir") => (id ? map.get(id) ?? fallback : fallback);
  }, [teams]);
}
