"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

/**
 * Ponte conta → dispositivo: aplica a preferência salva em profiles.theme ao
 * next-themes uma única vez, no boot da área logada. Não renderiza nada.
 *
 * O guard de ref é o que faz a regra "banco vence no boot, usuária vence
 * depois" funcionar: sem ele, qualquer revalidatePath("/", "layout") de outra
 * action re-renderizaria o AppShell com a prop do servidor e desfaria uma
 * troca de tema feita depois.
 */
export function ThemeSync({ temaDaConta }: { temaDaConta: string | null }) {
  const { setTheme } = useTheme();
  const semeado = useRef(false);

  useEffect(() => {
    if (semeado.current || !temaDaConta) return;
    semeado.current = true;
    setTheme(temaDaConta);
  }, [temaDaConta, setTheme]);

  return null;
}
