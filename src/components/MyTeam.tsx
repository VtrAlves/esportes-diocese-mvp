"use client";
import { useEffect, useState } from "react";
import { GROUPS } from "@/lib/rules";
import { currentSubscription, isIOS, isStandalone, notificationPermission, pushSupported, subscribeTeam, unsubscribe } from "@/lib/pushClient";
import { teamQueueInfo } from "@/lib/queue";
import type { Match, Team } from "@/lib/types";
import { MatchRow } from "./MatchRow";
import { Button, cx, GlassCard, Icons, SectionTitle } from "./ui";

interface Props {
  teams: Team[];
  matches: Match[];
  myTeam: string | null;
  setMyTeam: (id: string | null) => void;
  teamName: (id: string | null, f?: string) => string;
}

export function QueueInfoCard({ matches, myTeam, teamName }: Pick<Props, "matches" | "myTeam" | "teamName">) {
  if (!myTeam) return null;
  const info = teamQueueInfo(matches, myTeam);
  let big: string;
  let caption: string;
  let tone = "text-fg";
  if (info.kind === "playing") {
    big = "Em quadra";
    caption = "Bom jogo! 🏐";
    tone = "text-danger";
  } else if (info.kind === "waiting" && info.gamesBefore === 0) {
    big = "Vocês são os próximos!";
    caption = "Preparem-se para entrar em quadra.";
    tone = "text-success";
  } else if (info.kind === "waiting") {
    big = `${info.gamesBefore}`;
    caption = info.gamesBefore === 1 ? "partida antes do seu jogo" : "partidas antes do seu jogo";
  } else {
    big = "Sem jogos";
    caption = "Nenhum jogo pendente definido para o seu time.";
    tone = "text-muted";
  }
  return (
    <GlassCard strong className="enter p-5">
      <p className="text-[13px] font-semibold text-muted">{teamName(myTeam)}</p>
      <p className={cx("mt-1 font-bold leading-tight tracking-tight", tone, big.length < 4 ? "tabular text-[64px]" : "text-[28px]")}>{big}</p>
      <p className="text-[15px] text-muted">{caption}</p>
      {info.kind !== "none" && (
        <div className="-mx-4 mt-3 border-t border-[var(--separator)] pt-1">
          <MatchRow match={info.match} teamName={teamName} highlightTeam={myTeam} />
        </div>
      )}
    </GlassCard>
  );
}

export function MyTeam({ teams, matches, myTeam, setMyTeam, teamName }: Props) {
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [env, setEnv] = useState({ supported: true, ios: false, standalone: false });

  useEffect(() => {
    setEnv({ supported: pushSupported(), ios: isIOS(), standalone: isStandalone() });
    currentSubscription().then((s) => setPushOn(!!s));
  }, []);

  const needsInstall = env.ios && !env.standalone;

  const choose = async (id: string) => {
    setMyTeam(id);
    // Escolher o time já pede a permissão de notificação (o toque do usuário permite o pedido).
    const canAsk = env.supported && !needsInstall && notificationPermission() !== "denied";
    if (!pushOn && !canAsk) return;
    setBusy(true);
    setMsg(null);
    try {
      await subscribeTeam(id);
      if (!pushOn) setMsg("Pronto! Você será avisado quando for a vez do seu time.");
      setPushOn(true);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const togglePush = async () => {
    if (!myTeam) return;
    setBusy(true);
    setMsg(null);
    try {
      if (pushOn) {
        await unsubscribe();
        setPushOn(false);
      } else {
        await subscribeTeam(myTeam);
        setPushOn(true);
        setMsg("Pronto! Você será avisado quando for a vez do seu time.");
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <QueueInfoCard matches={matches} myTeam={myTeam} teamName={teamName} />

      {myTeam && (
        <GlassCard className="p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 size-7 shrink-0 text-accent">{Icons.bell}</span>
            <div className="flex-1">
              <p className="text-[17px] font-semibold">Notificações</p>
              <p className="text-[14px] text-muted">Aviso quando faltar 1 jogo e quando seu time for o próximo.</p>
            </div>
          </div>
          {needsInstall ? (
            <div className="mt-4 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] p-4 text-[14px]">
              <p className="font-semibold">No iPhone/iPad:</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted">
                <li>Toque em <b>Compartilhar</b> no Safari</li>
                <li>Escolha <b>Adicionar à Tela de Início</b></li>
                <li>Abra o app pela tela inicial e ative aqui</li>
              </ol>
            </div>
          ) : !env.supported ? (
            <p className="mt-4 text-[14px] text-muted">Este navegador não suporta notificações push. Mantenha esta tela aberta para ver os avisos.</p>
          ) : (
            <Button variant={pushOn ? "glass" : "primary"} className="mt-4 w-full" onClick={togglePush} disabled={busy}>
              {busy ? "Aguarde…" : pushOn ? "Desativar notificações" : "Ativar notificações"}
            </Button>
          )}
          {msg && <p className="mt-3 text-center text-[13px] text-muted">{msg}</p>}
          {!pushOn && env.supported && !needsInstall && notificationPermission() === "denied" && (
            <p className="mt-3 text-center text-[13px] text-muted">
              As notificações foram bloqueadas neste navegador. Toque no 🔒 ao lado do endereço → Notificações → Permitir, e depois em Ativar.
            </p>
          )}
        </GlassCard>
      )}

      <SectionTitle>{myTeam ? "Trocar de time" : "Escolha o seu time"}</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        {GROUPS.map((g) => (
          <GlassCard key={g} className="p-2">
            <p className="px-3 pb-1 pt-2 text-[12px] font-bold uppercase tracking-wider text-muted">Grupo {g}</p>
            {teams
              .filter((t) => t.group_code === g)
              .map((t) => {
                const active = t.id === myTeam;
                return (
                  <button
                    key={t.id}
                    onClick={() => choose(t.id)}
                    className={cx(
                      "press flex min-h-12 w-full items-center justify-between rounded-2xl px-3 text-left text-[16px] font-medium",
                      active && "bg-accent text-white",
                    )}
                  >
                    {t.name}
                    {active && <span className="text-[13px] font-semibold">Meu time ✓</span>}
                  </button>
                );
              })}
          </GlassCard>
        ))}
      </div>
      {myTeam && (
        <Button variant="ghost" className="w-full" onClick={() => setMyTeam(null)}>
          Não acompanhar nenhum time
        </Button>
      )}
    </div>
  );
}
