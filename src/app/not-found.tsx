import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-4xl font-semibold">404</p>
      <p className="text-muted-foreground">A página que você procura não existe.</p>
      <Button asChild>
        <Link href="/dashboard">Voltar ao início</Link>
      </Button>
    </main>
  );
}
