import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { textos } from "@/lib/textos";
import { listarAssinaturas } from "@/server/admin";

export const metadata = { title: "Assinaturas" };

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { rows } = await listarAssinaturas({ status: sp.status, page: Number(sp.page ?? 0) });
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="font-heading text-2xl font-semibold">{textos.admin.subscriptions.titulo}</h1>
      </header>
      <form className="flex items-center gap-2" method="get">
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Todas</option>
          <option value="active">Ativa</option>
          <option value="trialing">Em trial</option>
          <option value="past_due">Past due</option>
          <option value="canceled">Cancelada</option>
          <option value="unpaid">Inadimplente</option>
        </select>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground"
        >
          Filtrar
        </button>
      </form>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Tenant</th>
                <th className="p-3">Plano</th>
                <th className="p-3">Status</th>
                <th className="p-3">Próxima cobrança</th>
                <th className="p-3">Cancela em</th>
                <th className="p-3">Stripe ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Nenhuma assinatura.
                  </td>
                </tr>
              )}
              {rows.map((s) => {
                const t = s.tenants as unknown as { name?: string };
                return (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{t?.name ?? "—"}</td>
                    <td className="p-3">
                      <Badge variant="outline">{s.plan}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge>{s.status}</Badge>
                    </td>
                    <td className="p-3 text-xs">
                      {s.current_period_end
                        ? format(new Date(s.current_period_end), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </td>
                    <td className="p-3 text-xs">
                      {s.canceled_at
                        ? format(new Date(s.canceled_at), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </td>
                    <td className="p-3 font-mono text-xs">{s.stripe_subscription_id}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
