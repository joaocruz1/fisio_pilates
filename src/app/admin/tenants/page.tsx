import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { PlanoBadge } from "@/components/billing/plano-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { textos } from "@/lib/textos";
import { listarTenants } from "@/server/admin";

export const metadata = { title: "Tenants" };

const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  past_due: "destructive",
  suspended: "destructive",
  deleted: "outline",
};

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; status?: string; plan?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? 0);
  const { rows, total } = await listarTenants({
    busca: sp.busca,
    status: sp.status,
    plan: sp.plan,
    page,
  });
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">{textos.admin.tenants.titulo}</h1>
        <p className="text-sm text-muted-foreground">{total} tenants no total</p>
      </header>
      <form className="flex flex-wrap items-center gap-2" method="get">
        <input
          name="busca"
          defaultValue={sp.busca ?? ""}
          placeholder={textos.admin.tenants.busca}
          className="h-9 w-72 rounded-md border bg-background px-3 text-sm"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">
            {textos.admin.tenants.todos} ({textos.admin.tenants.filtroStatus})
          </option>
          <option value="active">Ativo</option>
          <option value="past_due">Past due</option>
          <option value="suspended">Suspenso</option>
        </select>
        <select
          name="plan"
          defaultValue={sp.plan ?? ""}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">
            {textos.admin.tenants.todos} ({textos.admin.tenants.filtroPlano})
          </option>
          <option value="free">Free</option>
          <option value="essencial">Essencial</option>
          <option value="profissional">Profissional</option>
          <option value="clinica">Clínica</option>
          <option value="payg">Pay-as-you-go</option>
          <option value="vitalicio">Vitalício</option>
        </select>
        <Button type="submit" size="sm">
          Filtrar
        </Button>
      </form>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Tenant</th>
                <th className="p-3">Owner</th>
                <th className="p-3">Plano</th>
                <th className="p-3">Status</th>
                <th className="p-3">Alunas</th>
                <th className="p-3">Sessões</th>
                <th className="p-3">Criado em</th>
                <th className="p-3 text-right">{textos.admin.tenants.acoes}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    Nenhum tenant encontrado.
                  </td>
                </tr>
              )}
              {rows.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{t.name}</td>
                  <td className="p-3 text-xs">
                    <div>{t.owner_name}</div>
                    <div className="text-muted-foreground">{t.owner_email}</div>
                  </td>
                  <td className="p-3">
                    <PlanoBadge plan={t.plan} />
                  </td>
                  <td className="p-3">
                    <Badge variant={STATUS_TONE[t.status] ?? "outline"}>{t.status}</Badge>
                  </td>
                  <td className="p-3 font-mono">{t.total_alunas}</td>
                  <td className="p-3 font-mono">{t.total_sessoes}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {format(new Date(t.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="p-3 text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/tenants/${t.id}`}>{textos.admin.tenants.verFicha}</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
