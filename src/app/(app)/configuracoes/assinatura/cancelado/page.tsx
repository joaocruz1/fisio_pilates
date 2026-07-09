import { XCircleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Checkout cancelado" };

export default function AssinaturaCanceladoPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 md:p-6">
      <Card>
        <CardHeader className="items-center text-center">
          <XCircleIcon className="size-12 text-muted-foreground" weight="fill" />
          <CardTitle>Checkout cancelado</CardTitle>
          <CardDescription>
            Nenhuma cobrança foi feita. Você pode tentar novamente quando quiser.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/configuracoes/assinatura">Ver planos</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard">Voltar ao início</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
