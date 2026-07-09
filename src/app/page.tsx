import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { textos } from "@/lib/textos";

export default function Home() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden p-8 text-center">
      <span className="pointer-events-none absolute -top-24 right-1/4 size-72 rounded-full bg-primary/10 blur-3xl" />
      <span className="pointer-events-none absolute bottom-0 left-1/4 size-72 rounded-full bg-accent/40 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-5">
        <Image
          src="/logo.png"
          alt={textos.app.nome}
          width={96}
          height={96}
          priority
          className="size-24 rounded-3xl shadow-lg shadow-primary/20"
        />
        <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
          <span className="text-brand-gradient">{textos.app.nome}</span>
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">{textos.app.tagline}</p>
      </div>

      <div className="relative z-10 flex gap-3">
        <Button asChild size="lg">
          <Link href="/cadastro">Criar conta</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Entrar</Link>
        </Button>
      </div>
    </main>
  );
}
