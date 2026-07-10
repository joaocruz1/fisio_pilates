import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  titulo: ReactNode;
  subtitulo?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

/**
 * Cabeçalho padronizado para seções da landing. Mantém a hierarquia
 * tipográfica (eyebrow + h2 + subtítulo) consistente entre seções.
 */
export function SectionHeading({ eyebrow, titulo, subtitulo, align = "center", className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow && (
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
          {eyebrow}
        </span>
      )}
      <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
        {titulo}
      </h2>
      {subtitulo && (
        <p
          className={cn(
            "max-w-2xl text-base text-muted-foreground sm:text-lg",
            align === "center" && "mx-auto",
          )}
        >
          {subtitulo}
        </p>
      )}
    </div>
  );
}
