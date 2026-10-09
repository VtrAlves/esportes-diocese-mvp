"use client";
import { useState } from "react";
import { judgeApi } from "@/lib/judgeApi";
import { GROUPS } from "@/lib/rules";
import type { Team } from "@/lib/types";
import { Button, GlassCard, inputClass, Sheet } from "../ui";

function TeamInput({ team, onError, onDone }: { team: Team; onError: (m: string) => void; onDone: (m: string) => void }) {
  const [name, setName] = useState(team.name);
  const save = async () => {
    const clean = name.trim();
    if (!clean || clean === team.name) return setName(team.name);
    try {
      await judgeApi.renameTeam(team.id, clean);
      onDone(`Nome salvo: ${clean}`);
    } catch (e) {
      onError((e as Error).message);
      setName(team.name);
    }
  };
  return (
    <input
      className={inputClass}
      value={name}
      maxLength={60}
      onChange={(e) => setName(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}

function ResetTournament({ onError, onDone, refresh }: { onError: (m: string) => void; onDone: (m: string) => void; refresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [restoreDefaults, setRestoreDefaults] = useState(false);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setConfirm("");
    setRestoreDefaults(false);
  };

  const reset = async () => {
    setBusy(true);
    try {
      await judgeApi.resetTournament(restoreDefaults);
      onDone("Campeonato zerado.");
      close();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
      refresh();
    }
  };

  return (
    <>
      <GlassCard className="space-y-3 p-4 md:col-span-2">
        <div>
          <h3 className="text-[17px] font-bold text-danger">Zerar campeonato</h3>
          <p className="text-[14px] text-muted">Apaga todos os placares e resultados e esvazia a chave. Os nomes dos times são mantidos.</p>
        </div>
        <Button variant="danger" className="w-full" onClick={() => setOpen(true)}>
          Zerar campeonato…
        </Button>
      </GlassCard>

      <Sheet open={open} onClose={close} title="Zerar campeonato">
        <div className="space-y-4">
          <p className="text-[15px]">
            Todos os jogos voltam para <b>não iniciado</b> com placar 0×0, e as vagas do mata-mata ficam em branco.{" "}
            <b>Não dá para desfazer.</b>
          </p>
          <label className="glass flex items-start gap-3 rounded-2xl p-3 text-[14px]">
            <input type="checkbox" className="mt-0.5 size-5 accent-[var(--accent)]" checked={restoreDefaults} onChange={(e) => setRestoreDefaults(e.target.checked)} />
            <span>Também restaurar a ordem dos jogos e os pontos/tempos padrão de cada fase</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">
              Digite <b>ZERAR</b> para confirmar
            </span>
            <input className={inputClass + " text-center uppercase"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoCapitalize="characters" autoComplete="off" />
          </label>
          <Button variant="danger" className="w-full" disabled={busy || confirm.trim().toUpperCase() !== "ZERAR"} onClick={reset}>
            {busy ? "Zerando…" : "Zerar campeonato"}
          </Button>
          <Button className="w-full" onClick={close}>
            Cancelar
          </Button>
        </div>
      </Sheet>
    </>
  );
}

export function TeamsEditor({
  teams,
  onError,
  onDone,
  refresh,
}: {
  teams: Team[];
  onError: (m: string) => void;
  onDone: (m: string) => void;
  refresh: () => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {GROUPS.map((g) => (
        <GlassCard key={g} className="space-y-2 p-4">
          <h3 className="text-[20px] font-bold">Grupo {g}</h3>
          {teams
            .filter((t) => t.group_code === g)
            .map((t) => (
              <TeamInput key={t.id} team={t} onError={onError} onDone={onDone} />
            ))}
        </GlassCard>
      ))}
      <p className="px-2 text-[12px] text-muted md:col-span-2">Toque no nome para editar. Salva automaticamente ao sair do campo.</p>
      <ResetTournament onError={onError} onDone={onDone} refresh={refresh} />
    </div>
  );
}
