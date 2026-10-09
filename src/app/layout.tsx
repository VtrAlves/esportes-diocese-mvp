import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Placar Vôlei",
  description: "Placar ao vivo, tabela e chaveamento dos Esportes da Diocese.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Placar Vôlei", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/192", apple: "/icons/180" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9eef8" },
    { media: "(prefers-color-scheme: dark)", color: "#050914" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="app-backdrop" aria-hidden />
        {children}
      </body>
    </html>
  );
}
