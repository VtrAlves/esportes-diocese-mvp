"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTournament } from "@/hooks/useTournament";
import { judgeApi } from "@/lib/judgeApi";
import { currentMatch, upcomingMatches } from "@/lib/queue";
import type { Match } from "@/lib/types";
import { Bracket } from "../Bracket";
import { TablesView } from "../StandingsTable";
import { Button, GlassCard, Icons, TabBar, Toast, type TabItem } from "../ui";
import { useTeamName } from "../useTeamName";
import { EditMatchSheet } from "./EditMatchSheet";
import { JudgeQueue } from "./JudgeQueue";
import { ScoreControl } from "./ScoreControl";
import { TeamsEditor } from "./TeamsEditor";
import { useWakeLock } from "./useWakeLock";

type Tab = "score" | "queue" | "bracket" | "teams";

const TABS: TabItem<Tab>[] = [
  { id: "score", label: "Placar", icon: Icons.whistle },
  { id: "queue", label: "Jogos", icon: Icons.list },
  { id: "bracket", label: "Tabela", icon: Icons.bracket },
  { id: "teams", label: "Times", icon: Icons.team },
];

export function JudgeApp() {
  const { teams, matches, loading, error, connected, refresh, mutateMatch, setMatches } = useTournament();
  const teamName = useTeamName(teams);
  const [tab, setTab] = useState<Tab>("score");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const closeToast = useCallback(() => setToast(null), []);
  const showError = useCallback((m: string) => setToast(`⚠️ ${m}`), []);
  const showInfo = useCallback((m: string) => setToast(`✅ ${m}`), []);

  useWakeLock(tab === "score");

  // Partida no placar: a escolhida pelo juiz, senão a em andamento, senão a próxima da fila.
  const scoreMatch = useMemo(() => {
    const chosen = matches.find((m) => m.id === selectedId);
    return chosen ?? currentMatch(matches) ?? upcomingMatches(matches)[0] ?? null;
  }, [matches, selectedId]);
  // Fixa a partida exibida para que ela continue na tela após o encerramento.
  useEffect(() => {
    if (!selectedId && scoreMatch) setSelectedId(scoreMatch.id);
  }, [selectedId, scoreMatch]);
  const editing = matches.find((m) => m.id === editingId) ?? null;

  const openScoreboard = (m: Match) => {
    setSelectedId(m.id);
    setTab("score");
  };

  const goNext = () => {
    const next = upcomingMatches(matches)[0];
    setSelectedId(next?.id ?? null);
  };

  const logout = async () => {
    await judgeApi.logout().catch(() => undefined);
    window.location.href = "/juiz/login";
  };

  const next = upcomingMatches(matches).find((m) => m.id !== scoreMatch?.id);

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-3 pb-32 sm:px-4">
      <header className="safe-top flex items-center gap-2 pb-3 pt-3">
        <span className="size-8 text-accent">{Icons.whistle}</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-bold leading-tight tracking-tight">Juiz</h1>
          <p className="flex items-center gap-1.5 text-[12px] text-muted">
            <span className={`size-2 rounded-full ${connected ? "bg-success" : "bg-gold"}`} />
            {connected ? "Tempo real conectado" : "Reconectando…"}
          </p>
        </div>
        <button onClick={logout} aria-label="Sair" className="press glass size-11 rounded-full p-2.5 text-muted">
          {Icons.logout}
        </button>
      </header>

      {error && <GlassCard className="mb-3 p-4 text-[14px] text-danger">Erro ao carregar: {error}</GlassCard>}

      {loading ? (
        <div className="glass h-[60dvh] animate-pulse rounded-[32px]" />
      ) : (
        <main key={tab} className="enter">
          {tab === "score" &&
            (scoreMatch ? (
              <div className="space-y-3">
                <ScoreControl
                  match={scoreMatch}
                  teamName={teamName}
                  mutateMatch={mutateMatch}
                  onError={showError}
                  onInfo={showInfo}
                  onEdit={(m) => setEditingId(m.id)}
                />
                {scoreMatch.status === "finished" && next && (
                  <Button variant="primary" className="min-h-14 w-full text-[17px]" onClick={goNext}>
                    Próximo jogo: {teamName(next.home_team_id)} × {teamName(next.away_team_id)}
                  </Button>
                )}
                {scoreMatch.status !== "finished" && next && (
                  <p className="px-2 text-center text-[13px] text-muted">
                    A seguir: <b>{teamName(next.home_team_id)}</b> × <b>{teamName(next.away_team_id)}</b>
                  </p>
                )}
              </div>
            ) : (
              <GlassCard className="p-8 text-center">
                <p className="text-[17px] font-semibold">Nenhuma partida pendente 🏆</p>
              </GlassCard>
            ))}

          {tab === "queue" && (
            <JudgeQueue
              matches={matches}
              teamName={teamName}
              setMatches={setMatches}
              onEdit={(m) => setEditingId(m.id)}
              onError={showError}
              onDone={showInfo}
              refresh={refresh}
            />
          )}

          {tab === "bracket" && (
            <div className="space-y-6">
              <Bracket matches={matches} teamName={teamName} onSelect={(m) => setEditingId(m.id)} />
              <TablesView teams={teams} matches={matches} />
            </div>
          )}

          {tab === "teams" && <TeamsEditor teams={teams} onError={showError} onDone={showInfo} refresh={refresh} />}
        </main>
      )}

      <EditMatchSheet
        match={editing}
        matches={matches}
        teams={teams}
        onClose={() => setEditingId(null)}
        onOpenScoreboard={openScoreboard}
        onDone={showInfo}
        onError={showError}
        refresh={refresh}
      />
      <Toast message={toast} onClose={closeToast} />
      <TabBar tabs={TABS} value={tab} onChange={setTab} />
    </div>
  );
}
