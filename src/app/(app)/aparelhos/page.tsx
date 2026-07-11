import Link from "next/link";
import { ListaAparelhos } from "@/components/aparelhos/lista-aparelhos";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { listAparelhos } from "@/server/aparelhos";

export const metadata = { title: "Aparelhos" };

export default async function AparelhosPage() {
  const aparelhos = await listAparelhos();
  return (
    <>
      <PageHeader title="Aparelhos" description="Inventário de aparelhos do seu estúdio.">
        <Button asChild>
          <Link href="/aparelhos/novo">Novo aparelho</Link>
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6">
        <ListaAparelhos aparelhos={aparelhos} />
      </div>
    </>
  );
}
