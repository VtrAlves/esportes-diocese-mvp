"use client";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function GlassCard({ className, children, strong }: { className?: string; children: ReactNode; strong?: boolean }) {
  return <div className={cx(strong ? "glass-strong" : "glass", "specular rounded-[28px]", className)}>{children}</div>;
}

type Variant = "glass" | "primary" | "danger" | "success" | "ghost";

export function Button({
  variant = "glass",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    glass: "glass text-fg",
    primary: "bg-accent text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--accent)_40%,transparent),inset_0_1px_0_rgba(255,255,255,.4)]",
    danger: "bg-danger text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35)]",
    success: "bg-success text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--success)_40%,transparent),inset_0_1px_0_rgba(255,255,255,.4)]",
    ghost: "text-accent",
  };
  return (
    <button
      {...props}
      className={cx(
        "press inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold disabled:opacity-40",
        styles[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-2 first:mt-0">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function StatusBadge({ status, golden, walkover }: { status: string; golden?: boolean; walkover?: boolean }) {
  if (walkover && status === "finished")
    return <span className="whitespace-nowrap rounded-full bg-[color-mix(in_srgb,var(--danger)_18%,transparent)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-danger">W.O.</span>;
  if (golden && status !== "finished")
    return <span className="rounded-full bg-gold px-2.5 py-0.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-black">Ponto de ouro</span>;
  if (status === "live")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-danger px-2.5 py-0.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-white">
        <span className="live-dot size-1.5 rounded-full bg-white" /> Ao vivo
      </span>
    );
  if (status === "paused")
    return <span className="rounded-full bg-[color-mix(in_srgb,var(--gold)_25%,transparent)] px-2.5 py-0.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-gold">Pausado</span>;
  if (status === "finished")
    return <span className="rounded-full bg-[color-mix(in_srgb,var(--fg)_10%,transparent)] px-2.5 py-0.5 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-muted">Encerrado</span>;
  return null;
}

/** Controle segmentado em vidro, estilo iOS. */
export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="glass specular flex rounded-full p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={o.id === value}
          className={cx(
            "press min-h-10 flex-1 rounded-full px-4 text-[14px] font-semibold",
            o.id === value ? "bg-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35)]" : "text-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon: ReactNode;
}

/** Tab bar flutuante em vidro, estilo iOS. */
export function TabBar<T extends string>({ tabs, value, onChange }: { tabs: TabItem<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <nav className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4">
      <div className="glass-strong specular pointer-events-auto flex w-full max-w-lg gap-1 rounded-full p-1.5">
        {tabs.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              aria-current={active ? "page" : undefined}
              className={cx(
                "press flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] font-semibold",
                active ? "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent" : "text-muted",
              )}
            >
              <span className="size-6">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Folha inferior modal (bottom sheet). */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-label={title}>
      <button aria-label="Fechar" className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="glass-strong specular enter safe-bottom relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[32px] p-5 sm:rounded-[32px]">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--separator)] sm:hidden" />
        <h3 className="mb-4 text-center text-[17px] font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

/** Confirmação em folha inferior (substitui window.confirm). */
export function ConfirmSheet({
  open,
  title,
  children,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="text-[15px]">{children}</div>
        <Button variant={danger ? "danger" : "primary"} className="min-h-12 w-full" disabled={busy} onClick={onConfirm}>
          {busy ? "Aguarde…" : confirmLabel}
        </Button>
        <Button className="w-full" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </Sheet>
  );
}

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onClose, 6000);
    return () => clearTimeout(id);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className="safe-top pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4">
      <button onClick={onClose} className="glass-strong specular enter pointer-events-auto mt-2 w-full max-w-md rounded-[22px] px-5 py-3.5 text-left text-[15px] font-semibold">
        {message}
      </button>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "glass w-full rounded-2xl px-4 py-3 text-[16px] text-fg outline-none focus:ring-2 focus:ring-accent";

/* Ícones (SF Symbols-like, traço) */
const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-full">
    {d}
  </svg>
);
export const Icons = {
  live: icon(<><circle cx="12" cy="12" r="3" /><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4" /></>),
  list: icon(<><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>),
  table: icon(<><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 10h18M9 10v10" /></>),
  bracket: icon(<><path d="M3 5h5v6H3M3 13h5v6H3M8 8h4v8H8M12 12h4" /><circle cx="19" cy="12" r="2.5" /></>),
  team: icon(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17.5" cy="9" r="2.4" /><path d="M16.5 14.2c2.6.3 4.5 2.6 4.5 5.3" /></>),
  whistle: icon(<><path d="M3 12a5 5 0 1 0 10 0h8V8H8a5 5 0 0 0-5 4z" /><circle cx="8" cy="12" r="1.2" /></>),
  bell: icon(<><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></>),
  up: icon(<path d="M6 15l6-6 6 6" />),
  down: icon(<path d="M6 9l6 6 6-6" />),
  edit: icon(<><path d="M4 20h4L19 9l-4-4L4 16z" /></>),
  play: icon(<path d="M7 4.5v15l12-7.5z" fill="currentColor" />),
  pause: icon(<><rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" /><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" /></>),
  undo: icon(<><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>),
  ball: icon(<><circle cx="12" cy="12" r="9.5" /><path d="M12 2.5a9.5 9.5 0 0 0-3.8 7.6M12 12a9.5 9.5 0 0 1 8.6-2.8M12 12a9.5 9.5 0 0 1-4.8 8.2M12 12c1.9-2.9 1.9-6.7 0-9.5M12 12c-3.3 0-6.2 1.4-8.5 3.8M12 12c1.4 3 4.3 5 7.6 5.7" /></>),
  logout: icon(<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 16l-4-4 4-4M6 12h10" /></>),
};
