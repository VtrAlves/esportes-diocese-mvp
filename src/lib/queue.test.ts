import { describe, expect, it } from "vitest";
import { currentMatch, teamQueueInfo } from "./queue";
import { match } from "./fixtures.test-utils";

const ms = [
  match({ slot: "A1", order_index: 1, home_team_id: "a", away_team_id: "b", status: "finished", winner_id: "a" }),
  match({ slot: "B1", order_index: 2, home_team_id: "c", away_team_id: "d", status: "live" }),
  match({ slot: "C1", order_index: 3, home_team_id: "e", away_team_id: "f" }),
  match({ slot: "A2", order_index: 4, home_team_id: "a", away_team_id: "g" }),
];

describe("teamQueueInfo", () => {
  it("identifica quem está jogando", () => {
    expect(currentMatch(ms)?.slot).toBe("B1");
    expect(teamQueueInfo(ms, "c").kind).toBe("playing");
  });

  it("conta partidas antes do próximo jogo", () => {
    expect(teamQueueInfo(ms, "e")).toMatchObject({ kind: "waiting", gamesBefore: 1 });
    expect(teamQueueInfo(ms, "a")).toMatchObject({ kind: "waiting", gamesBefore: 2 });
  });

  it("segue a ordem definida pelo juiz", () => {
    const reordered = ms.map((m) => (m.slot === "A2" ? { ...m, order_index: 2.5 } : m));
    expect(teamQueueInfo(reordered, "a")).toMatchObject({ gamesBefore: 1 });
  });

  it("retorna none sem jogos pendentes", () => {
    expect(teamQueueInfo(ms, "b").kind).toBe("none");
  });
});
