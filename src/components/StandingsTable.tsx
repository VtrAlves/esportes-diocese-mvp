"use client";
import { useEffect, useState } from "react";
import { GROUPS } from "@/lib/rules";
import { activeTiebreak, computeOverall, computeStandings, CRITERION_LABEL, isGroupComplete, tiedBlocks } from "@/lib/standings";
import { readLocal, writeLocal } from "@/lib/storage";
import type { GroupCode, GroupTiebreak, Match, Team } from "@/lib/types";
import { cx, GlassCard, Segmented } from "./ui";

interface TableProps {
  teams: Team[];
  matches: Match[];
  tiebreaks?: GroupTiebreak[];
  highlightTeam?: string | null;
}

export function GroupTable({ group, teams, matches, tiebreaks = [], highlightTeam }: TableProps & { group: GroupCode }) {
  const rows = computeStandings(teams, matches, group, tiebreaks);
  const complete = isGroupComplete(matches, group);
  const tb = activeTiebreak(matches, group, tiebreaks);
  const tied = complete && tiedBlocks(computeStandings(teams, matches, group)).length > 0;
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
            <th className="w-7 text-center font-semibold">E</th>
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
              <td className="text-center text-muted">{r.draws}</td>
              <td className="text-center text-muted">{r.losses}</td>
              <td className={cx("text-center", r.diff > 0 ? "text-success" : r.diff < 0 ? "text-danger" : "text-muted")}>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
              <td className="pr-4 text-right font-bold">{r.pointsFor}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {tb ? (
        <p className="mx-4 mb-1 mt-1 rounded-xl bg-[color-mix(in_srgb,var(--gold)_16%,transparent)] px-3 py-2 text-[12px] font-medium">
          {tb.criterion === "sorteio" ? "Ordem definida manualmente pelo juiz" : `Desempate escolhido pelo juiz: ${CRITERION_LABEL[tb.criterion]}`}
        </p>
      ) : (
        tied && <p className="px-4 pt-1 text-[12px] text-muted">Empate na classificação resolvido pelos critérios automáticos.</p>
      )}
      <p className="px-4 pb-3 pt-1 text-[11px] text-muted">1º e 2º avançam às quartas · E = empates · SP = saldo de pontos</p>
    </GlassCard>
  );
}

export function StandingsGrid({ teams, matches, tiebreaks, highlightTeam }: TableProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {GROUPS.map((g) => (
        <GroupTable key={g} group={g} teams={teams} matches={matches} tiebreaks={tiebreaks} highlightTeam={highlightTeam} />
      ))}
    </div>
  );
}

export function StandingsSummary({ teams, matches, tiebreaks }: TableProps) {
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
            const rows = computeStandings(teams, matches, g, tiebreaks);
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

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Placar geral: todas as partidas encerradas (grupos + mata-mata). */
export function OverallTable({ teams, matches, highlightTeam }: { teams: Team[]; matches: Match[]; highlightTeam?: string | null }) {
  const rows = computeOverall(teams, matches);
  const played = matches.filter((m) => m.status === "finished").length;
  return (
    <GlassCard className="overflow-hidden">
      <div className="flex items-baseline justify-between px-4 pb-1 pt-4">
        <h3 className="text-[20px] font-bold tracking-tight">Placar geral</h3>
        <span className="text-[12px] text-muted">{played} {played === 1 ? "jogo encerrado" : "jogos encerrados"}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="tabular w-full min-w-[360px] text-[13.5px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted">
              <th className="w-8 py-2 pl-4 text-left font-semibold">#</th>
              <th className="py-2 text-left font-semibold">Equipe</th>
              <th className="w-7 text-center font-semibold">J</th>
              <th className="w-7 text-center font-semibold">V</th>
              <th className="w-7 text-center font-semibold">E</th>
              <th className="w-7 text-center font-semibold">D</th>
              <th className="w-9 text-center font-semibold">PP</th>
              <th className="w-9 text-center font-semibold">PC</th>
              <th className="w-10 text-center font-semibold">SP</th>
              <th className="hidden w-12 pr-4 text-right font-semibold sm:table-cell">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.team.id}
                className={cx("border-t border-[var(--separator)]", r.team.id === highlightTeam && "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]")}
              >
                <td className="py-2.5 pl-4">
                  <span className={cx("inline-flex size-6 items-center justify-center rounded-full text-[12px] font-bold", i < 3 && r.played ? "bg-accent text-white" : "text-muted")}>
                    {i + 1}
                  </span>
                </td>
                <td className="max-w-0 py-2.5 pr-2">
                  <span className="block truncate font-medium">{r.team.name}</span>
                  <span className="text-[11px] text-muted">Grupo {r.team.group_code}</span>
                </td>
                <td className="text-center text-muted">{r.played}</td>
                <td className="text-center font-semibold">{r.wins}</td>
                <td className="text-center text-muted">{r.draws}</td>
                <td className="text-center text-muted">{r.losses}</td>
                <td className="text-center">{r.pointsFor}</td>
                <td className="text-center text-muted">{r.pointsAgainst}</td>
                <td className={cx("text-center font-semibold", r.diff > 0 ? "text-success" : r.diff < 0 ? "text-danger" : "text-muted")}>{signed(r.diff)}</td>
                <td className="hidden pr-4 text-right text-muted sm:table-cell">{r.played ? `${Math.round(r.winRate * 100)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 pb-3 pt-1 text-[11px] text-muted">
        Todos os jogos encerrados (grupos e mata-mata) · E = empates · PP = pontos pró · PC = pontos contra · SP = saldo de pontos
      </p>
    </GlassCard>
  );
}

type TableView = "groups" | "overall";

/** Aba Tabela: grupos ou placar geral. */
export function TablesView({ teams, matches, tiebreaks, highlightTeam }: TableProps) {
  const [view, setView] = useState<TableView>("groups");
  useEffect(() => {
    if (readLocal("tabela") === "overall") setView("overall");
  }, []);
  const change = (v: TableView) => {
    setView(v);
    writeLocal("tabela", v);
  };
  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-sm">
        <Segmented
          options={[
            { id: "groups", label: "Grupos" },
            { id: "overall", label: "Geral" },
          ]}
          value={view}
          onChange={change}
        />
      </div>
      {view === "groups" ? (
        <>
          <StandingsGrid teams={teams} matches={matches} tiebreaks={tiebreaks} highlightTeam={highlightTeam} />
          <StandingsSummary teams={teams} matches={matches} tiebreaks={tiebreaks} />
        </>
      ) : (
        <OverallTable teams={teams} matches={matches} highlightTeam={highlightTeam} />
      )}
    </div>
  );
}
