"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportarDadosAluno } from "@/server/actions/lgpd";

export function ExportarDadosAluno({ studentId }: { studentId: string }) {
  const [busy, setBusy] = useState(false);

  async function exportar() {
    setBusy(true);
    try {
      const res = await exportarDadosAluno(studentId);
      if (!res.ok) {
        toast.error(res.erro);
        return;
      }
      const blob = new Blob([res.data.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dados-aluno-${studentId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Dados exportados.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={exportar} disabled={busy}>
      <DownloadSimpleIcon className="size-4" />
      {busy ? "Exportando…" : "Exportar dados (LGPD)"}
    </Button>
  );
}
