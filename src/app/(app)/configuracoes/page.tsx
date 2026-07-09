import { SignOutIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { AlterarSenhaForm } from "@/components/configuracoes/alterar-senha-form";
import { PerfilForm } from "@/components/configuracoes/perfil-form";
import { ExcluirConta } from "@/components/lgpd/excluir-conta";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUsoMensal } from "@/lib/ai/usage";
import { signOut } from "@/server/actions/auth";
import { requireTenant } from "@/server/auth";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const { user, profile, tenant } = await requireTenant();
  const uso = await getUsoMensal(tenant.id);

  return (
    <>
      <PageHeader title="Configurações" />
      <div
        data-tour="config-conteudo"
        className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-6"
      >
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
              US$ {uso.gasto.toFixed(2)} de US$ {uso.limite.toFixed(2)} da sua cota mensal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary"
                style={{
                  width: `${uso.limite > 0 ? Math.min(100, (uso.gasto / uso.limite) * 100) : 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacidade e dados</CardTitle>
            <CardDescription>
              Leia a{" "}
              <Link href="/privacidade" className="underline">
                Política de Privacidade
              </Link>
              . A exportação dos dados de cada aluno fica na ficha dele (aba Dados).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExcluirConta />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
