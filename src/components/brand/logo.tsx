import Image from "next/image";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";

/**
 * Marca FísioPilates: ícone (tile com o símbolo) + wordmark bicolor.
 *
 * O wordmark é texto (não raster) para ficar nítido em qualquer densidade e se
 * adaptar ao tema; as cores vêm de `.text-brand-sky` / `.text-brand-navy`.
 *
 * O ícone tem duas versões e quem escolhe é o CSS, não o JS: no tema claro o
 * tile escuro (símbolo branco) contrasta com o fundo; no escuro, o tile claro.
 * A troca via `dark:hidden` não pode causar hydration mismatch — o HTML é
 * idêntico nos dois lados e a classe do <html> já está resolvida antes do
 * primeiro paint. Com useTheme() o servidor renderizaria o asset errado e a
 * logo piscaria no header; de quebra, este componente deixaria de ser um
 * Server Component.
 */
export function LogoMarca({
  tamanho = 32,
  wordmark = "colorido",
  prioridade = false,
  className,
  classNameNome,
}: {
  tamanho?: number;
  /** "colorido" (padrão), "claro" (sobre fundo escuro/gradiente) ou "nenhum" (só o ícone). */
  wordmark?: "colorido" | "claro" | "nenhum";
  prioridade?: boolean;
  className?: string;
  classNameNome?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/brand/icon-tile-dark.png"
        alt=""
        width={tamanho}
        height={tamanho}
        priority={prioridade}
        className="block shrink-0 drop-shadow-sm dark:hidden"
        style={{ width: tamanho, height: tamanho }}
      />
      <Image
        src="/brand/icon-tile-light.png"
        alt=""
        width={tamanho}
        height={tamanho}
        priority={prioridade}
        className="hidden shrink-0 drop-shadow-sm dark:block"
        style={{ width: tamanho, height: tamanho }}
      />
      {wordmark !== "nenhum" && (
        <span className={cn("font-heading text-lg font-semibold tracking-tight", classNameNome)}>
          {wordmark === "claro" ? (
            <span className="text-white">
              {textos.app.nomeParte1}
              <span className="font-bold">{textos.app.nomeParte2}</span>
            </span>
          ) : (
            <>
              <span className="text-brand-sky">{textos.app.nomeParte1}</span>
              <span className="font-bold text-brand-navy">{textos.app.nomeParte2}</span>
            </>
          )}
        </span>
      )}
    </span>
  );
}
