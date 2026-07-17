"use client";

import {
  DesktopIcon,
  GearIcon,
  MoonIcon,
  SignOutIcon,
  SunIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { textos } from "@/lib/textos";
import { TEMAS, type Tema } from "@/lib/validators/tema";
import { signOut } from "@/server/actions/auth";
import { salvarTema } from "@/server/actions/tema";

const OPCOES_TEMA: { valor: Tema; label: string; Icon: typeof SunIcon }[] = [
  { valor: "light", label: textos.tema.claro, Icon: SunIcon },
  { valor: "dark", label: textos.tema.escuro, Icon: MoonIcon },
  { valor: "system", label: textos.tema.sistema, Icon: DesktopIcon },
];

/** Submenu de tema. Inline aqui (em vez do ThemeToggle) porque dentro de um
 *  dropdown o padrão é um sub, não outro trigger aninhado. */
function TemaSubmenu() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <SunIcon className="size-4 dark:hidden" />
        <MoonIcon className="hidden size-4 dark:block" />
        {textos.tema.rotulo}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(v) => {
            if (!(TEMAS as readonly string[]).includes(v)) return;
            setTheme(v);
            void salvarTema({ tema: v as Tema });
          }}
        >
          {OPCOES_TEMA.map(({ valor, label, Icon }) => (
            <DropdownMenuRadioItem key={valor} value={valor}>
              <Icon className="size-4" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

export function UserMenu({ userName }: { userName: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <UserCircleIcon className="size-5" weight="duotone" />
          <span className="max-w-[12ch] truncate">{userName || "Minha conta"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate">{userName || "Minha conta"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/configuracoes">
            <GearIcon className="size-4" />
            Configurações
          </Link>
        </DropdownMenuItem>
        <TemaSubmenu />
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild variant="destructive">
          <form action={signOut}>
            <button type="submit" className="flex w-full items-center gap-2">
              <SignOutIcon className="size-4" />
              Sair
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
