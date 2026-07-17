import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { CheckoutButtonPublic } from "@/components/billing/checkout-button-public";
import { SectionHeading } from "@/components/landing/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PLANOS, type PlanId, precoBRLFormatado } from "@/lib/billing/plans";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";

/** Ordem dos planos na landing. Inclui Free em primeiro + os 4 pagos. */
const ORDEM: PlanId[] = ["free", "essencial", "profissional", "clinica", "payg"];

/** Plano com destaque visual (border + ring). */
const PLANO_DESTAQUE: PlanId = "profissional";

export function ComparativoPublic() {
  return (
    <section id="planos" className="bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 lg:px-16">
        <SectionHeading
          eyebrow={textos.landing.planos.eyebrow}
          titulo={textos.landing.planos.titulo}
          subtitulo={textos.landing.planos.subtitulo}
          className="mb-12 sm:mb-16"
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {ORDEM.map((id) => (
            <PlanoCard key={id} id={id} />
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Todos os preços em reais (BRL). Pagamento processado pelo Stripe.
        </p>
      </div>
    </section>
  );
}

function PlanoCard({ id }: { id: PlanId }) {
  const p = PLANOS[id];
  const isDestaque = id === PLANO_DESTAQUE;
  const isFree = id === "free";
  const isPayg = id === "payg";

  return (
    <Card
      className={cn(
        "relative flex h-full flex-col",
        // Card tem overflow-hidden por padrão; o badge "mais popular" vaza pelo topo.
        isDestaque
          ? "overflow-visible border-2 border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/20"
          : "border-border/60",
      )}
    >
      {isDestaque && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="h-auto bg-brand-gradient px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20">
            {textos.landing.planos.badgeMaisPopular}
          </Badge>
        </div>
      )}

      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-xl font-semibold tracking-tight">{p.nome}</h3>
        </div>
        <p className="min-h-[2.5rem] text-sm text-muted-foreground">{p.descricao}</p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Preço */}
        <div className="flex flex-col">
          {isPayg ? (
            <>
              <span className="font-heading text-3xl font-bold tracking-tight">
                {textos.landing.planos.semCobrancaMensal}
              </span>
              <span className="text-xs text-muted-foreground">
                {textos.landing.planos.notaPayg}
              </span>
            </>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-4xl font-bold tracking-tight">
                {p.precoCentavosBRL === 0
                  ? textos.landing.planos.gratis
                  : precoBRLFormatado(p.precoCentavosBRL)}
              </span>
              {p.precoCentavosBRL > 0 && (
                <span className="text-sm text-muted-foreground">
                  {textos.landing.planos.porMes}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Destaques (bullet list) */}
        <ul className="flex-1 space-y-2 border-t border-border/60 pt-4 text-sm">
          {p.destaques.map((d) => (
            <li key={d} className="flex items-start gap-2 leading-snug">
              <CheckCircleIcon
                weight="fill"
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  isDestaque ? "text-primary" : "text-success",
                )}
              />
              <span className="text-foreground/85">{d}</span>
            </li>
          ))}
        </ul>

        {/* Trial */}
        {p.trialDias > 0 && (
          <p className="text-xs text-muted-foreground">
            {textos.landing.planos.trialDias(p.trialDias)}
          </p>
        )}

        {/* CTA */}
        <div className="mt-auto pt-2">
          {isFree ? (
            <Button asChild variant={isDestaque ? "default" : "outline"} className="w-full">
              <a href="/cadastro">{textos.landing.planos.criarGratis}</a>
            </Button>
          ) : isPayg ? (
            <CheckoutButtonPublic
              planId={id}
              label={textos.landing.planos.contratar}
              variant="outline"
              className="w-full"
            />
          ) : (
            <CheckoutButtonPublic
              planId={id}
              label={textos.landing.planos.contratar}
              variant={isDestaque ? "default" : "outline"}
              className={cn("w-full", isDestaque && "shadow-md shadow-primary/20")}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
