import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { kpi } from "@/server/admin";

export const metadata = { title: "Painel admin" };

function KpiCard({ titulo, valor, sub }: { titulo: string; valor: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{titulo}</CardDescription>
        <CardTitle className="font-heading text-3xl">{valor}</CardTitle>
      </CardHeader>
      {sub && <CardContent className="pt-0 text-xs text-muted-foreground">{sub}</CardContent>}
    </Card>
  );
}

export default async function AdminDashboard() {
  const k = await kpi();
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do SaaS em tempo real.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard titulo="MRR" valor={k.mrrFormatado} sub="Receita mensal recorrente" />
        <KpiCard titulo="Faturas pagas no mês" valor={k.faturasMesCents} />
        <KpiCard
          titulo="Tenants ativos"
          valor={String(k.tenantsAtivos)}
          sub={`${k.novosEsteMes} novos este mês`}
        />
        <KpiCard
          titulo="Custo de IA (mês)"
          valor={k.custoIaFormatado}
          sub={`${k.relatoriosMes} relatórios`}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top consumidores de IA</CardTitle>
            <CardDescription>Custo agregado por tenant no mês</CardDescription>
          </CardHeader>
          <CardContent>
            {k.topConsumidores.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem uso registrado este mês.</p>
            ) : (
              <ol className="flex flex-col gap-2 text-sm">
                {k.topConsumidores.map((c, idx) => (
                  <li key={c.tenantId} className="flex items-center justify-between">
                    <span>
                      <span className="text-muted-foreground">#{idx + 1}</span>{" "}
                      <code className="text-xs">{c.tenantId.slice(0, 8)}</code>
                    </span>
                    <span className="font-mono">US$ {c.custo.toFixed(2)}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Por modelo</CardTitle>
            <CardDescription>Custo agregado no mês</CardDescription>
          </CardHeader>
          <CardContent>
            {k.porModelo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem uso registrado.</p>
            ) : (
              <ol className="flex flex-col gap-2 text-sm">
                {k.porModelo.map((m) => (
                  <li key={m.modelo} className="flex items-center justify-between">
                    <code className="text-xs">{m.modelo}</code>
                    <span className="font-mono">US$ {m.custo.toFixed(2)}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
