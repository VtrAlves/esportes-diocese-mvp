import { ImageResponse } from "next/og";

const SIZES = new Set([180, 192, 512]);

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size: raw } = await ctx.params;
  const size = SIZES.has(Number(raw)) ? Number(raw) : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0a84ff 0%, #5a2fc4 55%, #ff7a1a 100%)",
        }}
      >
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0 0-4 8" />
          <path d="M12 12a10 10 0 0 1 9 -3" />
          <path d="M12 12a10 10 0 0 1 -5 8.7" />
          <path d="M12 12c2-3 2-7 0-10" />
          <path d="M12 12c-3.5 0-6.5 1.5-9 4" />
          <path d="M12 12c1.5 3.2 4.5 5.3 8 6" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
