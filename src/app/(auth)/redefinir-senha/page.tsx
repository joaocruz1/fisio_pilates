import { RedefinirSenhaForm } from "@/components/auth/redefinir-senha-form";

export const metadata = { title: "Redefinir senha" };

export default function RedefinirSenhaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Redefinir senha</h1>
        <p className="text-sm text-muted-foreground">Defina uma nova senha para sua conta.</p>
      </div>
      <RedefinirSenhaForm />
    </div>
  );
}
