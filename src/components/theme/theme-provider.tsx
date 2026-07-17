"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Dono do tema no DOM: é a única coisa que escreve `class="dark"` no <html>,
 * via script inline que roda antes do primeiro paint (por isso não há flash).
 *
 * A preferência da conta (profiles.theme) não renderiza — ela apenas semeia
 * este provider uma vez, no boot da área logada. Ver ThemeSync.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // Sem isto, os ~40 tokens transicionam juntos e a troca vira um arco-íris.
      disableTransitionOnChange
      storageKey="fisiopilates-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
