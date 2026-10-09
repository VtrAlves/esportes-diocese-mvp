import { describe, expect, it } from "vitest";
import { computeStandings, isGroupComplete } from "./standings";
import { match, result, team } from "./fixtures.test-utils";

const teams = [team("x", "A"), team("y", "A"), team("z", "A")];

describe("computeStandings", () => {
  it("ordena por vitórias", () => {
    const ms = [result("A1", "A", "x", "y", 10, 5), result("A2", "A", "x", "z", 10, 8), result("A3", "A", "y", "z", 10, 2)];
    const rows = computeStandings(teams, ms, "A");
    expect(rows.map((r) => r.team.id)).toEqual(["x", "y", "z"]);
    expect(rows[0]).toMatchObject({ played: 2, wins: 2, losses: 0, pointsFor: 20, pointsAgainst: 13, diff: 7 });
  });

  it("desempata por saldo e depois pontos feitos", () => {
    // ciclo: todos com 1 vitória
    const ms = [result("A1", "A", "x", "y", 10, 9), result("A2", "A", "y", "z", 10, 4), result("A3", "A", "z", "x", 10, 6)];
    const rows = computeStandings(teams, ms, "A");
    // saldos: x = +1-4 = -3, y = -1+6 = +5, z = -6+4 = -2
    expect(rows.map((r) => r.team.id)).toEqual(["y", "z", "x"]);
  });

  it("usa confronto direto quando vitórias, saldo e pró empatam", () => {
    const four = [...teams, team("w", "A")];
    const ms = [result("A1", "A", "y", "x", 10, 8), result("A2", "A", "x", "w", 10, 8), result("A3", "A", "z", "y", 10, 8)];
    // x: 1V, 18-18. y: 1V, 18-18. y venceu x.
    const rows = computeStandings(four, ms, "A");
    expect(rows.findIndex((r) => r.team.id === "y")).toBeLessThan(rows.findIndex((r) => r.team.id === "x"));
  });

  it("ignora jogos não finalizados", () => {
    const ms = [result("A1", "A", "x", "y", 10, 5), match({ slot: "A2", group_code: "A", home_team_id: "x", away_team_id: "z", home_score: 3, status: "live" })];
    expect(computeStandings(teams, ms, "A")[0].played).toBe(1);
    expect(isGroupComplete(ms, "A")).toBe(false);
  });
});
