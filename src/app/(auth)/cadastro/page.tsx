import { CadastroForm } from "@/components/auth/cadastro-form";

export const metadata = { title: "Criar conta" };

export default function CadastroPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Criar conta</h1>
        <p className="text-sm text-muted-foreground">Comece a organizar seus alunos.</p>
      </div>
      <CadastroForm />
    </div>
  );
}
