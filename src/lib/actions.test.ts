import { describe, expect, it } from "vitest";
import { ActionError, applyAction } from "./actions";
import { match } from "./fixtures.test-utils";

const base = match({ slot: "A1", home_team_id: "h", away_team_id: "a", target_points: 10, duration_seconds: 480 });
const t0 = Date.parse("2026-10-09T12:00:00Z");

describe("applyAction", () => {
  it("inicia e pausa acumulando o tempo", () => {
    const started = { ...base, ...applyAction(base, { type: "start" }, t0) };
    expect(started.status).toBe("live");
    const paused = applyAction(started, { type: "pause" }, t0 + 65_000);
    expect(paused).toMatchObject({ status: "paused", elapsed_seconds: 65, timer_started_at: null });
  });

  it("pausa ao atingir a pontuação alvo", () => {
    const live = { ...base, status: "live" as const, timer_started_at: new Date(t0).toISOString(), home_score: 9 };
    expect(applyAction(live, { type: "point", side: "home", delta: 1 }, t0 + 1000)).toMatchObject({ home_score: 10, status: "paused" });
  });

  it("fim do tempo empatado vira ponto de ouro", () => {
    const tied = { ...base, status: "live" as const, home_score: 5, away_score: 5 };
    expect(applyAction(tied, { type: "timeup" }, t0)).toMatchObject({ golden_point: true, elapsed_seconds: 480 });
  });

  it("finaliza com o vencedor e recusa empate", () => {
    expect(applyAction({ ...base, home_score: 7, away_score: 10 }, { type: "finish" }, t0)).toMatchObject({ status: "finished", winner_id: "a" });
    expect(() => applyAction({ ...base, home_score: 3, away_score: 3 }, { type: "finish" }, t0)).toThrow(ActionError);
  });

  it("não deixa placar negativo", () => {
    expect(applyAction(base, { type: "point", side: "away", delta: -1 }, t0)).toMatchObject({ away_score: 0 });
  });
});

describe("W.O.", () => {
  it("encerra com pontos da partida x 0 para o vencedor", () => {
    expect(applyAction({ ...base, target_points: 12 }, { type: "walkover", side: "away" }, t0)).toMatchObject({
      status: "finished",
      home_score: 0,
      away_score: 12,
      winner_id: "a",
      walkover: true,
    });
  });

  it("exige os dois times", () => {
    expect(() => applyAction({ ...base, away_team_id: null }, { type: "walkover", side: "home" }, t0)).toThrow(ActionError);
  });

  it("reabrir um W.O. zera a partida", () => {
    const wo = { ...base, ...applyAction(base, { type: "walkover", side: "home" }, t0) };
    expect(applyAction(wo, { type: "reopen" }, t0)).toMatchObject({ status: "scheduled", home_score: 0, walkover: false });
  });
});

describe("partida empatada", () => {
  const tied = { ...base, home_score: 8, away_score: 8, status: "paused" as const };

  it("encerra como empate na fase de grupos", () => {
    expect(applyAction(tied, { type: "finish", outcome: "draw" }, t0)).toMatchObject({ status: "finished", winner_id: null });
  });

  it("não permite empate no mata-mata", () => {
    expect(() => applyAction({ ...tied, phase: "qf" }, { type: "finish", outcome: "draw" }, t0)).toThrow(ActionError);
  });

  it("juiz define o vencedor mantendo o placar", () => {
    const patch = applyAction({ ...tied, phase: "final" }, { type: "finish", outcome: "away" }, t0);
    expect(patch).toMatchObject({ status: "finished", winner_id: "a" });
    expect(patch).not.toHaveProperty("home_score");
  });

  it("com placar diferente, ignora a escolha e vence quem lidera", () => {
    expect(applyAction({ ...base, home_score: 10, away_score: 4 }, { type: "finish", outcome: "away" }, t0)).toMatchObject({ winner_id: "h" });
  });
});
