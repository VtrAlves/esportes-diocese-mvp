"use client";
import { GROUPS } from "@/lib/rules";
import { computeStandings, isGroupComplete } from "@/lib/standings";
import type { GroupCode, Match, Team } from "@/lib/types";
import { cx, GlassCard } from "./ui";

export function GroupTable({ group, teams, matches, highlightTeam }: { group: GroupCode; teams: Team[]; matches: Match[]; highlightTeam?: string | null }) {
  const rows = computeStandings(teams, matches, group);
  const complete = isGroupComplete(matches, group);
  return (
    <GlassCard className="overflow-hidden">
      <div className="flex items-center justify-between px-4 pb-1 pt-4">
        <h3 className="text-[20px] font-bold tracking-tight">Grupo {group}</h3>
        {complete && <span className="text-[12px] font-semibold text-success">Encerrado</span>}
      </div>
      <table className="tabular w-full text-[14px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted">
            <th className="w-8 py-2 pl-4 text-left font-semibold">#</th>
            <th className="py-2 text-left font-semibold">Equipe</th>
            <th className="w-7 text-center font-semibold">J</th>
            <th className="w-7 text-center font-semibold">V</th>
            <th className="w-7 text-center font-semibold">D</th>
            <th className="w-9 text-center font-semibold">SP</th>
            <th className="w-12 pr-4 text-right font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team.id} className={cx("border-t border-[var(--separator)]", r.team.id === highlightTeam && "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]")}>
              <td className="py-2.5 pl-4">
                <span className={cx("inline-flex size-6 items-center justify-center rounded-full text-[12px] font-bold", i < 2 ? "bg-accent text-white" : "text-muted")}>{i + 1}</span>
              </td>
              <td className="truncate py-2.5 pr-2 font-medium">{r.team.name}</td>
              <td className="text-center text-muted">{r.played}</td>
              <td className="text-center font-semibold">{r.wins}</td>
              <td className="text-center text-muted">{r.losses}</td>
              <td className={cx("text-center", r.diff > 0 ? "text-success" : r.diff < 0 ? "text-danger" : "text-muted")}>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
              <td className="pr-4 text-right font-bold">{r.pointsFor}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 pb-3 pt-1 text-[11px] text-muted">1º e 2º avançam às quartas · SP = saldo de pontos</p>
    </GlassCard>
  );
}

export function StandingsGrid({ teams, matches, highlightTeam }: { teams: Team[]; matches: Match[]; highlightTeam?: string | null }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {GROUPS.map((g) => (
        <GroupTable key={g} group={g} teams={teams} matches={matches} highlightTeam={highlightTeam} />
      ))}
    </div>
  );
}

export function StandingsSummary({ teams, matches }: { teams: Team[]; matches: Match[] }) {
  return (
    <GlassCard className="overflow-hidden">
      <h3 className="px-4 pb-1 pt-4 text-[17px] font-bold">Resumo da classificação</h3>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted">
            <th className="py-2 pl-4 text-left font-semibold">Grupo</th>
            <th className="text-left font-semibold">1º</th>
            <th className="text-left font-semibold">2º</th>
            <th className="pr-4 text-left font-semibold">3º</th>
          </tr>
        </thead>
        <tbody>
          {GROUPS.map((g) => {
            const rows = computeStandings(teams, matches, g);
            const done = isGroupComplete(matches, g);
            return (
              <tr key={g} className="border-t border-[var(--separator)]">
                <td className="py-2.5 pl-4 font-bold">{g}</td>
                {[0, 1, 2].map((i) => (
                  <td key={i} className={cx("truncate pr-2", !done && "text-muted", i === 2 && "pr-4")}>
                    {rows[i] ? rows[i].team.name : "—"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-4 pb-3 pt-1 text-[11px] text-muted">Posições em cinza são parciais até o grupo encerrar.</p>
    </GlassCard>
  );
}
