import { describe, expect, it } from "vitest";
import { computeBracketUpdates, resolveSource } from "./bracket";
import { groupResultsKey } from "./standings";
import { match, result, team } from "./fixtures.test-utils";

const teams = [team("a1", "A"), team("a2", "A"), team("a3", "A"), team("d1", "D"), team("d2", "D")];
const groupA = [result("A1", "A", "a1", "a2", 10, 5), result("A2", "A", "a1", "a3", 10, 8), result("A3", "A", "a2", "a3", 10, 2)];

describe("resolveSource", () => {
  it("só resolve posição de grupo quando o grupo terminou", () => {
    expect(resolveSource("1A", teams, groupA)).toBe("a1");
    expect(resolveSource("2A", teams, groupA)).toBe("a2");
    expect(resolveSource("1D", teams, groupA)).toBeNull();
  });

  it("resolve vencedor e perdedor", () => {
    const sf = match({ slot: "SF1", phase: "sf", home_team_id: "a1", away_team_id: "d1", status: "finished", winner_id: "d1", home_score: 5, away_score: 12 });
    expect(resolveSource("W:SF1", teams, [sf])).toBe("d1");
    expect(resolveSource("L:SF1", teams, [sf])).toBe("a1");
  });
});

describe("computeBracketUpdates", () => {
  const qf1 = match({ id: "qf1", slot: "QF1", phase: "qf", home_source: "1A", away_source: "2D" });

  it("preenche as vagas resolvidas", () => {
    expect(computeBracketUpdates(teams, [...groupA, qf1])).toEqual([{ id: "qf1", home_team_id: "a1", away_team_id: null }]);
  });

  it("respeita ajustes manuais e partidas já iniciadas", () => {
    expect(computeBracketUpdates(teams, [...groupA, { ...qf1, teams_locked: true }])).toEqual([]);
    expect(computeBracketUpdates(teams, [...groupA, { ...qf1, status: "live" }])).toEqual([]);
  });

  it("limpa a vaga se o resultado for reaberto", () => {
    const reopened = [...groupA.slice(0, 2), { ...groupA[2], status: "paused" as const, winner_id: null }];
    expect(computeBracketUpdates(teams, [...reopened, { ...qf1, home_team_id: "a1" }])).toEqual([
      { id: "qf1", home_team_id: null, away_team_id: null },
    ]);
  });
});

describe("chave com desempate do juiz", () => {
  it("usa a ordem definida pelo juiz para 1º e 2º", () => {
    const cycle = [result("A1", "A", "a1", "a2", 10, 9), result("A2", "A", "a2", "a3", 10, 4), result("A3", "A", "a3", "a1", 10, 6)];
    const tb = { group_code: "A" as const, manual_order: ["a3", "a1", "a2"], criterion: "sorteio" as const, results_key: groupResultsKey(cycle, "A") };
    expect(resolveSource("1A", teams, cycle, [tb])).toBe("a3");
    expect(resolveSource("2A", teams, cycle, [tb])).toBe("a1");
  });
});
