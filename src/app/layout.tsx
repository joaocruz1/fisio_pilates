import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";

/**
 * Sora e JetBrains Mono vivem no root porque (app), admin, (auth) e (print)
 * dependem das duas — replicá-las em seis layouts seria pior.
 *
 * Mas `preload: false`: a landing é a única rota pública, e ela não casa
 * nenhuma das duas (os headings dela são Archivo, ver (site)/layout.tsx). Sem
 * isto, todo visitante de primeira viagem baixava 64 KB de fonte que a página
 * nunca usa — no celular, no 4G, que é exatamente o cenário do público. As duas
 * continuam disponíveis: o CSS ainda as referencia e o browser as busca quando
 * a área logada de fato as casa; o que sai é só a dica de preload.
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  preload: false,
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Fonte de display para títulos (headings) — mais personalidade que a de corpo.
// A landing não usa esta: instancia a Archivo no próprio layout, para que a
// troca de voz não vaze para a área logada. Ver src/app/(site)/layout.tsx.
const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: textos.landing.meta.titulo,
    template: `%s · ${textos.app.nome}`,
  },
  // Escrita para caber no SERP (163 chars). A descrição anterior reusava o
  // subtítulo do hero, que tinha 190 e era cortada no meio de uma oração.
  description: textos.landing.meta.descricao,
  applicationName: textos.app.nome,
  keywords: [
    "fisioterapia",
    "pilates",
    "gestão de alunos",
    "relatório de evolução",
    "avaliação postural",
    "LGPD",
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
    title: textos.landing.meta.titulo,
    description: textos.landing.meta.descricao,
  },
  twitter: {
    card: "summary_large_image",
    title: textos.landing.meta.titulo,
    description: textos.landing.meta.descricao,
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
    // suppressHydrationWarning: o script inline do next-themes muda a class do
    // <html> antes da hidratação. O flag tem profundidade 1 — cobre só o <html>,
    // não a árvore.
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        jetbrainsMono.variable,
        sora.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
        {/* Fora do ThemeProvider de propósito: o Toaster não deve poder ser
            remontado por troca de tema — remontar reinicia os timers de
            auto-dismiss dos toasts. Ver o comentário em ui/sonner.tsx. */}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
