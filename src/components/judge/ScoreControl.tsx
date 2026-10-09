"use client";
import { useEffect, useRef, useState } from "react";
import { applyAction, type MatchAction } from "@/lib/actions";
import { judgeApi } from "@/lib/judgeApi";
import { decidedWinnerSide, matchLabel, sourceLabel } from "@/lib/rules";
import { formatClock, remainingMs } from "@/lib/timer";
import type { Match } from "@/lib/types";
import { useServerNow } from "@/hooks/useServerNow";
import { Button, cx, GlassCard, Icons, Sheet, StatusBadge } from "../ui";
import { beep, vibrate } from "./feedback";

interface Props {
  match: Match;
  teamName: (id: string | null, f?: string) => string;
  mutateMatch: <T extends { match: Match }>(id: string, local: (m: Match) => Partial<Match>, request: () => Promise<T>) => Promise<T>;
  onError: (msg: string) => void;
  onInfo: (msg: string) => void;
  onEdit: (m: Match) => void;
}

type Side = "home" | "away";

export function ScoreControl({ match: m, teamName, mutateMatch, onError, onInfo, onEdit }: Props) {
  const now = useServerNow(m.status === "live", 200);
  const remaining = remainingMs(m, now);
  const timeUp = remaining <= 0;
  const history = useRef<Side[]>([]);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    history.current = [];
    setDismissed(null);
  }, [m.id]);

  const run = async (action: MatchAction) => {
    if (action.type !== "point") {
      // Valida antes (ex.: encerrar com empate) para mostrar o erro sem tocar no estado.
      try {
        applyAction(m, action, now);
      } catch (e) {
        onError((e as Error).message);
        return;
      }
    }
    try {
      await mutateMatch(
        m.id,
        // Calculado sobre o estado mais recente: toques rápidos não se perdem.
        (latest) => {
          try {
            return applyAction(latest, action, now);
          } catch {
            return {};
          }
        },
        () => judgeApi.action(m.id, action),
      );
      if (action.type === "finish") onInfo("Partida encerrada.");
    } catch (e) {
      onError((e as Error).message);
    }
  };

  const point = (side: Side, delta: 1 | -1) => {
    if (m.status === "finished") return;
    if (delta === 1) history.current.push(side);
    vibrate(delta === 1 ? 15 : [10, 40, 10]);
    run({ type: "point", side, delta });
  };

  const undo = () => {
    const side = history.current.pop();
    if (side) point(side, -1);
  };

  // Fim do tempo: avisa o servidor uma única vez.
  const timeupSent = useRef<string | null>(null);
  useEffect(() => {
    const key = `${m.id}:${m.timer_started_at}`;
    if (m.status === "live" && timeUp && timeupSent.current !== key) {
      timeupSent.current = key;
      beep(3);
      vibrate([400, 150, 400, 150, 600]);
      run({ type: "timeup" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.status, timeUp, m.id, m.timer_started_at]);

  const winnerSide = m.status !== "finished" ? decidedWinnerSide(m, timeUp && m.elapsed_seconds >= m.duration_seconds) : null;
  const decidedKey = `${m.id}:${m.home_score}-${m.away_score}`;
  const prevWinner = useRef<Side | null>(null);
  useEffect(() => {
    if (winnerSide && !prevWinner.current) {
      beep(2, 880);
      vibrate([300, 100, 300]);
    }
    prevWinner.current = winnerSide;
  }, [winnerSide]);

  const confirmFinish = async () => {
    setFinishing(true);
    await run({ type: "finish" });
    setFinishing(false);
  };

  const finished = m.status === "finished";
  const canPlay = !!m.home_team_id && !!m.away_team_id;

  const panel = (side: Side) => {
    const id = side === "home" ? m.home_team_id : m.away_team_id;
    const src = side === "home" ? m.home_source : m.away_source;
    const score = side === "home" ? m.home_score : m.away_score;
    const color = side === "home" ? "var(--home)" : "var(--away)";
    const won = finished ? m.winner_id === id : winnerSide === side;
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <button
          onClick={() => point(side, 1)}
          disabled={finished || !canPlay}
          aria-label={`Ponto para ${teamName(id)}`}
          className={cx(
            "press specular relative flex min-h-[38dvh] flex-1 flex-col items-center justify-center overflow-hidden rounded-[32px] border border-[var(--glass-border)] p-3 disabled:opacity-60 sm:min-h-[44dvh]",
            won && "ring-4 ring-[var(--gold)]",
          )}
          style={{
            background: `linear-gradient(160deg, color-mix(in srgb, ${color} 55%, transparent), color-mix(in srgb, ${color} 22%, transparent))`,
            boxShadow: `0 12px 40px color-mix(in srgb, ${color} 35%, transparent), inset 0 1px 0 rgba(255,255,255,.5)`,
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
          }}
        >
          <span className="line-clamp-2 px-2 text-center text-[17px] font-semibold text-white drop-shadow sm:text-[22px]">
            {teamName(id, sourceLabel(src))}
          </span>
          <span key={score} className="score-pop tabular text-[clamp(96px,30vw,220px)] font-bold leading-none text-white drop-shadow-lg">
            {score}
          </span>
          {!finished && canPlay && <span className="text-[13px] font-semibold uppercase tracking-widest text-white/80">Toque +1</span>}
        </button>
        <Button onClick={() => point(side, -1)} disabled={finished || score === 0} className="w-full text-[17px]">
          −1
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <GlassCard strong className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
        <div className="min-w-0 flex-1 pl-2">
          <p className="text-[13px] font-semibold text-muted">{matchLabel(m)} · até {m.target_points} pts</p>
          <div className="flex items-center gap-2">
            <span className={cx("tabular text-[44px] font-bold leading-tight sm:text-[56px]", remaining <= 60_000 && !finished && "text-danger")}>
              {formatClock(remaining)}
            </span>
            <StatusBadge status={m.status} golden={m.golden_point} walkover={m.walkover} />
          </div>
        </div>
        {!finished && (
          <div className="flex gap-2">
            {m.status === "live" ? (
              <Button onClick={() => run({ type: "pause" })} className="min-h-14 px-6 text-[17px]">
                <span className="size-5">{Icons.pause}</span> Pausar
              </Button>
            ) : (
              <Button
                variant="success"
                onClick={() => run({ type: "start" })}
                disabled={!canPlay || timeUp}
                className="min-h-14 px-6 text-[17px]"
              >
                <span className="size-5">{Icons.play}</span> {m.status === "scheduled" ? "Iniciar" : "Retomar"}
              </Button>
            )}
          </div>
        )}
      </GlassCard>

      {m.golden_point && !finished && (
        <div className="enter rounded-[22px] bg-gold p-3 text-center text-[17px] font-bold text-black">
          ⏱️ Tempo esgotado e empate — PONTO DE OURO: o próximo ponto decide!
        </div>
      )}
      {!canPlay && (
        <GlassCard className="p-4 text-center text-[14px] text-muted">
          Os times desta partida ainda não foram definidos. Use <b>Editar</b> para escolhê-los.
        </GlassCard>
      )}

      <div className="flex gap-3">
        {panel("home")}
        {panel("away")}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button onClick={undo} disabled={finished || history.current.length === 0}>
          <span className="size-5">{Icons.undo}</span> Desfazer
        </Button>
        <Button onClick={() => onEdit(m)}>
          <span className="size-5">{Icons.edit}</span> Editar
        </Button>
        {finished ? (
          <Button onClick={() => run({ type: "reopen" })} className="col-span-2">
            Reabrir partida
          </Button>
        ) : (
          <Button
            variant="primary"
            className="col-span-2"
            disabled={m.home_score === m.away_score || finishing}
            onClick={confirmFinish}
          >
            Encerrar partida
          </Button>
        )}
      </div>

      <Sheet open={!!winnerSide && dismissed !== decidedKey} onClose={() => setDismissed(decidedKey)} title="Fim de jogo!">
        <div className="space-y-4 text-center">
          <p className="text-[15px] text-muted">
            {Math.max(m.home_score, m.away_score) >= m.target_points
              ? `Atingiu ${m.target_points} pontos.`
              : m.golden_point
                ? "Ponto de ouro marcado."
                : "Tempo esgotado."}
          </p>
          <p className="text-[24px] font-bold">
            🏆 {teamName(winnerSide === "home" ? m.home_team_id : m.away_team_id)}
          </p>
          <p className="tabular text-[40px] font-bold">
            <span className="text-home">{m.home_score}</span> <span className="text-muted">×</span> <span className="text-away">{m.away_score}</span>
          </p>
          <Button variant="success" className="w-full min-h-14 text-[17px]" onClick={confirmFinish} disabled={finishing}>
            Confirmar resultado
          </Button>
          <Button className="w-full" onClick={() => setDismissed(decidedKey)}>
            Corrigir placar
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
