"use client";
import { useState } from "react";
import { judgeApi } from "@/lib/judgeApi";
import { GROUPS } from "@/lib/rules";
import type { Team } from "@/lib/types";
import { GlassCard, inputClass } from "../ui";

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

export function TeamsEditor({ teams, onError, onDone }: { teams: Team[]; onError: (m: string) => void; onDone: (m: string) => void }) {
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
    </div>
  );
}
