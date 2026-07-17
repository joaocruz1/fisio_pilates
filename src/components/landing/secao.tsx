import { Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";

/**
 * Um bloco da landing. Container centralizado de largura generosa — a página
 * usa a tela inteira, com ritmo vertical amplo. O `superficie` alterna o fundo
 * entre seções para dar profundidade sem depender de bordas.
 */
export function Secao({
  id,
  className,
  superficie = false,
  children,
}: {
  id?: string;
  className?: string;
  superficie?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-20 py-20 sm:py-28", superficie && "bg-muted/40", className)}
    >
      <div className="mx-auto w-full max-w-6xl px-6 sm:px-8">{children}</div>
    </section>
  );
}

/**
 * Cabeçalho de seção. O eyebrow é um rótulo curto com um traço — herança da
 * ideia de "campo de prontuário", mas agora com presença, centralizado ou não.
 */
export function CabecalhoSecao({
  eyebrow,
  titulo,
  sub,
  centrado = false,
  className,
}: {
  eyebrow: string;
  titulo: React.ReactNode;
  sub?: string;
  centrado?: boolean;
  className?: string;
}) {
  return (
    <Reveal className={cn(centrado && "mx-auto text-center", "max-w-2xl", className)}>
      <p
        className={cn(
          "flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary",
          centrado && "justify-center",
        )}
      >
        <span aria-hidden className="h-px w-6 bg-primary/50" />
        {eyebrow}
      </p>
      <h2 className="mt-4 text-balance font-lp text-3xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-4xl lg:text-[2.75rem]">
        {titulo}
      </h2>
      {sub && (
        <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">{sub}</p>
      )}
    </Reveal>
  );
}
