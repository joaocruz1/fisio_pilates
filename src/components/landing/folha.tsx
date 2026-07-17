"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useId, useState } from "react";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";

const t = textos.landing.evolucao;

/**
 * A folha pendente — a assinatura da página.
 *
 * O diferencial do produto não é "IA": é que nada sai sem assinatura humana.
 * Isso não cabe num card com ícone, então aqui ele é encenado. A visitante
 * recebe um relatório de verdade, em rascunho, com as frases marcadas de onde
 * vieram — e o único jeito de tirá-lo do rascunho é ela assinar. Quem faz isso
 * já entendeu o produto inteiro antes de ler o primeiro bullet.
 *
 * Três decisões que parecem detalhe e não são:
 *
 * - O relatório inteiro está no HTML do primeiro byte. Nada aparece no scroll,
 *   nada espera hidratação. Se ela não rolar a página, já viu o produto; se o
 *   JS não carregar, ela lê o relatório mesmo assim.
 * - Ao assinar, NADA além do estado muda. Se o "depois" fosse mais espetacular
 *   que o "antes", a página estaria dizendo que a protagonista é a IA.
 * - Sem número de CREFITO no selo. Um `CREFITO 000000` de mentira lê como
 *   credencial falsa justamente para a única pessoa que confere isso por
 *   instinto profissional.
 *
 * Importa `textos` direto em vez de receber por prop: é client, o bundle já o
 * teria de qualquer forma, e assim nenhuma função (`seloAssinado`) precisa
 * atravessar a fronteira RSC — o que seria erro de serialização.
 */
export function Folha() {
  const rm = useReducedMotion();
  const [assinado, setAssinado] = useState(false);
  const [hora, setHora] = useState("");
  const [fonteAberta, setFonteAberta] = useState<string | null>(null);
  const baseId = useId();

  function assinar() {
    setHora(
      new Date()
        .toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        .replace(":", "h"),
    );
    setAssinado(true);
    setFonteAberta(null);
  }

  return (
    <div>
      <div
        data-assinado={assinado}
        className={cn(
          "lp-imprime overflow-hidden rounded-lg border bg-lp-folha",
          "border-lp-pendente data-[assinado=true]:border-primary",
          "transition-colors duration-[380ms] motion-reduce:transition-none",
        )}
      >
        <div className="border-b border-lp-fio px-4 py-2.5 sm:px-5">
          <p className="text-xs font-medium text-lp-grafite">{t.cabecalho}</p>
        </div>

        <div className="px-4 py-5 sm:px-5">
          <p className="text-[0.9375rem] leading-[1.65] text-foreground">
            {t.partes.map((parte, i) =>
              "texto" in parte ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: lista estática
                <span key={i}>{parte.texto}</span>
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: lista estática
                <span key={i}>
                  <span
                    data-assinado={assinado}
                    className={cn(
                      "rounded-[3px] bg-lp-marca-texto px-0.5",
                      "data-[assinado=true]:bg-transparent",
                      "transition-colors duration-[380ms] motion-reduce:transition-none",
                    )}
                  >
                    {parte.citado}
                  </span>{" "}
                  <ChipFonte
                    id={`${baseId}-${parte.fonte}`}
                    rotulo={parte.fonte}
                    aberto={fonteAberta === parte.fonte}
                    onToggle={() => setFonteAberta((f) => (f === parte.fonte ? null : parte.fonte))}
                  />
                </span>
              ),
            )}
          </p>

          {t.partes.map((parte) =>
            "citado" in parte ? (
              <Fonte
                key={parte.fonte}
                id={`${baseId}-${parte.fonte}`}
                aberto={fonteAberta === parte.fonte}
                reduzido={!!rm}
                {...t.fontes[parte.fonte as keyof typeof t.fontes]}
              />
            ) : null,
          )}

          {!assinado && <p className="mt-4 text-xs text-lp-grafite">{t.ajuda}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-lp-fio px-4 py-3 sm:px-5">
          <AnimatePresence mode="wait" initial={false}>
            {assinado ? (
              <motion.p
                key="assinado"
                initial={rm ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: rm ? 0 : 0.19 }}
                className="flex items-center gap-1.5 text-xs font-medium text-primary"
              >
                <CheckIcon weight="bold" className="size-3.5 shrink-0" />
                {t.seloAssinado(hora)}
              </motion.p>
            ) : (
              <motion.p
                key="pendente"
                initial={rm ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: rm ? 0 : 0.19 }}
                className="flex items-center gap-2 text-xs font-medium text-foreground"
              >
                <span aria-hidden className="h-3.5 w-[3px] rounded-full bg-lp-pendente" />
                {t.seloPendente}
              </motion.p>
            )}
          </AnimatePresence>

          {assinado ? (
            <button
              type="button"
              onClick={() => setAssinado(false)}
              className="rounded-md px-2 py-2 text-xs text-lp-grafite underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {t.acaoDesfazer}
            </button>
          ) : (
            <button
              type="button"
              onClick={assinar}
              className="inline-flex h-11 items-center rounded-md border border-transparent bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {t.acaoAssinar}
            </button>
          )}
        </div>
      </div>

      {/* O anúncio vive fora do bloco animado: leitor de tela não lê borda. */}
      <span role="status" aria-live="polite" className="sr-only">
        {assinado ? t.anuncioAssinado : ""}
      </span>

      <p className="mt-3 text-[0.8125rem] text-lp-grafite">{t.aviso}</p>
    </div>
  );
}

/** O `[KB-n]`. Inline na prosa, mas com alvo de toque de 44px via ::after. */
function ChipFonte({
  id,
  rotulo,
  aberto,
  onToggle,
}: {
  id: string;
  rotulo: string;
  aberto: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={aberto}
      aria-controls={id}
      aria-label={aberto ? textos.landing.evolucao.fecharFonte : textos.landing.evolucao.verFonte}
      className={cn(
        "relative inline-flex items-center rounded-[3px] border border-lp-fio px-1 align-baseline",
        "text-[0.6875rem] font-medium tabular-nums text-lp-grafite",
        "transition-colors hover:border-lp-pendente hover:bg-lp-marca-texto hover:text-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "aria-expanded:border-lp-pendente aria-expanded:bg-lp-marca-texto aria-expanded:text-foreground",
        // Alvo de toque sem mexer no line-height da prosa.
        "after:absolute after:-inset-y-[0.6rem] after:-inset-x-1 after:content-['']",
      )}
    >
      [{rotulo}]
    </button>
  );
}

/**
 * A origem da frase, aberta inline.
 *
 * `reducedMotion="user"` do MotionConfig neutraliza transform e layout, mas NÃO
 * `height` — por isso o gate explícito na duration. E o ramo é numa duração,
 * nunca na árvore: o HTML do servidor é idêntico ao do cliente.
 */
function Fonte({
  id,
  aberto,
  reduzido,
  arquivo,
  local,
  trecho,
}: {
  id: string;
  aberto: boolean;
  reduzido: boolean;
  arquivo: string;
  local: string;
  trecho: string;
}) {
  return (
    <motion.div
      id={id}
      initial={false}
      animate={{ height: aberto ? "auto" : 0, opacity: aberto ? 1 : 0 }}
      transition={{ duration: reduzido ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
      aria-hidden={!aberto}
    >
      <div className="mt-4 border-l-2 border-lp-pendente pl-3">
        <p className="text-xs font-medium text-foreground">{arquivo}</p>
        <p className="text-xs text-lp-grafite">{local}</p>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-foreground/85">{trecho}</p>
      </div>
    </motion.div>
  );
}
