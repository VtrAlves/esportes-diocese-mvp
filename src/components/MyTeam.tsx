"use client";
import { GROUPS } from "@/lib/rules";
import { involves, sortByOrder, teamQueueInfo } from "@/lib/queue";
import { computeOverall, computeStandings, isGroupComplete } from "@/lib/standings";
import type { Match, Team } from "@/lib/types";
import { MatchRow } from "./MatchRow";
import { Button, cx, GlassCard, SectionTitle } from "./ui";

interface Props {
  teams: Team[];
  matches: Match[];
  myTeam: string | null;
  setMyTeam: (id: string | null) => void;
  teamName: (id: string | null, f?: string) => string;
}

export function QueueInfoCard({ matches, myTeam, teamName }: Pick<Props, "matches" | "myTeam" | "teamName">) {
  if (!myTeam) return null;
  const info = teamQueueInfo(matches, myTeam);
  let big: string;
  let caption: string;
  let tone = "text-fg";
  if (info.kind === "playing") {
    big = "Em quadra";
    caption = "Bom jogo! 🏐";
    tone = "text-danger";
  } else if (info.kind === "waiting" && info.gamesBefore === 0) {
    big = "Vocês são os próximos!";
    caption = "Preparem-se para entrar em quadra.";
    tone = "text-success";
  } else if (info.kind === "waiting") {
    big = `${info.gamesBefore}`;
    caption = info.gamesBefore === 1 ? "partida antes do seu jogo" : "partidas antes do seu jogo";
  } else {
    big = "Sem jogos";
    caption = "Nenhum jogo pendente definido para o seu time.";
    tone = "text-muted";
  }
  return (
    <GlassCard strong className="enter p-5">
      <p className="text-[13px] font-semibold text-muted">{teamName(myTeam)}</p>
      <p className={cx("mt-1 font-bold leading-tight tracking-tight", tone, big.length < 4 ? "tabular text-[64px]" : "text-[28px]")}>{big}</p>
      <p className="text-[15px] text-muted">{caption}</p>
      {info.kind !== "none" && (
        <div className="-mx-4 mt-3 border-t border-[var(--separator)] pt-1">
          <MatchRow match={info.match} teamName={teamName} highlightTeam={myTeam} />
        </div>
      )}
    </GlassCard>
  );
}

/** Resumo do time: posição no grupo, campanha e saldo. */
function TeamStats({ teams, matches, myTeam }: Pick<Props, "teams" | "matches" | "myTeam">) {
  const team = teams.find((t) => t.id === myTeam);
  if (!team) return null;
  const group = computeStandings(teams, matches, team.group_code);
  const pos = group.findIndex((r) => r.team.id === team.id) + 1;
  const groupDone = isGroupComplete(matches, team.group_code);
  const overall = computeOverall(teams, matches);
  const me = overall.find((r) => r.team.id === team.id);
  const overallPos = overall.findIndex((r) => r.team.id === team.id) + 1;
  if (!me) return null;
  const stats = [
    { label: `Grupo ${team.group_code}`, value: `${pos}º`, hint: groupDone ? (pos <= 2 ? "classificado" : "eliminado") : "parcial" },
    { label: "Geral", value: me.played ? `${overallPos}º` : "—", hint: "de " + overall.length },
    { label: "Campanha", value: `${me.wins}V ${me.losses}D`, hint: `${me.played} ${me.played === 1 ? "jogo" : "jogos"}` },
    { label: "Saldo", value: me.diff > 0 ? `+${me.diff}` : String(me.diff), hint: `${me.pointsFor} pró · ${me.pointsAgainst} contra` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <GlassCard key={s.label} className="p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">{s.label}</p>
          <p
            className={cx(
              "tabular mt-0.5 text-[26px] font-bold leading-tight",
              s.label === "Saldo" && (me.diff > 0 ? "text-success" : me.diff < 0 ? "text-danger" : ""),
            )}
          >
            {s.value}
          </p>
          <p className="text-[12px] text-muted">{s.hint}</p>
        </GlassCard>
      ))}
    </div>
  );
}

export function MyTeam({ teams, matches, myTeam, setMyTeam, teamName }: Props) {
  const mine = myTeam ? sortByOrder(matches).filter((m) => involves(m, myTeam)) : [];
  const played = mine.filter((m) => m.status === "finished");
  const pending = mine.filter((m) => m.status !== "finished");

  return (
    <div className="space-y-4">
      <QueueInfoCard matches={matches} myTeam={myTeam} teamName={teamName} />
      <TeamStats teams={teams} matches={matches} myTeam={myTeam} />

      {pending.length > 0 && (
        <>
          <SectionTitle>Próximos jogos do time</SectionTitle>
          <GlassCard className="divide-y divide-[var(--separator)] overflow-hidden">
            {pending.map((m) => (
              <MatchRow key={m.id} match={m} teamName={teamName} highlightTeam={myTeam} />
            ))}
          </GlassCard>
        </>
      )}
      {played.length > 0 && (
        <>
          <SectionTitle>Resultados do time</SectionTitle>
          <GlassCard className="divide-y divide-[var(--separator)] overflow-hidden">
            {played.map((m) => (
              <MatchRow key={m.id} match={m} teamName={teamName} highlightTeam={myTeam} />
            ))}
          </GlassCard>
        </>
      )}

      <SectionTitle>{myTeam ? "Trocar de time" : "Escolha o seu time"}</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        {GROUPS.map((g) => (
          <GlassCard key={g} className="p-2">
            <p className="px-3 pb-1 pt-2 text-[12px] font-bold uppercase tracking-wider text-muted">Grupo {g}</p>
            {teams
              .filter((t) => t.group_code === g)
              .map((t) => {
                const active = t.id === myTeam;
                return (
                  <button
                    key={t.id}
                    onClick={() => setMyTeam(t.id)}
                    className={cx(
                      "press flex min-h-12 w-full items-center justify-between rounded-2xl px-3 text-left text-[16px] font-medium",
                      active && "bg-accent text-white",
                    )}
                  >
                    {t.name}
                    {active && <span className="text-[13px] font-semibold">Meu time ✓</span>}
                  </button>
                );
              })}
          </GlassCard>
        ))}
      </div>
      {myTeam && (
        <Button variant="ghost" className="w-full" onClick={() => setMyTeam(null)}>
          Não acompanhar nenhum time
        </Button>
      )}
    </div>
  );
}
