"use client";

import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-lg font-semibold">Algo deu errado</p>
      <p className="text-sm text-muted-foreground">
        Tente novamente. Se o problema continuar, recarregue a página.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </main>
  );
}
