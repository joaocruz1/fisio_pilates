import "server-only";
import { generateText } from "ai";
import { MODELS, openrouter } from "@/lib/ai/client";
import { suportaFeature } from "@/lib/ai/modelos";
import { getModeloParaFeature } from "@/lib/ai/preferencias";
import { logUsage } from "@/lib/ai/usage";

const PROMPT =
  "Transcreva fielmente TODO o conteúdo textual desta ficha/registro de aula de fisioterapia/Pilates " +
  "(anotações, exercícios, séries, cargas/molas, observações, datas). Preserve listas e valores. " +
  "Se algo estiver ilegível, escreva [ilegível]. Responda apenas com a transcrição, sem comentários.";

/**
 * Transcreve imagem ou PDF escaneado via visão da IA.
 * O modelo é resolvido pela preferência `vision` da usuária (Gemini Flash
 * por padrão, ou Sonnet 5 em alta precisão). Se a preferência apontar para
 * um modelo que não suporta vision, cai pro MODELS.main() com warning.
 *
 * Retorna null em falha.
 */
export async function transcreverArquivo(opts: {
  bytes: Uint8Array;
  mimeType: string;
  tenantId: string;
  userId: string | null;
}): Promise<string | null> {
  try {
    const provider = openrouter();
    const parte =
      opts.mimeType === "application/pdf"
        ? { type: "file" as const, data: opts.bytes, mediaType: "application/pdf" }
        : { type: "image" as const, image: opts.bytes };

    let modelo = MODELS.vision();
    if (opts.userId) {
      modelo = await getModeloParaFeature(opts.userId, "vision");
      if (!suportaFeature(modelo, "vision")) {
        console.warn(
          `[transcribe] modelo ${modelo} não suporta vision; caindo para MODELS.main()`,
          { userId: opts.userId, tenantId: opts.tenantId },
        );
        modelo = MODELS.main();
      }
    }

    const { text, usage } = await generateText({
      model: provider.chat(modelo),
      messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, parte] }],
      maxOutputTokens: 4000,
      abortSignal: AbortSignal.timeout(90_000),
    });

    await logUsage({
      tenantId: opts.tenantId,
      userId: opts.userId,
      kind: "vision",
      model: modelo,
      usage,
      metadata: { feature: "transcribe", mimeType: opts.mimeType },
    });

    const t = text.trim();
    if (t.length <= 10) {
      console.warn(
        `[transcribe] modelo retornou texto vazio/curto para ${opts.mimeType} (${t.length} chars).`,
      );
      return null;
    }
    return t.slice(0, 100_000);
  } catch (e) {
    console.error(
      `[transcribe] falha ao transcrever ${opts.mimeType} via visão da IA:`,
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}
