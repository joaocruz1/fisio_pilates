import "server-only";
import { buildDossie } from "@/lib/ai/dossie";
import type { PlanoAula } from "@/lib/ai/schemas/plano-aula";
import type { Relatorio } from "@/lib/ai/schemas/relatorio";
import type { PinnedItem } from "@/lib/chat-pins";
import { createClient } from "@/lib/supabase/server";

/** Formata um plano de aula (structured) em texto para o contexto do chat. */
function formatarPlano(p: PlanoAula): string {
  const exs = (p.exercicios ?? [])
    .map((e) => {
      const dose = [
        e.series && e.reps ? `${e.series}x${e.reps}` : null,
        e.carga_molas,
        e.nivel ? `nível ${e.nivel}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      const cuidados = e.cuidados?.length ? ` Cuidados: ${e.cuidados.join("; ")}.` : "";
      return `- ${e.nome} (${e.aparelho})${dose ? ` — ${dose}` : ""}. Progressão: ${e.progressao}.${cuidados}`;
    })
    .join("\n");
  return [
    `Foco: ${p.foco}`,
    p.duracao_sugerida_min ? `Duração sugerida: ${p.duracao_sugerida_min} min` : null,
    p.aquecimento ? `Aquecimento: ${p.aquecimento}` : null,
    `Exercícios:\n${exs}`,
    p.avisos_para_sessao?.length ? `Avisos: ${p.avisos_para_sessao.join("; ")}` : null,
    p.justificativa ? `Justificativa: ${p.justificativa}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Formata um relatório de evolução (structured) em texto para o contexto. */
function formatarRelatorio(r: Relatorio): string {
  return [
    `Resumo: ${r.resumo_executivo}`,
    `Progressão de exercícios: ${r.evolucao_pilates?.progressao_exercicios}`,
    `Carga e complexidade: ${r.evolucao_pilates?.carga_e_complexidade}`,
    `Aderência: ${r.evolucao_pilates?.aderencia}`,
    `Medidas e tendências: ${r.evolucao_corporal?.medidas_e_tendencias}`,
    `Dor e queixas: ${r.evolucao_corporal?.dor_e_queixas}`,
    r.pontos_de_atencao?.length ? `Pontos de atenção: ${r.pontos_de_atencao.join("; ")}` : null,
    r.sugestoes_para_proximas_sessoes?.length
      ? `Sugestões: ${r.sugestoes_para_proximas_sessoes.join("; ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Resolve os itens fixados numa conversa em blocos de texto PSEUDONIMIZADOS para
 * injetar no system prompt do chat. Aluno usa buildDossie (sem nome/CPF/etc);
 * plano/relatório já são gerados a partir de dossiês pseudonimizados.
 */
export async function montarContextoFixado(
  tenantId: string,
  pinned: PinnedItem[],
): Promise<string> {
  if (!pinned.length) return "";
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const blocos: string[] = [];
  // Contador por tipo — rótulo NEUTRO no bloco injetado (LGPD: o nome do aluno
  // fica só no chip da UI, nunca é enviado ao modelo).
  let nAluno = 0;
  let nPlano = 0;
  let nRelatorio = 0;

  for (const item of pinned) {
    try {
      if (item.tipo === "aluno") {
        const dossie = await buildDossie({
          tenantId,
          studentId: item.id,
          period: { from: null, to: hoje },
        });
        nAluno += 1;
        blocos.push(
          `<contexto_aluno ref="aluno-${nAluno}">\n${dossie.promptUser}\n</contexto_aluno>`,
        );
      } else if (item.tipo === "plano") {
        const { data } = await supabase
          .from("ai_reports")
          .select("structured, report_type, status")
          .eq("id", item.id)
          .maybeSingle();
        if (data?.report_type === "next_session" && data.status === "completed") {
          const texto = formatarPlano(data.structured as unknown as PlanoAula);
          nPlano += 1;
          blocos.push(`<contexto_plano ref="plano-${nPlano}">\n${texto}\n</contexto_plano>`);
        }
      } else if (item.tipo === "relatorio") {
        const { data } = await supabase
          .from("ai_reports")
          .select("structured, status")
          .eq("id", item.id)
          .maybeSingle();
        if (data?.status === "completed") {
          const texto = formatarRelatorio(data.structured as unknown as Relatorio);
          nRelatorio += 1;
          blocos.push(
            `<contexto_relatorio ref="relatorio-${nRelatorio}">\n${texto}\n</contexto_relatorio>`,
          );
        }
      }
    } catch {
      // um item que falha não deve derrubar o chat inteiro
    }
  }

  return blocos.length
    ? `\n\nO usuário fixou o(s) seguinte(s) contexto(s) a esta conversa. Use-os como base prioritária ao responder:\n\n${blocos.join("\n\n")}`
    : "";
}
