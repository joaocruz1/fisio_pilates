import Link from "next/link";
import { Button } from "@/components/ui/button";
import { textos } from "@/lib/textos";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{textos.app.nome}</h1>
        <p className="text-muted-foreground">{textos.app.tagline}</p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/cadastro">Criar conta</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Entrar</Link>
        </Button>
      </div>
    </main>
  );
}
