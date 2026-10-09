import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { upcomingMatches } from "./queue";
import type { Match, Team } from "./types";

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:placar@example.com", pub, priv);
  configured = true;
  return true;
}

interface Payload {
  title: string;
  body: string;
  tag?: string;
}

export async function sendToTeams(db: SupabaseClient, teamIds: string[], payload: Payload): Promise<number> {
  if (!configure() || teamIds.length === 0) return 0;
  const { data, error } = await db.from("push_subscriptions").select("*").in("team_id", teamIds);
  if (error || !data) return 0;
  let sent = 0;
  await Promise.all(
    data.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ ...payload, url: "/" }),
          { TTL: 600, urgency: "high" },
        );
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
        else console.error("push falhou", code, e);
      }
    }),
  );
  return sent;
}

function vs(m: Match, teams: Team[]): string {
  const name = (id: string | null) => teams.find((t) => t.id === id)?.name ?? "A definir";
  return `${name(m.home_team_id)} x ${name(m.away_team_id)}`;
}

function teamsOf(m: Match): string[] {
  return [m.home_team_id, m.away_team_id].filter((x): x is string => !!x);
}

/**
 * Avisa os times da próxima partida ("vocês são os próximos") e da seguinte ("falta 1 jogo").
 * Se `matchId` for informado, avisa apenas os times daquela partida.
 */
export async function notifyUpcoming(
  db: SupabaseClient,
  teams: Team[],
  matches: Match[],
  matchId?: string,
): Promise<number> {
  if (matchId) {
    const m = matches.find((x) => x.id === matchId);
    if (!m) return 0;
    return sendToTeams(db, teamsOf(m), {
      title: "🏐 Chamada para a quadra!",
      body: `${vs(m, teams)} — dirijam-se à quadra.`,
      tag: `call-${m.id}`,
    });
  }
  const [next, after] = upcomingMatches(matches);
  let sent = 0;
  if (next) {
    sent += await sendToTeams(db, teamsOf(next), {
      title: "🏐 Vocês são os próximos!",
      body: `${vs(next, teams)} — preparem-se para entrar em quadra.`,
      tag: `next-${next.id}`,
    });
  }
  if (after) {
    sent += await sendToTeams(db, teamsOf(after), {
      title: "⏳ Falta 1 jogo para vocês",
      body: `Depois de ${vs(next, teams)} é a vez de ${vs(after, teams)}.`,
      tag: `soon-${after.id}`,
    });
  }
  return sent;
}
