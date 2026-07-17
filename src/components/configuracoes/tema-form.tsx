"use client";

import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";
import type { Tema } from "@/lib/validators/tema";
import { salvarTema } from "@/server/actions/tema";

const OPCOES: { valor: Tema; label: string; Icon: typeof SunIcon }[] = [
  { valor: "light", label: textos.tema.claro, Icon: SunIcon },
  { valor: "dark", label: textos.tema.escuro, Icon: MoonIcon },
  { valor: "system", label: textos.tema.sistema, Icon: DesktopIcon },
];

/**
 * Seletor de tema da página de configurações — explícito (não icon-only),
 * porque é aqui que a preferência fica descobrível.
 *
 * Diferente dos outros forms de configuração, não tem botão "Salvar": o tema
 * aplica na hora e a escrita na conta é fire-and-forget. Aqui, ao contrário do
 * atalho no menu, avisamos se a gravação falhar — quem veio até esta tela
 * espera que a preferência fique guardada.
 */
export function TemaForm() {
  const { theme, setTheme } = useTheme();
  // O tema real só existe no cliente (localStorage/matchMedia). Marcar a opção
  // ativa direto de `theme` divergiria do HTML do servidor e quebraria a
  // hidratação — nenhum fallback resolve, só troca qual lado fica errado. Até
  // montar, nenhuma opção aparece marcada; o effect roda no mesmo tick.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  async function escolher(valor: Tema) {
    setTheme(valor);
    const res = await salvarTema({ tema: valor });
    if (!res.ok) toast.error(res.erro);
  }

  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">{textos.tema.rotulo}</legend>
      {OPCOES.map(({ valor, label, Icon }) => {
        const ativo = montado && (theme ?? "system") === valor;
        return (
          // Radio nativo (escondido) em vez de <button role="radio">: dá
          // navegação por setas e anúncio de grupo de graça.
          <label
            key={valor}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors",
              "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
              ativo
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <input
              type="radio"
              name="tema"
              value={valor}
              checked={ativo}
              onChange={() => void escolher(valor)}
              className="sr-only"
            />
            <Icon className="size-4" weight={ativo ? "fill" : "regular"} />
            {label}
          </label>
        );
      })}
    </fieldset>
  );
}
