import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AjustarCotaButton,
  ReativarButton,
  SuspenderButton,
} from "@/components/admin/tenant-actions";
import { PlanoBadge } from "@/components/billing/plano-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obterTenantDetalhe } from "@/server/admin";

export const metadata = { title: "Tenant" };

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export default async function TenantDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await obterTenantDetalhe(id);
  if (!data) notFound();
  const { tenant, subscription, invoices, members, profiles } = data;
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="w-fit text-muted-foreground">
        <Link href="/admin/tenants">
          <ArrowLeftIcon className="size-4" /> Voltar
        </Link>
      </Button>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-semibold">{tenant.name}</h1>
        <PlanoBadge plan={tenant.plan} />
        <Badge variant="outline">{tenant.status}</Badge>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plano &amp; assinatura</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p>
              Plano atual: <strong>{tenant.plan}</strong>
            </p>
            <p>
              Status financeiro: <strong>{tenant.status}</strong>
            </p>
            {subscription && (
              <>
                <p>
                  Status Stripe: <strong>{subscription.status}</strong>
                </p>
                <p>Próxima cobrança: {formatDate(subscription.current_period_end)}</p>
                {subscription.cancel_at_period_end && (
                  <Badge variant="destructive">Cancelamento agendado</Badge>
                )}
                <p className="text-xs text-muted-foreground">
                  stripe_sub: {subscription.stripe_subscription_id}
                </p>
              </>
            )}
            <p>
              Cota IA (USD/mês): <strong>${tenant.ai_monthly_limit_usd.toFixed(2)}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              stripe_customer: {tenant.stripe_customer_id ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Membros</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {members.map((m) => {
              const p = profileById.get(m.user_id);
              return (
                <div key={m.user_id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{p?.email ?? m.user_id}</div>
                  </div>
                  <Badge variant="outline">{m.role}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ações</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {tenant.status === "suspended" ? (
            <ReativarButton tenantId={tenant.id} nome={tenant.name} />
          ) : (
            <SuspenderButton tenantId={tenant.id} nome={tenant.name} />
          )}
          <AjustarCotaButton tenantId={tenant.id} atual={tenant.ai_monthly_limit_usd} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Faturas (últimas 20)</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem faturas registradas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">Valor</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Pago em</th>
                  <th className="p-2">Stripe</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="border-b last:border-0">
                    <td className="p-2 font-mono">{formatBRL(i.amount_cents)}</td>
                    <td className="p-2">
                      <Badge variant="outline">{i.status}</Badge>
                    </td>
                    <td className="p-2 text-xs">{formatDate(i.paid_at)}</td>
                    <td className="p-2">
                      {i.hosted_invoice_url ? (
                        <a
                          className="text-primary underline"
                          href={i.hosted_invoice_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          ver
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
