import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "LGPD" };

export default async function LgpdAdminPage() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="font-heading text-2xl font-semibold">LGPD</h1>
        <p className="text-sm text-muted-foreground">Pedidos de export e exclusão.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>
            Os pedidos de export/erase de alunos ficam registrados em <code>audit_logs</code>{" "}
            (action = student.export / student.erase). Esta página listará os pedidos pendentes para
            acompanhamento do time de suporte.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
