"use client";

import { FloppyDiskIcon, PencilSimpleIcon, XIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { AlunaDoPlano, EstacaoDoPlano } from "@/components/turmas/plano-coletivo-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PlanoAulaGrupo } from "@/lib/ai/schemas/plano-aula-grupo";
import { rotuloAparelho } from "@/lib/labels";
import { salvarPlanoColetivo } from "@/server/actions/turmas";

type Atribuicao = PlanoAulaGrupo["blocos"][number]["atribuicoes"][number];

/** Clona profundamente o plano para o rascunho de edição. */
function clonar(plano: PlanoAulaGrupo): PlanoAulaGrupo {
  return {
    ...plano,
    blocos: plano.blocos.map((b) => ({
      ...b,
      atribuicoes: b.atribuicoes.map((a) => ({ ...a, cuidados: [...a.cuidados] })),
    })),
    avisos: [...plano.avisos],
  };
}

function AtribuicaoEditor({
  a,
  onChange,
}: {
  a: Atribuicao;
  onChange: (patch: Partial<Atribuicao>) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Input
        aria-label="Exercício"
        value={a.exercicio}
        onChange={(e) => onChange({ exercicio: e.target.value })}
        className="h-8 text-xs"
      />
      <div className="grid grid-cols-3 gap-1">
        <Input
          aria-label="Séries"
          type="number"
          value={a.series ?? ""}
          onChange={(e) =>
            onChange({ series: e.target.value === "" ? null : Number(e.target.value) })
          }
          className="h-8 text-xs"
          placeholder="Séries"
        />
        <Input
          aria-label="Reps"
          type="number"
          value={a.reps ?? ""}
          onChange={(e) =>
            onChange({ reps: e.target.value === "" ? null : Number(e.target.value) })
          }
          className="h-8 text-xs"
          placeholder="Reps"
        />
        <Input
          aria-label="Nível"
          type="number"
          min={1}
          max={5}
          value={a.nivel ?? ""}
          onChange={(e) =>
            onChange({ nivel: e.target.value === "" ? null : Number(e.target.value) })
          }
          className="h-8 text-xs"
          placeholder="Nível"
        />
      </div>
      <Input
        aria-label="Carga/molas"
        value={a.carga_molas ?? ""}
        onChange={(e) => onChange({ carga_molas: e.target.value || null })}
        className="h-8 text-xs"
        placeholder="Carga/molas"
      />
      <Input
        aria-label="Cuidados (separe por vírgula)"
        value={a.cuidados.join(", ")}
        onChange={(e) =>
          onChange({
            cuidados: e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
        className="h-8 text-xs"
        placeholder="Cuidados (vírgula)"
      />
    </div>
  );
}

/**
 * Editor inline do plano coletivo: mesma estrutura do board (linhas=blocos ×
 * colunas=estações), mas com campos editáveis. Salva via `salvarPlanoColetivo`
 * (valida rotação em modo aviso, não bloqueia). O campo `aviso` (LGPD) é
 * preservado do plano original.
 */
export function PlanoColetivoEditor({
  reportId,
  plano,
  alunos,
  estacoes,
  onCancel,
}: {
  reportId: string;
  plano: PlanoAulaGrupo;
  alunos: AlunaDoPlano[];
  estacoes: EstacaoDoPlano[];
  onCancel: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<PlanoAulaGrupo>(() => clonar(plano));
  const [salvando, setSalvando] = useState(false);

  const nomePorRotulo = new Map(alunos.map((a) => [a.rotulo, a.full_name]));
  const blocos = [...draft.blocos].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  function patchPlano(patch: Partial<PlanoAulaGrupo>) {
    setDraft((d) => ({ ...d, ...patch }));
  }
  function patchBloco(bi: number, patch: Partial<PlanoAulaGrupo["blocos"][number]>) {
    setDraft((d) => {
      const copia = clonar(d);
      Object.assign(copia.blocos[bi], patch);
      return copia;
    });
  }
  function patchAttr(bi: number, estacaoRotulo: string, patch: Partial<Atribuicao>) {
    setDraft((d) => {
      const copia = clonar(d);
      const attr = copia.blocos[bi].atribuicoes.find((x) => x.estacao_rotulo === estacaoRotulo);
      if (attr) Object.assign(attr, patch);
      return copia;
    });
  }

  async function salvar() {
    setSalvando(true);
    try {
      const res = await salvarPlanoColetivo(reportId, draft);
      if (res.ok) {
        toast.success("Plano atualizado.");
        if (res.data.avisos.length) toast.warning(`Avisos: ${res.data.avisos.join(" ")}`);
        router.refresh();
        onCancel();
      } else {
        toast.error(res.erro);
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <PencilSimpleIcon className="size-4" /> Editando o plano
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={salvando}>
            <XIcon className="size-4" /> Cancelar
          </Button>
          <Button size="sm" onClick={salvar} disabled={salvando}>
            <FloppyDiskIcon className="size-4" /> {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1 text-sm">
          <label htmlFor="plano-foco" className="font-medium">
            Foco
          </label>
          <Input
            id="plano-foco"
            value={draft.foco}
            onChange={(e) => patchPlano({ foco: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <label htmlFor="plano-duracao" className="font-medium">
            Duração (min)
          </label>
          <Input
            id="plano-duracao"
            type="number"
            value={draft.duracao_min ?? ""}
            onChange={(e) =>
              patchPlano({ duracao_min: e.target.value === "" ? null : Number(e.target.value) })
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <label htmlFor="plano-aquecimento" className="font-medium">
          Aquecimento
        </label>
        <Textarea
          id="plano-aquecimento"
          rows={2}
          value={draft.aquecimento}
          onChange={(e) => patchPlano({ aquecimento: e.target.value })}
        />
      </div>

      {/* Desktop: tabela editável */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="w-24 border-b px-3 py-2 text-left font-medium">Bloco</th>
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
            {blocos.map((b, bi) => {
              const porEstacao = new Map(b.atribuicoes.map((a) => [a.estacao_rotulo, a]));
              return (
                <tr key={b.ordem} className="border-b align-top last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-medium">{b.ordem}</p>
                    <Input
                      type="number"
                      aria-label="Duração do bloco"
                      value={b.duracao_min ?? ""}
                      onChange={(e) =>
                        patchBloco(bi, {
                          duracao_min: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      className="mt-1 h-8 w-20 text-xs"
                      placeholder="min"
                    />
                  </td>
                  {estacoes.map((e) => {
                    const a = porEstacao.get(e.label);
                    if (!a)
                      return (
                        <td key={e.label} className="px-3 py-2 text-muted-foreground/40">
                          —
                        </td>
                      );
                    return (
                      <td key={e.label} className="px-3 py-2">
                        <p className="mb-1 text-xs font-medium text-foreground">
                          {nomePorRotulo.get(a.aluno_rotulo) ?? a.aluno_rotulo}
                        </p>
                        <AtribuicaoEditor
                          a={a}
                          onChange={(patch) => patchAttr(bi, e.label, patch)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards por bloco */}
      <div className="flex flex-col gap-3 md:hidden">
        {blocos.map((b, bi) => {
          const porEstacao = new Map(b.atribuicoes.map((a) => [a.estacao_rotulo, a]));
          return (
            <div key={b.ordem} className="rounded-lg border bg-card p-3 shadow-sm">
              <div className="mb-2 font-medium">
                Bloco {b.ordem}
                <Input
                  type="number"
                  aria-label="Duração do bloco"
                  value={b.duracao_min ?? ""}
                  onChange={(e) =>
                    patchBloco(bi, {
                      duracao_min: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="mt-1 h-8 w-24 text-xs"
                  placeholder="min"
                />
              </div>
              <div className="flex flex-col gap-3">
                {estacoes.map((e) => {
                  const a = porEstacao.get(e.label);
                  if (!a) return null;
                  return (
                    <div key={e.label} className="rounded-md bg-muted/30 p-2">
                      <p className="mb-1 text-xs font-medium">
                        {e.label} · {nomePorRotulo.get(a.aluno_rotulo) ?? a.aluno_rotulo}
                      </p>
                      <AtribuicaoEditor a={a} onChange={(patch) => patchAttr(bi, e.label, patch)} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <label htmlFor="plano-justificativa" className="font-medium">
          Justificativa
        </label>
        <Textarea
          id="plano-justificativa"
          rows={3}
          value={draft.justificativa}
          onChange={(e) => patchPlano({ justificativa: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <label htmlFor="plano-avisos" className="font-medium">
          Avisos para a aula (separe por vírgula)
        </label>
        <Textarea
          id="plano-avisos"
          rows={2}
          value={draft.avisos.join("\n")}
          onChange={(e) =>
            patchPlano({
              avisos: e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
    </div>
  );
}
