"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTournament } from "@/hooks/useTournament";
import { currentMatch, sortByOrder, teamQueueInfo, upcomingMatches } from "@/lib/queue";
import { readLocal, writeLocal } from "@/lib/storage";
import { Bracket } from "./Bracket";
import { LiveScoreboard } from "./LiveScoreboard";
import { MatchRow } from "./MatchRow";
import { MyTeam, QueueInfoCard } from "./MyTeam";
import { TablesView } from "./StandingsTable";
import { GlassCard, Icons, SectionTitle, TabBar, Toast, type TabItem } from "./ui";
import { useTeamName } from "./useTeamName";

type Tab = "live" | "games" | "table" | "bracket" | "team";

const TABS: TabItem<Tab>[] = [
  { id: "live", label: "Ao vivo", icon: Icons.live },
  { id: "games", label: "Jogos", icon: Icons.list },
  { id: "table", label: "Tabela", icon: Icons.table },
  { id: "bracket", label: "Chave", icon: Icons.bracket },
  { id: "team", label: "Meu time", icon: Icons.team },
];

export function PlayerApp() {
  const { teams, matches, tiebreaks, loading, error, connected } = useTournament();
  const teamName = useTeamName(teams);
  const [tab, setTab] = useState<Tab>("live");
  const [myTeam, setMyTeamState] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    setMyTeamState(readLocal("meuTime"));
    const savedTab = readLocal("aba") as Tab | null;
    if (savedTab && TABS.some((t) => t.id === savedTab)) setTab(savedTab);
    // Desinstala o service worker de notificações de versões anteriores.
    navigator.serviceWorker?.getRegistrations().then((regs) => regs.forEach((r) => r.update().catch(() => undefined)));
  }, []);

  const setMyTeam = (id: string | null) => {
    setMyTeamState(id);
    writeLocal("meuTime", id);
  };
  const changeTab = (t: Tab) => {
    setTab(t);
    writeLocal("aba", t);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Aviso dentro do app quando o time chega perto de jogar.
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    if (!myTeam || loading) return;
    const info = teamQueueInfo(matches, myTeam);
    const key =
      info.kind === "waiting" && info.gamesBefore <= 1 ? `${info.gamesBefore}:${info.match.id}` : info.kind === "playing" ? `play:${info.match.id}` : "idle";
    const prev = lastKey.current;
    lastKey.current = key;
    if (prev === null || prev === key || info.kind !== "waiting") return;
    const message = info.gamesBefore === 0 ? "🏐 Vocês são os próximos! Preparem-se." : "⏳ Falta 1 jogo para o seu time.";
    setToast(message);
    navigator.vibrate?.([200, 100, 200]);
  }, [matches, myTeam, loading]);

  const current = currentMatch(matches);
  const upcoming = upcomingMatches(matches);
  const finished = sortByOrder(matches)
    .filter((m) => m.status === "finished")
    .sort((a, b) => (b.finished_at ?? "").localeCompare(a.finished_at ?? ""));

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-4 pb-32">
      <header className="safe-top flex items-center gap-3 pb-4 pt-4">
        <span className="size-9 text-accent">{Icons.ball}</span>
        <div className="flex-1">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">{TABS.find((t) => t.id === tab)?.label}</h1>
          <p className="text-[13px] text-muted">Esportes da Diocese</p>
        </div>
        <span
          title={connected ? "Conectado em tempo real" : "Reconectando…"}
          className={`size-2.5 rounded-full ${connected ? "bg-success" : "bg-gold"}`}
        />
      </header>

      {error && <GlassCard className="mb-4 p-4 text-[14px] text-danger">Erro ao carregar: {error}</GlassCard>}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass h-28 animate-pulse rounded-[28px]" />
          ))}
        </div>
      ) : (
        <main key={tab} className="enter">
          {tab === "live" && (
            <div className="space-y-4">
              {current ? (
                <LiveScoreboard match={current} teamName={teamName} />
              ) : (
                <GlassCard className="p-8 text-center">
                  <p className="text-[17px] font-semibold">Nenhuma partida em andamento</p>
                  <p className="text-[14px] text-muted">{upcoming.length ? "Aguardando o juiz iniciar o próximo jogo." : "Campeonato encerrado. Obrigado a todos! 🏆"}</p>
                </GlassCard>
              )}
              <QueueInfoCard matches={matches} myTeam={myTeam} teamName={teamName} />
              {upcoming.length > 0 && (
                <>
                  <SectionTitle>A seguir</SectionTitle>
                  <GlassCard className="divide-y divide-[var(--separator)] overflow-hidden">
                    {upcoming.slice(0, 3).map((m, i) => (
                      <MatchRow key={m.id} match={m} teamName={teamName} highlightTeam={myTeam} position={i + 1} />
                    ))}
                  </GlassCard>
                </>
              )}
              {!myTeam && (
                <button onClick={() => changeTab("team")} className="press glass specular w-full rounded-[22px] p-4 text-left text-[15px]">
                  <b>Escolha seu time</b> <span className="text-muted">para acompanhar os jogos e saber quantos faltam →</span>
                </button>
              )}
            </div>
          )}

          {tab === "games" && (
            <div>
              {current && (
                <>
                  <SectionTitle>Em quadra</SectionTitle>
                  <GlassCard strong className="overflow-hidden">
                    <MatchRow match={current} teamName={teamName} highlightTeam={myTeam} />
                  </GlassCard>
                </>
              )}
              <SectionTitle>Próximos ({upcoming.length})</SectionTitle>
              <GlassCard className="divide-y divide-[var(--separator)] overflow-hidden">
                {upcoming.length === 0 && <p className="p-4 text-[14px] text-muted">Nenhum jogo pendente.</p>}
                {upcoming.map((m, i) => (
                  <MatchRow key={m.id} match={m} teamName={teamName} highlightTeam={myTeam} position={i + 1} />
                ))}
              </GlassCard>
              {finished.length > 0 && (
                <>
                  <SectionTitle>Resultados</SectionTitle>
                  <GlassCard className="divide-y divide-[var(--separator)] overflow-hidden">
                    {finished.map((m) => (
                      <MatchRow key={m.id} match={m} teamName={teamName} highlightTeam={myTeam} />
                    ))}
                  </GlassCard>
                </>
              )}
            </div>
          )}

          {tab === "table" && <TablesView teams={teams} matches={matches} tiebreaks={tiebreaks} highlightTeam={myTeam} />}

          {tab === "bracket" && <Bracket matches={matches} teamName={teamName} highlightTeam={myTeam} />}

          {tab === "team" && <MyTeam teams={teams} matches={matches} tiebreaks={tiebreaks} myTeam={myTeam} setMyTeam={setMyTeam} teamName={teamName} />}
        </main>
      )}

      <Toast message={toast} onClose={closeToast} />
      <TabBar tabs={TABS} value={tab} onChange={changeTab} />
    </div>
  );
}
