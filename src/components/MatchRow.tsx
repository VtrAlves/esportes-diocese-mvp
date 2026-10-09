"use client";
import { matchLabel, sourceLabel } from "@/lib/rules";
import type { Match } from "@/lib/types";
import { cx, StatusBadge } from "./ui";

interface Props {
  match: Match;
  teamName: (id: string | null, fallback?: string) => string;
  highlightTeam?: string | null;
  position?: number;
  right?: React.ReactNode;
  onClick?: () => void;
}

export function MatchRow({ match: m, teamName, highlightTeam, position, right, onClick }: Props) {
  const done = m.status === "finished";
  const side = (id: string | null, source: string | null, score: number) => {
    const won = done && m.winner_id && m.winner_id === id;
    const mine = highlightTeam && id === highlightTeam;
    return (
      <div className="flex items-center justify-between gap-3">
        <span className={cx("truncate text-[15px]", won ? "font-bold" : "font-medium", done && !won && "text-muted", mine && "text-accent")}>
          {teamName(id, sourceLabel(source))}
        </span>
        {m.status !== "scheduled" && <span className={cx("tabular text-[17px]", won ? "font-bold" : "font-semibold text-muted")}>{score}</span>}
      </div>
    );
  };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={cx("flex w-full items-center gap-3 px-4 py-3 text-left", onClick && "press")}>
      {position !== undefined && (
        <span className="tabular w-6 shrink-0 text-center text-[13px] font-semibold text-muted">{position}</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[12px] font-medium text-muted">{matchLabel(m)}</span>
          <span className="text-[11px] text-muted">· {m.target_points} pts · {Math.round(m.duration_seconds / 60)} min</span>
          <span className="ml-auto"><StatusBadge status={m.status} golden={m.golden_point} walkover={m.walkover} /></span>
        </div>
        {side(m.home_team_id, m.home_source, m.home_score)}
        {side(m.away_team_id, m.away_source, m.away_score)}
      </div>
      {right}
    </Tag>
  );
}
