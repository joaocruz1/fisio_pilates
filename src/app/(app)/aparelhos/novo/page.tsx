import { AparelhoForm } from "@/components/aparelhos/aparelho-form";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Novo aparelho" };

export default function NovoAparelhoPage() {
  return (
    <>
      <PageHeader title="Novo aparelho" description="Cadastre um aparelho do estúdio." />
      <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
        <AparelhoForm />
      </div>
    </>
  );
}
