"use client";

import { UploadSimpleIcon } from "@phosphor-icons/react";
import { GaleriaDocumentos } from "@/components/documentos/galeria-documentos";
import { UploadDocumento } from "@/components/documentos/upload-documento";
import { Button } from "@/components/ui/button";
import type { Document } from "@/server/documents";

/**
 * Anexos de uma avaliação: PDF/Word/imagens vinculados a `assessment_id`.
 * Reusa o fluxo de upload signed-URL (UploadDocumento) e a galeria, repassando
 * o `assessmentId` para as actions gravarem/validarem o vínculo. O conteúdo
 * extraído é ingerido na KB por aluno (RAG) — ver kb-ingest-aluno.ts.
 */
export function AnexosAvaliacao({
  studentId,
  assessmentId,
  documentos,
}: {
  studentId: string;
  assessmentId: string;
  documentos: Document[];
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Anexos da avaliação</h2>
          <p className="text-xs text-muted-foreground">
            PDF ou Word (exames, laudos). O conteúdo é indexado para a IA usar no plano de aula e no
            chat.
          </p>
        </div>
        <UploadDocumento
          studentId={studentId}
          assessmentId={assessmentId}
          defaultKind="exam"
          title="Anexar à avaliação"
          trigger={
            <Button size="sm" variant="outline">
              <UploadSimpleIcon className="size-4" /> Anexar
            </Button>
          }
        />
      </div>
      <GaleriaDocumentos studentId={studentId} documentos={documentos} />
    </section>
  );
}
