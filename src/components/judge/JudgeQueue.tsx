"use client";
import { useState } from "react";
import { judgeApi } from "@/lib/judgeApi";
import { sortByOrder } from "@/lib/queue";
import type { Match } from "@/lib/types";
import { MatchRow } from "../MatchRow";
import { Button, ConfirmSheet, GlassCard, Icons, SectionTitle } from "../ui";
import { RedoWarning } from "./EditMatchSheet";

interface Props {
  matches: Match[];
  teamName: (id: string | null, f?: string) => string;
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  onEdit: (m: Match) => void;
  onError: (msg: string) => void;
  onDone: (msg: string) => void;
  refresh: () => void;
}

export function JudgeQueue({ matches, teamName, setMatches, onEdit, onError, onDone, refresh }: Props) {
  const [redo, setRedo] = useState<Match | null>(null);
  const [busy, setBusy] = useState(false);

  const confirmRedo = async () => {
    if (!redo) return;
    setBusy(true);
    try {
      await judgeApi.action(redo.id, { type: "reset" });
      onDone("Jogo voltou para a fila.");
      setRedo(null);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const ordered = sortByOrder(matches);
  const pending = ordered.filter((m) => m.status !== "finished");
  const finished = ordered.filter((m) => m.status === "finished");

  /** Move uma partida pendente para a posição `to` entre as pendentes. */
  const move = async (id: string, to: number) => {
    const list = pending.slice();
    const from = list.findIndex((m) => m.id === id);
    if (from === -1 || to < 0 || to >= list.length || from === to) return;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    const ids = [...finished, ...list].map((m) => m.id);
    setMatches((all) => all.map((m) => ({ ...m, order_index: ids.indexOf(m.id) + 1 })));
    try {
      await judgeApi.reorder(ids);
    } catch (e) {
      onError((e as Error).message);
      refresh();
    }
  };

  return (
    <div>
      <SectionTitle>Fila de jogos ({pending.length})</SectionTitle>
      <GlassCard className="divide-y divide-[var(--separator)] overflow-hidden">
        {pending.length === 0 && <p className="p-4 text-[14px] text-muted">Todos os jogos foram encerrados.</p>}
        {pending.map((m, i) => (
          <div key={m.id} className="flex items-center">
            <div className="min-w-0 flex-1">
              <MatchRow match={m} teamName={teamName} position={i + 1} onClick={() => onEdit(m)} />
            </div>
            <div className="flex shrink-0 flex-col gap-1 pr-3">
              <button aria-label="Subir" disabled={i === 0} onClick={() => move(m.id, i - 1)} className="press glass size-10 rounded-full p-2 disabled:opacity-30">
                {Icons.up}
              </button>
              <button aria-label="Descer" disabled={i === pending.length - 1} onClick={() => move(m.id, i + 1)} className="press glass size-10 rounded-full p-2 disabled:opacity-30">
                {Icons.down}
              </button>
            </div>
          </div>
        ))}
      </GlassCard>
      <p className="mt-2 px-2 text-[12px] text-muted">Toque em um jogo para editar pontos, tempo e times, ou para jogá-lo agora. Use ↑ ↓ para mudar a ordem.</p>

      {finished.length > 0 && (
        <>
          <SectionTitle>Encerrados ({finished.length})</SectionTitle>
          <GlassCard className="divide-y divide-[var(--separator)] overflow-hidden">
            {finished.map((m) => (
              <div key={m.id} className="flex items-center">
                <div className="min-w-0 flex-1">
                  <MatchRow match={m} teamName={teamName} onClick={() => onEdit(m)} />
                </div>
                <Button className="mr-3 min-h-10 shrink-0 px-3 text-[13px]" onClick={() => setRedo(m)}>
                  <span className="size-4">{Icons.undo}</span> Refazer
                </Button>
              </div>
            ))}
          </GlassCard>
        </>
      )}
      <ConfirmSheet open={!!redo} title="Refazer jogo" confirmLabel="Refazer jogo" danger busy={busy} onClose={() => setRedo(null)} onConfirm={confirmRedo}>
        {redo && (
          <>
            <p className="mb-2 font-semibold">
              {teamName(redo.home_team_id)} {redo.home_score} × {redo.away_score} {teamName(redo.away_team_id)}
            </p>
            <RedoWarning match={redo} matches={matches} />
          </>
        )}
      </ConfirmSheet>
    </div>
  );
}
