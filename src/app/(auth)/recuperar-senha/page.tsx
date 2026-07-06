import { RecuperarSenhaForm } from "@/components/auth/recuperar-senha-form";

export const metadata = { title: "Recuperar senha" };

export default function RecuperarSenhaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground">
          Enviaremos um link de redefinição para seu e-mail.
        </p>
      </div>
      <RecuperarSenhaForm />
    </div>
  );
}
