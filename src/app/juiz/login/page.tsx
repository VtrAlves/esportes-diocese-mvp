"use client";
import { useState } from "react";
import { Button, GlassCard, Icons, inputClass } from "@/components/ui";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/juiz/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = "/juiz";
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "Falha no login");
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <GlassCard strong className="enter w-full max-w-sm p-7">
        <form onSubmit={submit} className="space-y-5 text-center">
          <span className="mx-auto block size-14 text-accent">{Icons.whistle}</span>
          <div>
            <h1 className="text-[26px] font-bold tracking-tight">Área do juiz</h1>
            <p className="text-[14px] text-muted">Digite a senha para controlar o placar.</p>
          </div>
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass + " text-center"}
          />
          {error && <p className="text-[14px] font-medium text-danger">{error}</p>}
          <Button type="submit" variant="primary" className="w-full" disabled={busy || !password}>
            {busy ? "Entrando…" : "Entrar"}
          </Button>
          <a href="/" className="block text-[14px] text-accent">Ver placar público</a>
        </form>
      </GlassCard>
    </main>
  );
}
