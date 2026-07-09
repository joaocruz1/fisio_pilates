import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { textos } from "@/lib/textos";
import { listarAuditLog } from "@/server/admin";

export const metadata = { title: "Auditoria" };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ acao?: string; tenantId?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { rows } = await listarAuditLog({
    acao: sp.acao,
    tenantId: sp.tenantId,
    page: Number(sp.page ?? 0),
  });
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="font-heading text-2xl font-semibold">{textos.admin.audit.titulo}</h1>
        <p className="text-sm text-muted-foreground">Últimos 50 eventos.</p>
      </header>
      <form className="flex flex-wrap items-center gap-2" method="get">
        <input
          name="acao"
          defaultValue={sp.acao ?? ""}
          placeholder="Filtrar por ação (ex: admin.tenant.suspend)"
          className="h-9 w-80 rounded-md border bg-background px-3 text-sm"
        />
        <input
          name="tenantId"
          defaultValue={sp.tenantId ?? ""}
          placeholder="tenant_id"
          className="h-9 w-80 rounded-md border bg-background px-3 text-sm"
        />
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
                <th className="p-3">Data</th>
                <th className="p-3">Ação</th>
                <th className="p-3">Ator</th>
                <th className="p-3">Tenant</th>
                <th className="p-3">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Sem registros.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const p = r.profile as { full_name?: string; email?: string } | null;
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="p-3 text-xs">
                      {format(new Date(r.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{r.action}</Badge>
                    </td>
                    <td className="p-3 text-xs">
                      {p?.full_name ?? "—"}
                      <div className="text-muted-foreground">{p?.email ?? r.user_id}</div>
                    </td>
                    <td className="p-3 font-mono text-xs">{r.tenant_id ?? "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      <code>{JSON.stringify(r.metadata).slice(0, 80)}</code>
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
