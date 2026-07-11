import { AparelhoForm } from "@/components/aparelhos/aparelho-form";
import { PageHeader } from "@/components/shared/page-header";
import { getAparelho } from "@/server/aparelhos";

export const metadata = { title: "Editar aparelho" };

export default async function EditarAparelhoPage({
  params,
}: {
  params: Promise<{ aparelhoId: string }>;
}) {
  const { aparelhoId } = await params;
  const aparelho = await getAparelho(aparelhoId);

  return (
    <>
      <PageHeader title="Editar aparelho" description={aparelho.label} />
      <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
        <AparelhoForm aparelho={aparelho} />
      </div>
    </>
  );
}
