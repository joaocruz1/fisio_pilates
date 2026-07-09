import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { textos } from "@/lib/textos";
import { listarKbGlobal } from "@/server/admin";

export const metadata = { title: "Base global (KB)" };

const TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  queued: "outline",
  processing: "secondary",
  ready: "default",
  failed: "destructive",
};

export default async function KbAdminPage() {
  const rows = await listarKbGlobal();
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="font-heading text-2xl font-semibold">{textos.admin.nav.kb}</h1>
        <p className="text-sm text-muted-foreground">
          Documentos da base curada (escopo <code>global</code>).
        </p>
      </header>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Título</th>
                <th className="p-3">Autor</th>
                <th className="p-3">Status</th>
                <th className="p-3">Páginas</th>
                <th className="p-3">Chunks</th>
                <th className="p-3">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Nenhum documento global.
                  </td>
                </tr>
              )}
              {rows.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{d.title}</td>
                  <td className="p-3 text-xs">{d.author ?? "—"}</td>
                  <td className="p-3">
                    <Badge variant={TONE[d.status] ?? "outline"}>{d.status}</Badge>
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {d.processed_pages}/{d.total_pages ?? "—"}
                  </td>
                  <td className="p-3 font-mono text-xs">{d.chunk_count}</td>
                  <td className="p-3 text-xs">
                    {format(new Date(d.created_at), "dd/MM/yyyy", { locale: ptBR })}
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
