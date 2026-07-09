"use client";

import { ArrowLeftIcon, PrinterIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Barra de ações (some na impressão) com Voltar + Imprimir/Salvar PDF. */
export function BotaoImprimir() {
  const router = useRouter();
  return (
    <div className="no-print mx-auto mb-4 flex max-w-[800px] items-center justify-between gap-2 px-4 pt-4">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeftIcon className="size-4" /> Voltar
      </Button>
      <Button size="sm" onClick={() => window.print()}>
        <PrinterIcon className="size-4" /> Imprimir / Salvar PDF
      </Button>
    </div>
  );
}
