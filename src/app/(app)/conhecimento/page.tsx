import { ListaMateriais } from "@/components/conhecimento/lista-materiais";
import { NivelBaseCard } from "@/components/conhecimento/nivel-base";
import { UploadMaterial } from "@/components/conhecimento/upload-material";
import { PageHeader } from "@/components/shared/page-header";
import { getKbStats, listKbDocuments } from "@/server/knowledge";

export const metadata = { title: "Base de Conhecimento" };

export default async function ConhecimentoPage() {
  const [documentos, stats] = await Promise.all([listKbDocuments(), getKbStats()]);

  return (
    <>
      <PageHeader
        title="Base de Conhecimento"
        description="A base do sistema + a sua base própria. Tudo é mesclado para embasar a IA."
      >
        <span data-tour="kb-add">
          <UploadMaterial />
        </span>
      </PageHeader>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div data-tour="kb-niveis" className="flex flex-col gap-3 sm:flex-row">
          <NivelBaseCard
            titulo="Base do sistema"
            descricao="Conteúdo clínico curado pela plataforma"
            stats={stats.sistema}
          />
          <NivelBaseCard
            titulo="Sua base"
            descricao="Materiais e links que você adicionar"
            stats={stats.tenant}
            destaque
            vazioDica="Adicione arquivos (PDF, Word, texto, imagem) ou links dos seus cursos e protocolos. Eles entram no RAG junto com a base do sistema — e o seu material tem prioridade quando for relevante."
          />
        </div>

        <p className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
          Envie apenas materiais de Pilates e fisioterapia que você possui legalmente. Eles são
          processados e usados como referência técnica pela IA — nunca ficam visíveis para os
          alunos.
        </p>
        <ListaMateriais documentos={documentos} />
      </div>
    </>
  );
}
