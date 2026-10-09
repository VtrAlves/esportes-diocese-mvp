"use client";
import { formatClock, remainingMs } from "@/lib/timer";
import type { Match } from "@/lib/types";
import { useServerNow } from "@/hooks/useServerNow";
import { cx } from "./ui";

export function useRemaining(match: Match | null) {
  const now = useServerNow(match?.status === "live");
  if (!match) return 0;
  return remainingMs(match, now);
}

export function TimerText({ match, className }: { match: Match; className?: string }) {
  const ms = useRemaining(match);
  const low = ms <= 60_000 && match.status !== "finished";
  return <span className={cx("tabular", low && "text-danger", className)}>{formatClock(ms)}</span>;
}
