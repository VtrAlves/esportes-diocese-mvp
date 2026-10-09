"use client";
import { sourceLabel } from "@/lib/rules";
import type { Match } from "@/lib/types";
import { cx, GlassCard, StatusBadge } from "./ui";

interface Props {
  matches: Match[];
  teamName: (id: string | null, f?: string) => string;
  highlightTeam?: string | null;
  onSelect?: (m: Match) => void;
}

function BracketMatch({ m, title, teamName, highlightTeam, onSelect, featured }: { m?: Match; title: string; featured?: boolean } & Omit<Props, "matches">) {
  if (!m) return null;
  const done = m.status === "finished";
  const line = (id: string | null, src: string | null, score: number) => {
    const won = done && m.winner_id === id;
    return (
      <div className={cx("flex items-center justify-between gap-2 rounded-xl px-3 py-2", won && "bg-[color-mix(in_srgb,var(--success)_14%,transparent)]")}>
        <span className={cx("truncate text-[14px]", id ? "font-semibold" : "text-muted", id && id === highlightTeam && "text-accent", done && m.winner_id && !won && "text-muted")}>
          {teamName(id, sourceLabel(src))}
        </span>
        {m.status !== "scheduled" && <span className="tabular text-[15px] font-bold">{score}</span>}
      </div>
    );
  };
  const Tag = onSelect ? "button" : "div";
  return (
    <Tag onClick={onSelect ? () => onSelect(m) : undefined} className={cx("block w-full text-left", onSelect && "press")}>
      <GlassCard className={cx("p-2", featured && "ring-2 ring-[color-mix(in_srgb,var(--gold)_60%,transparent)]")}>
        <div className="flex items-center justify-between px-2 pb-1 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{title}</span>
          <StatusBadge status={m.status} golden={m.golden_point} walkover={m.walkover} draw={m.status === "finished" && !m.winner_id} />
        </div>
        {line(m.home_team_id, m.home_source, m.home_score)}
        {line(m.away_team_id, m.away_source, m.away_score)}
      </GlassCard>
    </Tag>
  );
}

/** Chaveamento: colunas no tablet, empilhado no celular. */
export function Bracket({ matches, ...rest }: Props) {
  const by = (slot: string) => matches.find((m) => m.slot === slot);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.1fr_1fr_1fr] lg:items-center">
      <div className="space-y-3 order-1 lg:order-none">
        <p className="px-2 text-[12px] font-semibold uppercase tracking-wider text-muted">Quartas</p>
        <BracketMatch m={by("QF1")} title="Jogo 1" {...rest} />
        <BracketMatch m={by("QF2")} title="Jogo 2" {...rest} />
      </div>
      <div className="space-y-3 order-3 lg:order-none">
        <p className="px-2 text-[12px] font-semibold uppercase tracking-wider text-muted">Semifinal</p>
        <BracketMatch m={by("SF1")} title="Semifinal 1" {...rest} />
      </div>
      <div className="space-y-3 order-5 lg:order-none">
        <p className="px-2 text-[12px] font-semibold uppercase tracking-wider text-gold">Final</p>
        <BracketMatch m={by("FINAL")} title="🥇 Final" featured {...rest} />
        <BracketMatch m={by("THIRD")} title="🥉 3º e 4º lugar" {...rest} />
      </div>
      <div className="space-y-3 order-4 lg:order-none">
        <p className="px-2 text-[12px] font-semibold uppercase tracking-wider text-muted">Semifinal</p>
        <BracketMatch m={by("SF2")} title="Semifinal 2" {...rest} />
      </div>
      <div className="space-y-3 order-2 lg:order-none">
        <p className="px-2 text-[12px] font-semibold uppercase tracking-wider text-muted">Quartas</p>
        <BracketMatch m={by("QF3")} title="Jogo 3" {...rest} />
        <BracketMatch m={by("QF4")} title="Jogo 4" {...rest} />
      </div>
    </div>
  );
}
