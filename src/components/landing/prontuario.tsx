import { ArrowRightIcon, BarbellIcon } from "@phosphor-icons/react/dist/ssr";
import { Janela } from "@/components/landing/mockups";
import { CabecalhoSecao, Secao } from "@/components/landing/secao";
import { Reveal } from "@/components/motion";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";

const t = textos.landing.prontuario;

/**
 * "A avaliação" — o que a fisioterapeuta digita, e a aferição que o produto faz.
 *
 * Uma ficha de sessão real, com o vernáculo dela (reformer, molas por cor,
 * footwork 3×10) e a escala EVA de dor antes/depois. A EVA é a única aferição
 * literal do produto — um corpo medido de 0 a 10 — e é o clímax da seção, com
 * dado real em vez de foto de banco.
 */
export function Prontuario() {
  return (
    <Secao id="avaliacao" superficie>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <CabecalhoSecao eyebrow={t.campo} titulo={t.h2} sub={t.sub} />

        <Reveal delay={0.1}>
          <Janela titulo={t.cabecalho}>
            <dl className="divide-y divide-border/60">
              {t.ficha.map((linha) => (
                <div
                  key={linha.rotulo}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <dt className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    <BarbellIcon weight="duotone" className="size-4 text-primary/70" />
                    {linha.rotulo}
                  </dt>
                  <dd className="text-sm font-medium tabular-nums text-foreground">
                    {linha.valor}
                  </dd>
                </div>
              ))}

              <div className="space-y-4 px-5 py-5">
                <Eva rotulo={t.dorAntes} valor={6} />
                <div className="flex items-center gap-2 pl-1 text-xs font-medium text-success">
                  <ArrowRightIcon weight="bold" className="size-3.5 rotate-90" />
                  caiu 3 pontos
                </div>
                <Eva rotulo={t.dorDepois} valor={3} destaque />
              </div>
            </dl>

            <p className="border-t border-border/60 bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
              {t.remate}
            </p>
          </Janela>
        </Reveal>
      </div>
    </Secao>
  );
}

/** Escala EVA: 10 entalhes, os preenchidos são a dor. Estática — leitura, não brinquedo. */
function Eva({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {rotulo}
      </span>
      <span className="flex items-center gap-3">
        <span
          className="flex items-center gap-[3px]"
          role="img"
          aria-label={textos.landing.prontuario.eva(valor)}
        >
          {Array.from({ length: 10 }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: escala fixa de 0 a 10
              key={i}
              aria-hidden
              className={cn(
                "h-4 w-1 rounded-full",
                i < valor ? (destaque ? "bg-success" : "bg-foreground") : "bg-border",
              )}
            />
          ))}
        </span>
        <span
          className={cn(
            "w-4 text-right text-sm font-semibold tabular-nums",
            destaque ? "text-success" : "text-foreground",
          )}
        >
          {valor}
        </span>
      </span>
    </div>
  );
}
