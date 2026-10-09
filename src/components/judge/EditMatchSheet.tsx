"use client";
import { useEffect, useState } from "react";
import { judgeApi } from "@/lib/judgeApi";
import { defaultRules, GROUPS, matchLabel, sourceLabel } from "@/lib/rules";
import { formatClock, remainingMs } from "@/lib/timer";
import type { Match, Team } from "@/lib/types";
import { Button, Field, inputClass, Sheet } from "../ui";

interface Props {
  match: Match | null;
  teams: Team[];
  onClose: () => void;
  onOpenScoreboard: (m: Match) => void;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
  refresh: () => void;
}

export function EditMatchSheet({ match: m, teams, onClose, onOpenScoreboard, onDone, onError, refresh }: Props) {
  const [form, setForm] = useState({ target: "", minutes: "", home: "", away: "", hs: "", as: "", clock: "" });
  const [initialClock, setInitialClock] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!m) return;
    setForm({
      target: String(m.target_points),
      minutes: String(+(m.duration_seconds / 60).toFixed(2)),
      home: m.home_team_id ?? "",
      away: m.away_team_id ?? "",
      hs: String(m.home_score),
      as: String(m.away_score),
      clock: formatClock(remainingMs(m, Date.now())),
    });
    setInitialClock(formatClock(remainingMs(m, Date.now())));
    // Só reinicia o formulário ao abrir outra partida (não a cada atualização em tempo real).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.id]);

  if (!m) return null;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const wrap = async (fn: () => Promise<unknown>, msg: string, close = true) => {
    setBusy(true);
    try {
      await fn();
      onDone(msg);
      if (close) onClose();
    } catch (e) {
      onError((e as Error).message);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const patch: Partial<Match> = {
      target_points: Number(form.target),
      duration_seconds: Math.round(Number(form.minutes.replace(",", ".")) * 60),
    };
    if (form.home !== (m.home_team_id ?? "")) patch.home_team_id = form.home || null;
    if (form.away !== (m.away_team_id ?? "")) patch.away_team_id = form.away || null;
    patch.home_score = Number(form.hs);
    patch.away_score = Number(form.as);
    let remaining: number | undefined;
    if (form.clock !== initialClock) {
      const secs = parseClock(form.clock);
      if (secs === null) return onError("Tempo restante inválido. Use o formato mm:ss, ex.: 05:30.");
      remaining = secs;
    }
    wrap(() => judgeApi.update(m.id, { ...patch, ...(remaining !== undefined ? { remaining_seconds: remaining } : {}) }), "Partida atualizada.");
  };

  const shiftClock = (delta: number) =>
    setForm((f) => {
      const total = Math.round(Number(f.minutes.replace(",", ".")) * 60) || m.duration_seconds;
      const cur = parseClock(f.clock) ?? 0;
      return { ...f, clock: formatClock(Math.min(total, Math.max(0, cur + delta)) * 1000) };
    });

  const defaults = defaultRules(m.phase, m.group_code);
  const teamOptions = (
    <>
      <option value="">A definir</option>
      {GROUPS.map((g) => (
        <optgroup key={g} label={`Grupo ${g}`}>
          {teams
            .filter((t) => t.group_code === g)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </optgroup>
      ))}
    </>
  );

  return (
    <Sheet open onClose={onClose} title={matchLabel(m)}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pontos para vencer">
            <input inputMode="numeric" className={inputClass} value={form.target} onChange={set("target")} />
          </Field>
          <Field label="Tempo total (min)">
            <input inputMode="decimal" className={inputClass} value={form.minutes} onChange={set("minutes")} />
          </Field>
        </div>
        <button
          className="px-1 text-[13px] text-accent"
          onClick={() => setForm((f) => ({ ...f, target: String(defaults.target_points), minutes: String(defaults.duration_seconds / 60) }))}
        >
          Usar padrão da fase ({defaults.target_points} pts · {defaults.duration_seconds / 60} min)
        </button>

        <Field label={m.status === "live" ? "Tempo restante (cronômetro rodando)" : "Tempo restante"}>
          <input inputMode="numeric" className={inputClass + " tabular text-center text-[22px] font-semibold"} value={form.clock} onChange={set("clock")} placeholder="mm:ss" />
        </Field>
        <div className="grid grid-cols-4 gap-2">
          {[-60, -10, 10, 60].map((d) => (
            <Button key={d} className="px-2 text-[14px]" onClick={() => shiftClock(d)}>
              {d > 0 ? "+" : "−"}{Math.abs(d) >= 60 ? `${Math.abs(d) / 60} min` : `${Math.abs(d)} s`}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <Field label={`Time 1${m.home_source ? ` · ${sourceLabel(m.home_source)}` : ""}`}>
            <select className={inputClass} value={form.home} onChange={set("home")}>{teamOptions}</select>
          </Field>
          <Field label="Placar">
            <input inputMode="numeric" className={inputClass + " w-20 text-center"} value={form.hs} onChange={set("hs")} />
          </Field>
          <Field label={`Time 2${m.away_source ? ` · ${sourceLabel(m.away_source)}` : ""}`}>
            <select className={inputClass} value={form.away} onChange={set("away")}>{teamOptions}</select>
          </Field>
          <Field label="Placar">
            <input inputMode="numeric" className={inputClass + " w-20 text-center"} value={form.as} onChange={set("as")} />
          </Field>
        </div>
        {m.phase !== "group" && m.teams_locked && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--gold)_15%,transparent)] p-3 text-[13px]">
            <span>Times definidos manualmente (não seguem a chave).</span>
            <button
              className="shrink-0 font-semibold text-accent"
              disabled={busy}
              onClick={() => wrap(() => judgeApi.update(m.id, { teams_locked: false }), "Vaga voltou a seguir a chave.")}
            >
              Seguir chave
            </button>
          </div>
        )}

        <Button variant="primary" className="w-full" disabled={busy} onClick={save}>
          Salvar
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => { onOpenScoreboard(m); onClose(); }}>Abrir no placar</Button>
          <Button
            disabled={busy || !m.home_team_id}
            onClick={() => wrap(async () => {
              const r = await judgeApi.notify(m.id);
              return r;
            }, "Times chamados para a quadra.", false)}
          >
            Chamar times
          </Button>
          {m.status === "finished" && (
            <Button disabled={busy} onClick={() => wrap(() => judgeApi.action(m.id, { type: "reopen" }), "Partida reaberta.")}>
              Reabrir
            </Button>
          )}
          {m.status !== "scheduled" && (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Zerar placar e cronômetro desta partida?"))
                  wrap(() => judgeApi.action(m.id, { type: "reset" }), "Partida zerada.");
              }}
            >
              Zerar partida
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/** "5:30" → 330 s; "5" → 300 s. */
function parseClock(v: string): number | null {
  const t = v.trim().replace(",", ".");
  const mmss = t.match(/^(\d{1,3}):([0-5]?\d)$/);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  if (/^\d+(\.\d+)?$/.test(t)) return Math.round(Number(t) * 60);
  return null;
}
