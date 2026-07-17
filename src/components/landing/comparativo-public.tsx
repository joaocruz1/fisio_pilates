import { CheckIcon } from "@phosphor-icons/react/dist/ssr";
import { CheckoutButtonPublic } from "@/components/billing/checkout-button-public";
import { CabecalhoSecao, Secao } from "@/components/landing/secao";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { PLANOS, type PlanId, precoBRLFormatado } from "@/lib/billing/plans";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";

const t = textos.landing.planos;

/** Ordem dos planos na landing. Inclui Free em primeiro + os 4 pagos. */
const ORDEM: PlanId[] = ["free", "essencial", "profissional", "clinica", "payg"];
const PLANO_DESTAQUE: PlanId = "profissional";

/**
 * Preços. PLANOS, precoBRLFormatado e CheckoutButtonPublic seguem intactos — é
 * dinheiro, não se mexe de graça. O que mudou é a apresentação: cards com
 * profundidade, o popular em destaque com anel da marca.
 */
export function ComparativoPublic() {
  return (
    <Secao id="planos" superficie>
      <CabecalhoSecao eyebrow={t.campo} titulo={t.titulo} sub={t.subtitulo} centrado />

      <div className="mt-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {ORDEM.map((id, i) => (
          <Reveal key={id} delay={i * 0.05} className="flex">
            <PlanoCard id={id} />
          </Reveal>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">{t.notaPreco}</p>
    </Secao>
  );
}

function PlanoCard({ id }: { id: PlanId }) {
  const p = PLANOS[id];
  const isDestaque = id === PLANO_DESTAQUE;
  const isFree = id === "free";
  const isPayg = id === "payg";

  return (
    <div
      className={cn(
        "relative flex w-full flex-col rounded-2xl border bg-card p-5 transition-all duration-200",
        isDestaque
          ? "border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/20 xl:-my-2 xl:py-7"
          : "border-border/70 shadow-sm hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg",
      )}
    >
      {isDestaque && (
        <span className="absolute -top-3 left-5 rounded-full bg-brand-gradient px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-wide text-primary-foreground shadow-md shadow-primary/25">
          {t.badgeMaisPopular}
        </span>
      )}

      <h3 className="font-lp text-lg font-semibold tracking-tight">{p.nome}</h3>
      <p className="mt-1.5 min-h-[2.5rem] text-xs leading-relaxed text-muted-foreground">
        {p.descricao}
      </p>

      <div className="mt-4 flex items-baseline gap-1">
        {isPayg ? (
          <span className="font-lp text-xl font-semibold tracking-tight">
            {t.semCobrancaMensal}
          </span>
        ) : (
          <>
            <span className="font-lp text-3xl font-semibold tabular-nums tracking-tight">
              {p.precoCentavosBRL === 0 ? t.gratis : precoBRLFormatado(p.precoCentavosBRL)}
            </span>
            {p.precoCentavosBRL > 0 && (
              <span className="text-sm text-muted-foreground">{t.porMes}</span>
            )}
          </>
        )}
      </div>
      {isPayg && <span className="text-xs text-muted-foreground">{t.notaPayg}</span>}

      <ul className="mt-5 flex-1 space-y-2.5 border-t border-border/60 pt-5 text-xs">
        {p.destaques.map((d) => (
          <li key={d} className="flex items-start gap-2 leading-snug">
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                isDestaque ? "bg-primary/15 text-primary" : "bg-success/15 text-success",
              )}
            >
              <CheckIcon weight="bold" className="size-2.5" />
            </span>
            <span className="text-foreground/85">{d}</span>
          </li>
        ))}
      </ul>

      {p.trialDias > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">{t.trialDias(p.trialDias)}</p>
      )}

      <div className="mt-5">
        {isFree ? (
          <Button asChild variant={isDestaque ? "default" : "outline"} className="h-10 w-full">
            <a href="/cadastro">{t.criarGratis}</a>
          </Button>
        ) : (
          <CheckoutButtonPublic
            planId={id}
            label={t.contratar}
            variant={isDestaque ? "default" : "outline"}
            className="h-10 w-full"
          />
        )}
      </div>
    </div>
  );
}
