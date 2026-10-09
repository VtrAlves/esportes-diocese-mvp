"use client";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
}

export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Pede permissão, cria a inscrição push e associa ao time. */
export async function subscribeTeam(teamId: string): Promise<void> {
  if (!pushSupported()) throw new Error("Este navegador não suporta notificações push.");
  // Pede a permissão antes de qualquer outra espera: o navegador só mostra o pedido
  // enquanto ainda reconhece o toque do usuário (Safari é o mais rígido).
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permissão de notificação negada. Libere nas configurações do navegador.");
  const { key } = (await fetch("/api/push/key", { cache: "no-store" })
    .then((r) => r.json())
    .catch(() => ({ key: null }))) as { key: string | null };
  if (!key) throw new Error("Notificações não configuradas no servidor (VAPID).");
  const reg = await registerSW();
  if (!reg) throw new Error("Não foi possível registrar o service worker.");
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), teamId }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Falha ao ativar notificações.");
}

export async function unsubscribe(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => undefined);
  await sub.unsubscribe();
}

/** Notificação local (app aberto, sem push). */
export async function localNotify(title: string, body: string): Promise<void> {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker?.getRegistration("/");
  if (reg) await reg.showNotification(title, { body, icon: "/icons/192", tag: "local" });
  else new Notification(title, { body });
}
