"use client";

import { WarningIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import type { PlanoAulaGrupo } from "@/lib/ai/schemas/plano-aula-grupo";
import { rotuloAparelho } from "@/lib/labels";

export type AlunaDoPlano = { rotulo: string; full_name: string };
export type EstacaoDoPlano = { label: string; apparatus: string };

function detalhe(a: PlanoAulaGrupo["blocos"][number]["atribuicoes"][number]): string {
  const partes = [
    a.series && a.reps ? `${a.series}×${a.reps}` : null,
    a.carga_molas ?? null,
    a.nivel ? `nível ${a.nivel}` : null,
  ].filter(Boolean);
  return partes.join(" · ");
}

/**
 * Board do plano coletivo: linhas = blocos/rodadas, colunas = estações
 * (aparelhos). Cada célula mostra a aluna (nome real, só a profissional vê) +
 * exercício + séries×reps + carga. Responsivo: tabela no desktop, cards no mobile.
 */
export function PlanoColetivoView({
  plano,
  alunos,
  estacoes,
  avisos,
}: {
  plano: PlanoAulaGrupo;
  alunos: AlunaDoPlano[];
  estacoes: EstacaoDoPlano[];
  avisos?: string[];
}) {
  const nomePorRotulo = new Map(alunos.map((a) => [a.rotulo, a.full_name]));
  const blocos = [...plano.blocos].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">{plano.foco}</h2>
          <p className="text-sm text-muted-foreground">
            {plano.duracao_min ? `${plano.duracao_min} min · ` : ""}
            {plano.num_blocos} blocos · {alunos.length} alunas · {estacoes.length} estações
          </p>
        </div>
      </div>

      {avisos?.length ? (
        <div className="flex flex-col gap-1 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
          <p className="flex items-center gap-1.5 font-medium">
            <WarningIcon className="size-4" /> Avisos da rotação
          </p>
          <ul className="list-disc pl-5 text-xs">
            {avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Aquecimento:</span> {plano.aquecimento}
      </p>

      {/* Desktop: tabela blocos × estações */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="w-28 border-b px-3 py-2 text-left font-medium">Bloco</th>
              {estacoes.map((e) => (
                <th key={e.label} className="border-b px-3 py-2 text-left font-medium">
                  <div className="flex flex-col">
                    <span>{e.label}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {rotuloAparelho[e.apparatus as keyof typeof rotuloAparelho] ?? e.apparatus}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {blocos.map((b) => {
              const porEstacao = new Map(b.atribuicoes.map((a) => [a.estacao_rotulo, a]));
              return (
                <tr key={b.ordem} className="border-b last:border-0">
                  <td className="px-3 py-2 align-top font-medium">
                    {b.ordem}
                    {b.duracao_min ? (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {b.duracao_min} min
                      </span>
                    ) : null}
                  </td>
                  {estacoes.map((e) => {
                    const a = porEstacao.get(e.label);
                    if (!a)
                      return (
                        <td key={e.label} className="px-3 py-2 align-top text-muted-foreground/40">
                          —
                        </td>
                      );
                    return (
                      <td key={e.label} className="px-3 py-2 align-top">
                        <p className="font-medium text-foreground">
                          {nomePorRotulo.get(a.aluno_rotulo) ?? a.aluno_rotulo}
                        </p>
                        <p className="text-xs text-muted-foreground">{a.exercicio}</p>
                        {detalhe(a) ? (
                          <p className="text-xs text-muted-foreground/80">{detalhe(a)}</p>
                        ) : null}
                        {a.cuidados.length ? (
                          <p className="mt-1 text-xs text-warning-foreground">
                            ⚠ {a.cuidados.join("; ")}
                          </p>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: um card por bloco */}
      <div className="flex flex-col gap-3 md:hidden">
        {blocos.map((b) => (
          <div key={b.ordem} className="rounded-lg border bg-card p-3 shadow-sm">
            <p className="mb-2 font-medium">
              Bloco {b.ordem}
              {b.duracao_min ? (
                <span className="text-xs font-normal text-muted-foreground">
                  {" "}
                  · {b.duracao_min} min
                </span>
              ) : null}
            </p>
            <ul className="flex flex-col gap-2">
              {b.atribuicoes.map((a) => (
                <li key={a.aluno_rotulo} className="rounded-md bg-muted/30 p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {nomePorRotulo.get(a.aluno_rotulo) ?? a.aluno_rotulo}
                    </span>
                    <Badge variant="info">{a.estacao_rotulo}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {a.exercicio}
                    {detalhe(a) ? ` · ${detalhe(a)}` : ""}
                  </p>
                  {a.cuidados.length ? (
                    <p className="mt-1 text-xs text-warning-foreground">
                      ⚠ {a.cuidados.join("; ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="font-medium">Justificativa</p>
        <p className="mt-1 text-muted-foreground">{plano.justificativa}</p>
      </div>

      {plano.avisos.length ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-warning-foreground">
            <WarningIcon className="size-4" /> Avisos para a aula
          </p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {plano.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{plano.aviso}</p>
    </div>
  );
}
