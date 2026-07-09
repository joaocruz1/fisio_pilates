"use client";

import {
  BooksIcon,
  CalendarDotsIcon,
  ChatCircleIcon,
  SparkleIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useTour } from "@/components/tour/tour-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { concluirTour } from "@/server/actions/tour";

const DESTAQUES = [
  { icon: UsersIcon, texto: "Alunos, avaliações e evolução" },
  { icon: CalendarDotsIcon, texto: "Agenda de aulas conectada" },
  { icon: ChatCircleIcon, texto: "Assistente de IA com a sua base" },
  { icon: BooksIcon, texto: "Base de conhecimento própria" },
];

/**
 * Boas-vindas mostradas na primeira vez (tourPending). "Fazer o tour" inicia o
 * passeio; "Explorar sozinha" marca como visto para não incomodar de novo.
 */
export function WelcomeOnboarding({ nome, pending }: { nome: string; pending: boolean }) {
  const { start } = useTour();
  const [open, setOpen] = useState(pending);
  const primeiro = nome.trim().split(" ")[0] || "";

  function fazerTour() {
    setOpen(false);
    start();
  }

  function explorar() {
    setOpen(false);
    void concluirTour();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && explorar()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="flex flex-col items-center gap-2 bg-brand-gradient px-6 py-7 text-center text-primary-foreground">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
            <SparkleIcon className="size-6" weight="fill" />
          </span>
          <h2 className="font-heading text-xl font-semibold">
            {primeiro ? `Bem-vinda, ${primeiro}!` : "Bem-vinda!"}
          </h2>
          <p className="text-sm text-primary-foreground/90">
            Vou te mostrar, em poucos minutos, como usar cada parte do FisioPilates.
          </p>
        </div>

        <div className="flex flex-col gap-3 p-6">
          <ul className="flex flex-col gap-2">
            {DESTAQUES.map(({ icon: Icon, texto }) => (
              <li key={texto} className="flex items-center gap-2.5 text-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" weight="fill" />
                </span>
                {texto}
              </li>
            ))}
          </ul>

          <div className="mt-2 flex flex-col gap-2">
            <Button size="lg" onClick={fazerTour}>
              <SparkleIcon className="size-4" weight="fill" /> Fazer o tour guiado
            </Button>
            <Button size="lg" variant="ghost" onClick={explorar}>
              Explorar sozinha
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Você pode refazer o tour quando quiser na aba <strong>Ajuda</strong>.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
