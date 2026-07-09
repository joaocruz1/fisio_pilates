import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NovoAdminButton, RevogarButton } from "@/components/admin/admin-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { textos } from "@/lib/textos";
import { listarAdmins } from "@/server/admin";
import { requireAdminRole } from "@/server/auth";

export const metadata = { title: "Administradores" };

const TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  super_admin: "destructive",
  support: "secondary",
  finance: "outline",
};

export default async function AdminsPage() {
  const ctx = await requireAdminRole("super_admin");
  const rows = await listarAdmins();
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{textos.admin.admins.titulo}</h1>
        <NovoAdminButton />
      </header>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Email</th>
                <th className="p-3">Nome</th>
                <th className="p-3">Papel</th>
                <th className="p-3">Criado em</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Nenhum admin.
                  </td>
                </tr>
              )}
              {rows.map((a) => {
                const p = a.profile as { full_name?: string; email?: string } | null;
                const isSelf = a.id === ctx.user.id;
                return (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="p-3 font-mono text-xs">{p?.email ?? "—"}</td>
                    <td className="p-3">{p?.full_name ?? "—"}</td>
                    <td className="p-3">
                      <Badge variant={TONE[a.role] ?? "outline"}>{a.role}</Badge>
                    </td>
                    <td className="p-3 text-xs">
                      {format(new Date(a.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="p-3 text-right">
                      {isSelf ? (
                        <span className="text-xs text-muted-foreground">você</span>
                      ) : (
                        <RevogarButton adminId={a.id} />
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
