import { BooksIcon, SparkleIcon } from "@phosphor-icons/react/ssr";
import { Card, CardContent } from "@/components/ui/card";
import { nivelDaBase } from "@/lib/kb-nivel";
import { cn } from "@/lib/utils";
import type { KbEscopoStats } from "@/server/knowledge";

const COR_POR_NIVEL: Record<string, string> = {
  Vazia: "bg-muted-foreground/40",
  Iniciante: "bg-amber-400",
  Boa: "bg-sky-400",
  Rica: "bg-primary",
  Completa: "bg-brand-gradient",
};

/**
 * Cartão de "nível de conhecimento" de uma base (sistema ou do tenant): medidor
 * de cobertura a partir de materiais prontos + trechos indexados.
 */
export function NivelBaseCard({
  titulo,
  descricao,
  stats,
  destaque = false,
  vazioDica,
}: {
  titulo: string;
  descricao: string;
  stats: KbEscopoStats;
  destaque?: boolean;
  vazioDica?: string;
}) {
  const nivel = nivelDaBase(stats);
  const cor = COR_POR_NIVEL[nivel.rotulo] ?? "bg-primary";
  const vazia = stats.chunks === 0;

  return (
    <Card className={cn("flex-1", destaque && "ring-2 ring-primary/30")}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg text-primary-foreground",
                destaque ? "bg-brand-gradient" : "bg-primary/10 text-primary",
              )}
            >
              {destaque ? (
                <SparkleIcon className="size-4" weight="fill" />
              ) : (
                <BooksIcon className="size-4" weight="fill" />
              )}
            </span>
            <div>
              <p className="font-heading text-sm font-semibold">{titulo}</p>
              <p className="text-xs text-muted-foreground">{descricao}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
            {nivel.rotulo}
          </span>
        </div>

        {/* Medidor */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", cor)}
            style={{ width: `${Math.max(nivel.indice, vazia ? 0 : 6)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{stats.docs}</strong>{" "}
            {stats.docs === 1 ? "material" : "materiais"} ·{" "}
            <strong className="text-foreground">{stats.chunks}</strong> trechos
          </span>
          {nivel.proximo ? <span className="text-right">{nivel.proximo}</span> : null}
        </div>

        {vazia && vazioDica ? (
          <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">{vazioDica}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
