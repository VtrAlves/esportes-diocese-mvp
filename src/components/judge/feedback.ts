"use client";

let ctx: AudioContext | null = null;

/** Apito curto via Web Audio (sem arquivos). */
export function beep(times = 1, freq = 1046): void {
  try {
    ctx ??= new AudioContext();
    for (let i = 0; i < times; i++) {
      const start = ctx.currentTime + i * 0.35;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    }
  } catch {
    /* áudio indisponível */
  }
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* sem vibração */
  }
}
