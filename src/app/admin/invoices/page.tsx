import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { textos } from "@/lib/textos";
import { listarFaturas } from "@/server/admin";

export const metadata = { title: "Faturas" };

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { rows } = await listarFaturas({ status: sp.status, page: Number(sp.page ?? 0) });
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="font-heading text-2xl font-semibold">{textos.admin.invoices.titulo}</h1>
      </header>
      <form className="flex items-center gap-2" method="get">
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Todas</option>
          <option value="paid">Pagas</option>
          <option value="open">Em aberto</option>
          <option value="void">Canceladas</option>
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
                <th className="p-3">Valor</th>
                <th className="p-3">Status</th>
                <th className="p-3">Emitida</th>
                <th className="p-3">Paga</th>
                <th className="p-3">Stripe</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Nenhuma fatura.
                  </td>
                </tr>
              )}
              {rows.map((i) => {
                const t = i.tenants as unknown as { name?: string };
                return (
                  <tr key={i.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{t?.name ?? "—"}</td>
                    <td className="p-3 font-mono">{formatBRL(i.amount_cents)}</td>
                    <td className="p-3">
                      <Badge variant="outline">{i.status}</Badge>
                    </td>
                    <td className="p-3 text-xs">
                      {format(new Date(i.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="p-3 text-xs">
                      {i.paid_at
                        ? format(new Date(i.paid_at), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </td>
                    <td className="p-3 text-xs">
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
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
