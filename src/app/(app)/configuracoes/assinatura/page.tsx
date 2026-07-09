import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ComparativoPlanos } from "@/components/billing/comparativo";
import { PlanoBadge } from "@/components/billing/plano-badge";
import { CancelarButton, PortalButton, ReativarButton } from "@/components/billing/portal-button";
import { UsageBar } from "@/components/billing/uso-barra";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resumoUso } from "@/lib/billing/limites";
import { type PlanId, planoPorId } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/server";
import { textos } from "@/lib/textos";
import { requireTenant } from "@/server/auth";

export const metadata = { title: "Assinatura" };

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export default async function AssinaturaPage() {
  const { tenant } = await requireTenant();
  const plano = planoPorId(tenant.plan);
  const uso = await resumoUso(tenant.id);

  // Lê a subscription local (se houver) para mostrar status real.
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, cancel_at_period_end, trial_end")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  const ehVitalicio = tenant.plan === "vitalicio";
  const ehPago = tenant.plan !== "free" && tenant.plan !== "vitalicio";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {textos.billing.titulo}
        </h1>
        <p className="text-sm text-muted-foreground">{textos.billing.subtitulo}</p>
      </header>

      {/* Aviso de suspensão / past_due / cancelada */}
      {tenant.status === "suspended" && (
        <Alert variant="destructive">
          <AlertTitle>Conta suspensa</AlertTitle>
          <AlertDescription>{textos.billing.aviso.suspensao}</AlertDescription>
        </Alert>
      )}
      {tenant.status === "past_due" && (
        <Alert>
          <AlertTitle>Pagamento pendente</AlertTitle>
          <AlertDescription>{textos.billing.aviso.pastDue}</AlertDescription>
        </Alert>
      )}
      {sub?.cancel_at_period_end && sub.current_period_end && (
        <Alert>
          <AlertTitle>Cancelamento agendado</AlertTitle>
          <AlertDescription>
            {textos.billing.assinaturaTerminaEm(formatarData(sub.current_period_end))}
          </AlertDescription>
        </Alert>
      )}
      {tenant.trial_ends_at && tenant.status === "active" && tenant.plan !== "vitalicio" && (
        <Alert>
          <AlertTitle>Trial ativo</AlertTitle>
          <AlertDescription>
            {textos.billing.trialTerminaEm(formatarData(tenant.trial_ends_at))}
          </AlertDescription>
        </Alert>
      )}

      {/* Card do plano atual */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{textos.billing.planoAtual}</CardTitle>
            <PlanoBadge plan={tenant.plan} />
          </div>
          <CardDescription>{plano.descricao}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {ehVitalicio ? (
            <p className="text-sm text-muted-foreground">{textos.billing.cortesia}</p>
          ) : (
            <>
              {sub?.status && (
                <p className="text-sm text-muted-foreground">
                  Status:{" "}
                  <strong className="text-foreground">
                    {textos.billing.status[sub.status as keyof typeof textos.billing.status] ??
                      sub.status}
                  </strong>
                  {sub.current_period_end && !sub.cancel_at_period_end && (
                    <> · próxima cobrança em {formatarData(sub.current_period_end)}</>
                  )}
                </p>
              )}
              {ehPago && (
                <div className="flex flex-wrap gap-2">
                  <PortalButton />
                  {sub?.cancel_at_period_end ? <ReativarButton /> : <CancelarButton />}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Uso do mês */}
      <Card>
        <CardHeader>
          <CardTitle>Uso neste mês</CardTitle>
          <CardDescription>Limites do plano atual</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <UsageBar label="Alunas ativas" usado={uso.alunos} limite={uso.plano.limiteAlunos} />
          <UsageBar label="Mensagens no chat" usado={uso.chat} limite={uso.plano.limiteChat} />
          <UsageBar
            label="Relatórios de IA"
            usado={uso.relatorios}
            limite={uso.plano.limiteRelatorios}
          />
          <UsageBar
            label="Fotos posturais (vision)"
            usado={uso.vision}
            limite={uso.plano.limiteVision}
          />
        </CardContent>
      </Card>

      {/* Comparativo de planos */}
      {!ehVitalicio && (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-semibold">{textos.billing.compararPlanos}</h2>
          <ComparativoPlanos planoAtual={tenant.plan as PlanId} />
        </section>
      )}
    </div>
  );
}
