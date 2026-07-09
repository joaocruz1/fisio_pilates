import { CheckoutButton } from "@/components/billing/checkout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANOS, type PlanId, precoBRLFormatado } from "@/lib/billing/plans";
import { textos } from "@/lib/textos";

const ORDEM: PlanId[] = ["essencial", "profissional", "clinica", "payg"];

export function ComparativoPlanos({ planoAtual }: { planoAtual: PlanId }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {ORDEM.map((id) => {
        const p = PLANOS[id];
        const isAtual = planoAtual === id;
        return (
          <Card key={id} className={isAtual ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{p.nome}</CardTitle>
                {isAtual && <Badge>{textos.billing.planoAtual}</Badge>}
              </div>
              <CardDescription>{p.descricao}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <span className="font-heading text-3xl font-bold">
                  {p.precoCentavosBRL === 0 ? "—" : precoBRLFormatado(p.precoCentavosBRL)}
                </span>
                {p.precoCentavosBRL > 0 && (
                  <span className="text-sm text-muted-foreground">{textos.billing.porMes}</span>
                )}
              </div>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {p.destaques.map((d) => (
                  <li key={d} className="flex items-start gap-2">
                    <span className="text-primary">✓</span> {d}
                  </li>
                ))}
              </ul>
              {p.trialDias > 0 && (
                <p className="text-xs text-muted-foreground">
                  {p.trialDias} dias grátis · sem cartão
                </p>
              )}
              <div className="mt-2">
                {isAtual ? (
                  <Button disabled variant="outline" className="w-full">
                    {textos.billing.planoAtual}
                  </Button>
                ) : (
                  <CheckoutButton planId={id} label={textos.billing.assinar} className="w-full" />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
