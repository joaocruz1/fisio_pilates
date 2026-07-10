import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fonte de display para títulos (headings) — mais personalidade que a de corpo.
const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: `${textos.app.nome} · ${textos.app.tagline}`,
    template: `%s · ${textos.app.nome}`,
  },
  description: textos.landing.hero.sub,
  applicationName: textos.app.nome,
  keywords: [
    "fisioterapia",
    "pilates",
    "gestão de alunos",
    "relatório de evolução",
    "inteligência artificial",
    "LGPD",
    "RAG",
    "fisioterapeuta autônoma",
  ],
  authors: [{ name: textos.app.nome }],
  creator: textos.app.nome,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: textos.app.nome,
    title: `${textos.app.nome} · ${textos.app.tagline}`,
    description: textos.landing.hero.sub,
  },
  twitter: {
    card: "summary_large_image",
    title: `${textos.app.nome} · ${textos.app.tagline}`,
    description: textos.landing.hero.sub,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        jetbrainsMono.variable,
        sora.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
