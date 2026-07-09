/**
 * Nível/qualidade de uma base de conhecimento a partir da cobertura: número de
 * materiais prontos e de trechos indexados. Pura (usável no client). O sinal
 * dominante são os trechos (volume real de conteúdo pesquisável).
 */
export type NivelBase = {
  rotulo: "Vazia" | "Iniciante" | "Boa" | "Rica" | "Completa";
  /** 0–100 para a barra/medidor. */
  indice: number;
  /** Dica do que falta para o próximo nível (null quando já é "Completa"). */
  proximo: string | null;
};

type Faixa = {
  rotulo: NivelBase["rotulo"];
  min: number; // mínimo de trechos (inclusivo)
  base: number; // índice no início da faixa
  span: number; // largura de índice da faixa
  ate: number; // trechos que fecham a faixa (para interpolar)
};

// Faixas por nº de trechos indexados.
const FAIXAS: Faixa[] = [
  { rotulo: "Iniciante", min: 1, ate: 30, base: 8, span: 22 },
  { rotulo: "Boa", min: 31, ate: 120, base: 30, span: 25 },
  { rotulo: "Rica", min: 121, ate: 350, base: 55, span: 25 },
  { rotulo: "Completa", min: 351, ate: 900, base: 80, span: 20 },
];

export function nivelDaBase({ docs, chunks }: { docs: number; chunks: number }): NivelBase {
  if (chunks <= 0) {
    return { rotulo: "Vazia", indice: 0, proximo: "Adicione o primeiro material para começar." };
  }

  const faixa = [...FAIXAS].reverse().find((f) => chunks >= f.min) ?? FAIXAS[0];
  const fim = faixa.rotulo === "Completa" ? faixa.ate : faixa.ate + 1;
  const prog = Math.min(1, (chunks - faixa.min) / Math.max(1, fim - faixa.min));
  const indice = Math.round(Math.min(100, faixa.base + prog * faixa.span));

  let proximo: string | null = null;
  if (faixa.rotulo !== "Completa") {
    const alvo = faixa.ate + 1;
    const faltam = Math.max(0, alvo - chunks);
    const prox = FAIXAS[FAIXAS.indexOf(faixa) + 1]?.rotulo;
    proximo =
      faltam > 0
        ? `Faltam ~${faltam} trechos para o nível “${prox}”.`
        : `Quase no nível “${prox}”.`;
  }

  // Reforço leve pela diversidade de materiais (mais documentos = mais temas).
  const bonus = Math.min(6, Math.max(0, docs - 1));
  return { rotulo: faixa.rotulo, indice: Math.min(100, indice + bonus), proximo };
}
