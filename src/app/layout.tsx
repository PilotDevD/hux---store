import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVars } from "@/lib/fonts";
import { ToastProvider } from "@/components/ui/toast";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "HUX";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — Run · Performance · Lifestyle`,
    template: `%s · ${siteName}`,
  },
  description:
    "HUX — vestuário de corrida de alta performance. Peças técnicas para quem encara o quilômetro. Run · Performance · Lifestyle.",
  keywords: ["corrida", "running", "roupas de corrida", "performance", "HUX", "vestuário esportivo"],
  openGraph: {
    title: `${siteName} — Run · Performance · Lifestyle`,
    description: "Vestuário técnico de corrida. Feito para a distância.",
    type: "website",
    locale: "pt_BR",
    siteName,
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#14161a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={fontVars} suppressHydrationWarning>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
