import { SignOutIcon } from "@phosphor-icons/react/ssr";
import { AlterarSenhaForm } from "@/components/configuracoes/alterar-senha-form";
import { PerfilForm } from "@/components/configuracoes/perfil-form";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/server/actions/auth";
import { requireTenant } from "@/server/auth";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const { user, profile, tenant } = await requireTenant();

  return (
    <>
      <PageHeader title="Configurações" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Seus dados profissionais e do estúdio.</CardDescription>
          </CardHeader>
          <CardContent>
            <PerfilForm
              defaultFullName={profile.full_name}
              defaultStudioName={tenant.name}
              defaultCrefito={profile.crefito ?? ""}
              defaultPhone={profile.phone ?? ""}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conta</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <AlterarSenhaForm />
            <form action={signOut}>
              <Button type="submit" variant="ghost" className="gap-2 text-muted-foreground">
                <SignOutIcon className="size-4" /> Sair da conta
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plano</CardTitle>
            <CardDescription>Seu plano atual.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">Gratuito</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uso de IA neste mês</CardTitle>
            <CardDescription>
              Disponível quando os relatórios com IA forem ativados.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacidade e dados</CardTitle>
            <CardDescription>
              Exportar seus dados e excluir a conta estarão disponíveis em breve.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </>
  );
}
