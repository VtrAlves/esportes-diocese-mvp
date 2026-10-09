"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Match, Team } from "@/lib/types";

type Row = { id: string };

function upsert<T extends Row>(list: T[], row: T): T[] {
  const i = list.findIndex((x) => x.id === row.id);
  if (i === -1) return [...list, row];
  const copy = list.slice();
  copy[i] = row;
  return copy;
}

/** Times e partidas com atualização em tempo real (Supabase Realtime). */
export function useTournament() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const mounted = useRef(true);
  // Partidas com ações do juiz ainda em envio: o estado local é a verdade até a fila esvaziar.
  const pending = useRef(new Map<string, number>());
  const isPending = (id: string) => (pending.current.get(id) ?? 0) > 0;

  const refresh = useCallback(async () => {
    const db = getBrowserClient();
    const [t, m] = await Promise.all([
      db.from("teams").select("*").order("name"),
      db.from("matches").select("*").order("order_index"),
    ]);
    if (!mounted.current) return;
    if (t.error || m.error) {
      setError((t.error ?? m.error)!.message);
    } else {
      setTeams(t.data as Team[]);
      const fresh = m.data as Match[];
      setMatches((prev) => fresh.map((x) => (isPending(x.id) ? prev.find((p) => p.id === x.id) ?? x : x)));
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const db = getBrowserClient();
    refresh();
    const channel = db
      .channel("placar")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, (p) => {
        if (p.eventType === "DELETE") setMatches((l) => l.filter((x) => x.id !== (p.old as Row).id));
        else if (!isPending((p.new as Row).id)) setMatches((l) => upsert(l, p.new as Match));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, (p) => {
        if (p.eventType === "DELETE") setTeams((l) => l.filter((x) => x.id !== (p.old as Row).id));
        else setTeams((l) => upsert(l, p.new as Team));
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
        // Ao (re)conectar, busca tudo de novo para não perder eventos.
        if (status === "SUBSCRIBED") refresh();
      });

    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);
    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
      db.removeChannel(channel);
    };
  }, [refresh]);

  // Segurança: sem tempo real (conexão caiu, rede ruim), busca os dados a cada 3s;
  // com tempo real, uma conferência leve a cada 30s.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, connected ? 30_000 : 3_000);
    return () => clearInterval(id);
  }, [connected, refresh]);

  /**
   * Aplica uma mudança local imediatamente (a partir do estado mais recente, para toques rápidos)
   * e envia ao servidor. Respostas e eventos intermediários são ignorados; quando a última
   * requisição da partida termina, o estado do servidor passa a valer.
   */
  const mutateMatch = useCallback(
    async <T extends { match: Match }>(id: string, local: (m: Match) => Partial<Match>, request: () => Promise<T>): Promise<T> => {
      pending.current.set(id, (pending.current.get(id) ?? 0) + 1);
      setMatches((l) => l.map((m) => (m.id === id ? { ...m, ...local(m) } : m)));
      const done = () => {
        const left = (pending.current.get(id) ?? 1) - 1;
        if (left > 0) pending.current.set(id, left);
        else pending.current.delete(id);
        return left === 0;
      };
      try {
        const res = await request();
        if (done()) setMatches((l) => upsert(l, res.match));
        return res;
      } catch (e) {
        if (done()) refresh();
        throw e;
      }
    },
    [refresh],
  );

  return { teams, matches, loading, error, connected, refresh, mutateMatch, setMatches };
}
