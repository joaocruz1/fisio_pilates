"use client";

import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { textos } from "@/lib/textos";
import { TEMAS, type Tema } from "@/lib/validators/tema";
import { salvarTema } from "@/server/actions/tema";

const OPCOES: { valor: Tema; label: string; Icon: typeof SunIcon }[] = [
  { valor: "light", label: textos.tema.claro, Icon: SunIcon },
  { valor: "dark", label: textos.tema.escuro, Icon: MoonIcon },
  { valor: "system", label: textos.tema.sistema, Icon: DesktopIcon },
];

function ehTema(v: string): v is Tema {
  return (TEMAS as readonly string[]).includes(v);
}

/**
 * Três estados em vez de um switch: `system` é o padrão, e um switch binário
 * não consegue representá-lo — quem tocasse nele sairia de `system` para
 * sempre, sem caminho de volta.
 *
 * `persistir` só na área logada: a action chama requireTenant(), que
 * redirecionaria um visitante anônimo da landing.
 */
export function ThemeToggle({ persistir = false }: { persistir?: boolean }) {
  const { theme, setTheme } = useTheme();

  function aoEscolher(valor: string) {
    if (!ehTema(valor)) return;
    // Otimista e instantâneo. A action é fire-and-forget: se falhar, o tema
    // local já está certo e a conta converge na próxima troca — trocar de cor
    // não merece spinner nem toast de erro.
    setTheme(valor);
    if (persistir) void salvarTema({ tema: valor });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={textos.tema.alternar}>
          {/* Ambos os ícones no DOM, quem escolhe é o CSS: `theme` é undefined
              no primeiro render e ramificar nele causaria hydration mismatch. */}
          <SunIcon className="size-5 dark:hidden" weight="duotone" />
          <MoonIcon className="hidden size-5 dark:block" weight="duotone" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuRadioGroup value={theme} onValueChange={aoEscolher}>
          {OPCOES.map(({ valor, label, Icon }) => (
            <DropdownMenuRadioItem key={valor} value={valor}>
              <Icon className="size-4" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
