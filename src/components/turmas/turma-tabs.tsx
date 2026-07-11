"use client";

import { TurmaAlunos } from "@/components/turmas/turma-alunos";
import { TurmaForm } from "@/components/turmas/turma-form";
import { TurmaSessoes } from "@/components/turmas/turma-sessoes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AlunoDaTurma, ClassSession, Turma } from "@/server/turmas";

export function TurmaDetalhe({
  turma,
  alunos,
  disponiveis,
  sessoes,
}: {
  turma: Turma;
  alunos: AlunoDaTurma[];
  disponiveis: { id: string; full_name: string }[];
  sessoes: ClassSession[];
}) {
  return (
    <Tabs defaultValue="dados" className="gap-4">
      <TabsList>
        <TabsTrigger value="dados">Dados</TabsTrigger>
        <TabsTrigger value="alunas">Alunas ({alunos.length})</TabsTrigger>
        <TabsTrigger value="aulas">Aulas</TabsTrigger>
      </TabsList>

      <TabsContent value="dados" className="mx-auto w-full max-w-2xl">
        <TurmaForm turma={turma} />
      </TabsContent>

      <TabsContent value="alunas" className="mx-auto w-full max-w-2xl">
        <TurmaAlunos classGroupId={turma.id} alunosNaTurma={alunos} disponiveis={disponiveis} />
      </TabsContent>

      <TabsContent value="aulas">
        <TurmaSessoes
          classGroupId={turma.id}
          sessoes={sessoes}
          defaultDurationMin={turma.default_duration_min}
        />
      </TabsContent>
    </Tabs>
  );
}
