"use client";
import { useState } from "react";
import { judgeApi } from "@/lib/judgeApi";
import { GROUPS } from "@/lib/rules";
import {
  activeTiebreak,
  applyBlockOrder,
  computeStandings,
  CRITERION_LABEL,
  criterionOptions,
  isGroupComplete,
  tiedBlocks,
  type StandingRow,
} from "@/lib/standings";
import type { GroupCode, GroupTiebreak, Match, Team, TiebreakCriterion } from "@/lib/types";
import { Button, cx, GlassCard, Icons, Sheet } from "../ui";

interface Props {
  teams: Team[];
  matches: Match[];
  tiebreaks: GroupTiebreak[];
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
  refresh: () => void;
}

/** Grupos encerrados com times empatados em vitórias. */
export function groupsWithTies(teams: Team[], matches: Match[], tiebreaks: GroupTiebreak[]) {
  return GROUPS.filter((g) => isGroupComplete(matches, g))
    .map((g) => ({ group: g, blocks: tiedBlocks(computeStandings(teams, matches, g)), decided: activeTiebreak(matches, g, tiebreaks) }))
    .filter((x) => x.blocks.length > 0);
}

const ordinal = (i: number) => `${i + 1}º`;

export function TiebreakPanel({ teams, matches, tiebreaks, onDone, onError, refresh }: Props) {
  const ties = groupsWithTies(teams, matches, tiebreaks);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState<{ group: GroupCode; block: StandingRow[]; order: StandingRow[]; hint?: string } | null>(null);

  if (ties.length === 0) return null;

  const save = async (group: GroupCode, block: StandingRow[], blockOrder: string[], criterion: TiebreakCriterion) => {
    setBusy(true);
    try {
      const rows = computeStandings(teams, matches, group, tiebreaks);
      await judgeApi.setTiebreak(group, applyBlockOrder(rows, block, blockOrder), criterion);
      onDone(`Desempate do Grupo ${group}: ${CRITERION_LABEL[criterion]}.`);
      setManual(null);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const clear = async (group: GroupCode) => {
    setBusy(true);
    try {
      await judgeApi.clearTiebreak(group);
      onDone(`Grupo ${group} voltou aos critérios automáticos.`);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const move = (i: number, d: -1 | 1) =>
    setManual((s) => {
      if (!s) return s;
      const order = s.order.slice();
      [order[i], order[i + d]] = [order[i + d], order[i]];
      return { ...s, order };
    });

  return (
    <div className="space-y-4">
      {ties.map(({ group, blocks, decided }) => {
        const effective = computeStandings(teams, matches, group, tiebreaks);
        return (
          <GlassCard key={group} strong className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[19px] font-bold">Empate no Grupo {group}</h3>
                <p className="text-[13px] text-muted">
                  {decided ? (
                    <>
                      Decidido: <b className="text-fg">{CRITERION_LABEL[decided.criterion]}</b>
                    </>
                  ) : (
                    "Pendente — usando os critérios automáticos até você escolher."
                  )}
                </p>
              </div>
              {decided && (
                <Button className="min-h-9 shrink-0 px-3 text-[13px]" disabled={busy} onClick={() => clear(group)}>
                  Automático
                </Button>
              )}
            </div>

            <p className="text-[13px]">
              Ordem atual:{" "}
              {effective.map((r, i) => (
                <span key={r.team.id} className="mr-2 whitespace-nowrap">
                  <b>{ordinal(i)}</b> {r.team.name}
                </span>
              ))}
            </p>

            {blocks.map((block) => (
              <div key={block.map((r) => r.team.id).join()} className="space-y-2">
                <p className="text-[13px] font-semibold text-muted">
                  {block.map((r) => r.team.name).join(", ")} — {block[0].wins} {block[0].wins === 1 ? "vitória" : "vitórias"}
                  {block[0].draws ? ` e ${block[0].draws} ${block[0].draws === 1 ? "empate" : "empates"}` : ""} cada. Desempatar por:
                </p>
                {criterionOptions(block, matches).map((opt) => {
                  const selected = decided?.criterion === opt.criterion;
                  return (
                    <button
                      key={opt.criterion}
                      disabled={busy || (!opt.resolves && !opt.partial)}
                      onClick={() =>
                        opt.resolves
                          ? save(group, block, opt.order.map((r) => r.team.id), opt.criterion)
                          : setManual({
                              group,
                              block,
                              order: opt.order,
                              hint: `Ordem pelo ${CRITERION_LABEL[opt.criterion].toLowerCase()}. Defina você a posição de quem continuou empatado.`,
                            })
                      }
                      className={cx(
                        "press glass w-full rounded-2xl px-4 py-3 text-left disabled:opacity-50",
                        selected && "ring-2 ring-accent",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[15px] font-semibold">{CRITERION_LABEL[opt.criterion]}</span>
                        {selected ? (
                          <span className="text-[12px] font-semibold text-accent">Escolhido ✓</span>
                        ) : (
                          !opt.resolves && (
                            <span className="text-[12px] text-muted">{opt.partial ? "desempata em parte → você completa" : "não desempata"}</span>
                          )
                        )}
                      </div>
                      <p className="tabular mt-0.5 text-[13px] text-muted">
                        {opt.order.map((r, i) => `${r.team.name} (${opt.values[i]})`).join(" › ")}
                      </p>
                    </button>
                  );
                })}
                <div className={cx("rounded-2xl border border-[var(--separator)] p-3", decided?.criterion === "sorteio" && "ring-2 ring-accent")}>
                  <p className="mb-2 px-1 text-[13px] font-semibold">
                    ✋ Definir manualmente{decided?.criterion === "sorteio" && <span className="ml-2 text-accent">Escolhido ✓</span>}
                  </p>
                  {block.length === 2 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {block.map((r) => {
                        const other = block.find((x) => x.team.id !== r.team.id)!;
                        return (
                          <Button
                            key={r.team.id}
                            className="min-h-12 px-3 text-[14px]"
                            disabled={busy}
                            onClick={() => save(group, block, [r.team.id, other.team.id], "sorteio")}
                          >
                            <span className="truncate">{r.team.name} à frente</span>
                          </Button>
                        );
                      })}
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      disabled={busy}
                      onClick={() => setManual({ group, block, order: effective.filter((r) => block.some((b) => b.team.id === r.team.id)) })}
                    >
                      Definir a ordem dos empatados
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </GlassCard>
        );
      })}

      <Sheet open={!!manual} onClose={() => setManual(null)} title={manual ? `Ordem do Grupo ${manual.group}` : ""}>
        {manual && (
          <div className="space-y-3">
            <p className="text-[14px] text-muted">{manual.hint ?? "Use ↑ ↓ para definir a ordem dos empatados."}</p>
            {manual.order.map((r, i) => (
              <div key={r.team.id} className="glass flex items-center gap-3 rounded-2xl p-3">
                <span className="tabular w-8 text-[17px] font-bold">{ordinal(i)}</span>
                <span className="flex-1 truncate text-[16px] font-medium">{r.team.name}</span>
                <button aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)} className="press glass size-10 rounded-full p-2 disabled:opacity-30">
                  {Icons.up}
                </button>
                <button aria-label="Descer" disabled={i === manual.order.length - 1} onClick={() => move(i, 1)} className="press glass size-10 rounded-full p-2 disabled:opacity-30">
                  {Icons.down}
                </button>
              </div>
            ))}
            <Button variant="primary" className="w-full" disabled={busy} onClick={() => save(manual.group, manual.block, manual.order.map((r) => r.team.id), "sorteio")}>
              Salvar ordem
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
