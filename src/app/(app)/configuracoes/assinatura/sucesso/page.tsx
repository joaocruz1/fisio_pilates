import { CheckCircleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { textos } from "@/lib/textos";

export const metadata = { title: "Assinatura confirmada" };

export default async function AssinaturaSucessoPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  await searchParams; // touched to silence unused warning; not used in this simple success page
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 md:p-6">
      <Card>
        <CardHeader className="items-center text-center">
          <CheckCircleIcon className="size-12 text-primary" weight="fill" />
          <CardTitle>Assinatura confirmada</CardTitle>
          <CardDescription>
            Sua assinatura está ativa. Os novos limites entram em vigor em alguns instantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/configuracoes/assinatura">{textos.billing.titulo}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard">Voltar ao início</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
