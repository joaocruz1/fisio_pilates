import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { ragSearch } from "@/lib/ai/rag";
import { buscarWeb } from "@/lib/ai/tavily";
import { linksVideoExercicio } from "@/lib/exercicio-videos";
import { getStudentSnapshot } from "@/server/students";

export type Citacao = { tipo: "kb" | "web"; rotulo: string; ref: string };

/** Tools do chat. `citations` é preenchido durante a execução para persistir as fontes. */
export function buildChatTools({
  tenantId,
  citations,
}: {
  tenantId: string;
  citations: Citacao[];
}) {
  return {
    buscar_conhecimento: tool({
      description:
        "Busca na base de conhecimento de Pilates/fisioterapia da plataforma. Use SEMPRE que a pergunta envolver técnica, indicação/contraindicação de exercício, patologia ou princípios do método.",
      inputSchema: z.object({
        consulta: z.string().describe("Pergunta reformulada para busca semântica"),
      }),
      execute: async ({ consulta }) => {
        const { kbChunks, webResults } = await ragSearch(consulta, { tenantId, k: 6 });
        for (const c of kbChunks) {
          citations.push({
            tipo: "kb",
            rotulo: `KB-${citations.length + 1}`,
            ref: c.context_header ?? `trecho ${c.id}`,
          });
        }
        return {
          trechos: kbChunks.map((c) => ({ fonte: c.context_header, texto: c.content })),
          web: webResults.map((w) => ({ titulo: w.title, url: w.url, texto: w.content })),
        };
      },
    }),

    buscar_ficha_aluno: tool({
      description:
        "Busca dados de um aluno da própria profissional (ficha, últimas aulas, medidas).",
      inputSchema: z.object({ nomeOuId: z.string() }),
      execute: async ({ nomeOuId }) => ({ ficha: await getStudentSnapshot({ nomeOuId }) }),
    }),

    buscar_web: tool({
      description:
        "Busca na web (Tavily) em fontes técnicas. Use APENAS quando buscar_conhecimento não retornar conteúdo suficiente, e informe à usuária que a fonte é externa.",
      inputSchema: z.object({ consulta: z.string() }),
      execute: async ({ consulta }) => {
        const web = await buscarWeb(consulta);
        for (const w of web) {
          citations.push({ tipo: "web", rotulo: `WEB-${citations.length + 1}`, ref: w.url });
        }
        return { resultados: web.map((w) => ({ titulo: w.title, url: w.url, texto: w.content })) };
      },
    }),

    buscar_video_exercicio: tool({
      description:
        "Retorna links de vídeo (YouTube e TikTok) de um exercício de Pilates. Use quando a profissional pedir vídeo, demonstração ou 'como fazer' um exercício. Responda com os links em Markdown.",
      inputSchema: z.object({
        nome: z.string().describe("Nome do exercício, ex.: 'Cat Stretch', 'The Hundred'"),
      }),
      execute: async ({ nome }) => {
        const { youtubeSearch, tiktokSearch } = linksVideoExercicio(nome);
        return { nome, youtube: youtubeSearch, tiktok: tiktokSearch };
      },
    }),
  };
}
