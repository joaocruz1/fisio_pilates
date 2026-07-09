import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { textos } from "@/lib/textos";
import { listarUsoIa } from "@/server/admin";

export const metadata = { title: "Uso de IA" };

const TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  report: "default",
  chat: "secondary",
  embedding: "outline",
  multi_query: "outline",
  vision: "destructive",
};

export default async function AiUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const { rows } = await listarUsoIa({ page: Number(sp.page ?? 0) });
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="font-heading text-2xl font-semibold">{textos.admin.aiUsage.titulo}</h1>
        <p className="text-sm text-muted-foreground">
          Linhas mais recentes do <code>ai_usage_log</code>.
        </p>
      </header>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Tenant</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Modelo</th>
                <th className="p-3">Tokens (in/out)</th>
                <th className="p-3">Custo</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Sem registros.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const t = r.tenants as unknown as { name?: string };
                const meta = r.metadata as { input_tokens?: number; output_tokens?: number } | null;
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="p-3 text-xs">
                      {format(new Date(r.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </td>
                    <td className="p-3 font-medium">{t?.name ?? "—"}</td>
                    <td className="p-3">
                      <Badge variant={TONE[r.kind] ?? "outline"}>{r.kind}</Badge>
                    </td>
                    <td className="p-3 font-mono text-xs">{r.model ?? "—"}</td>
                    <td className="p-3 font-mono text-xs">
                      {meta?.input_tokens ?? 0} / {meta?.output_tokens ?? 0}
                    </td>
                    <td className="p-3 font-mono">US$ {(r.cost_usd ?? 0).toFixed(4)}</td>
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
