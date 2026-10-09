"use client";
import { useEffect, useRef, useState } from "react";
import { matchLabel, sourceLabel } from "@/lib/rules";
import type { Match } from "@/lib/types";
import { TimerText } from "./Timer";
import { cx, GlassCard, StatusBadge } from "./ui";

function Score({ value, color }: { value: number; color: string }) {
  const prev = useRef(value);
  const [pop, setPop] = useState(0);
  useEffect(() => {
    if (prev.current !== value) setPop((p) => p + 1);
    prev.current = value;
  }, [value]);
  return (
    <span key={pop} className={cx("tabular block text-[clamp(72px,24vw,168px)] font-bold leading-none tracking-tight", pop > 0 && "score-pop")} style={{ color }}>
      {value}
    </span>
  );
}

/** Placar grande somente leitura (tela dos jogadores). */
export function LiveScoreboard({
  match: m,
  teamName,
  teamRecord,
}: {
  match: Match;
  teamName: (id: string | null, f?: string) => string;
  teamRecord?: (id: string | null) => string | null;
}) {
  const record = (id: string | null) => {
    const r = teamRecord?.(id);
    return r ? <p className="tabular text-[13px] font-medium text-muted sm:text-[15px]">({r})</p> : null;
  };
  return (
    <GlassCard strong className="enter p-5 sm:p-8">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-muted">{matchLabel(m)}</span>
        <StatusBadge status={m.status} golden={m.golden_point} walkover={m.walkover} draw={m.status === "finished" && !m.winner_id} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
        <div className="min-w-0">
          <Score value={m.home_score} color="var(--home)" />
          <p className="mt-2 line-clamp-2 text-[15px] font-semibold sm:text-[19px]">{teamName(m.home_team_id, sourceLabel(m.home_source))}
          </p>
          {record(m.home_team_id)}
        </div>
        <span className="text-[28px] font-light text-muted">×</span>
        <div className="min-w-0">
          <Score value={m.away_score} color="var(--away)" />
          <p className="mt-2 line-clamp-2 text-[15px] font-semibold sm:text-[19px]">{teamName(m.away_team_id, sourceLabel(m.away_source))}
          </p>
          {record(m.away_team_id)}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-center gap-6 text-center">
        <div>
          <TimerText match={m} className="text-[40px] font-semibold sm:text-[52px]" />
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Tempo</p>
        </div>
        <div className="h-10 w-px bg-[var(--separator)]" />
        <div>
          <span className="tabular text-[40px] font-semibold sm:text-[52px]">{m.target_points}</span>
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Pontos</p>
        </div>
      </div>
    </GlassCard>
  );
}
