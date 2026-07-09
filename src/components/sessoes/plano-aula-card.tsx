import {
  BarbellIcon,
  ClockIcon,
  FireIcon,
  SparkleIcon,
  WarningIcon,
} from "@phosphor-icons/react/ssr";
import { VideoExercicio } from "@/components/exercicios/video-exercicio";
import { Markdown } from "@/components/shared/markdown";
import { Badge } from "@/components/ui/badge";
import type { PlanoAula } from "@/lib/ai/schemas/plano-aula";

/** Chave estável por exercício (nomes podem repetir; a posição desambigua). */
const exKey = (nome: string, i: number) => `${nome}#${i}`;

/**
 * Exibição rica do plano da PRÓXIMA aula sugerido pela IA. Mostra o raciocínio
 * clínico e os detalhes (aquecimento, progressão, cuidados) que não cabem no
 * formulário editável abaixo. Os campos numéricos já pré-preenchem o form.
 */
export function PlanoAulaCard({
  plano,
  naoEncontrados,
}: {
  plano: PlanoAula;
  naoEncontrados: string[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2 bg-brand-gradient px-4 py-3.5 text-primary-foreground">
        <div className="flex items-center gap-2">
          <SparkleIcon className="size-4" weight="fill" />
          <span className="text-xs font-medium uppercase tracking-wide text-primary-foreground/80">
            Plano sugerido pela IA
          </span>
        </div>
        <h2 className="font-heading text-lg font-semibold leading-tight">{plano.foco}</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm text-primary-foreground/90">
          {plano.duracao_sugerida_min ? (
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="size-4" /> {plano.duracao_sugerida_min} min
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <BarbellIcon className="size-4" /> {plano.exercicios.length} exercícios
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Aquecimento */}
        {plano.aquecimento ? (
          <div className="flex items-start gap-2.5 rounded-lg bg-warning/10 p-3">
            <FireIcon className="mt-0.5 size-4 shrink-0 text-warning-foreground" weight="fill" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-warning-foreground">
                Aquecimento
              </p>
              <p className="text-sm text-foreground/90">{plano.aquecimento}</p>
            </div>
          </div>
        ) : null}

        {/* Exercícios */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Exercícios
          </p>
          <ol className="flex flex-col gap-2">
            {plano.exercicios.map((ex, i) => (
              <li
                key={exKey(ex.nome, i)}
                className="rounded-lg border bg-background/60 p-3 transition-colors hover:border-primary/30"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="font-medium">{ex.nome}</span>
                  <Badge variant="outline" className="text-[0.7rem] capitalize">
                    {ex.aparelho}
                  </Badge>
                  <VideoExercicio nome={ex.nome} variant="icon" />
                  <span className="ml-auto flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    {ex.series && ex.reps ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        {ex.series}×{ex.reps}
                      </span>
                    ) : null}
                    {ex.carga_molas ? (
                      <span className="rounded bg-muted px-1.5 py-0.5">{ex.carga_molas}</span>
                    ) : null}
                    {ex.nivel ? (
                      <span className="rounded bg-info/15 px-1.5 py-0.5 text-info">
                        nível {ex.nivel}
                      </span>
                    ) : null}
                  </span>
                </div>
                {ex.progressao ? (
                  <p className="mt-2 pl-8 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground/80">Progressão:</span>{" "}
                    {ex.progressao}
                  </p>
                ) : null}
                {ex.cuidados.length > 0 ? (
                  <ul className="mt-1 flex flex-col gap-0.5 pl-8">
                    {ex.cuidados.map((c) => (
                      <li
                        key={c}
                        className="flex items-start gap-1.5 text-xs text-warning-foreground"
                      >
                        <WarningIcon className="mt-0.5 size-3 shrink-0" weight="fill" /> {c}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </div>

        {/* Avisos para a aula */}
        {plano.avisos_para_sessao.length > 0 ? (
          <div className="flex flex-col gap-1.5 rounded-lg border border-warning/30 bg-warning/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning-foreground">
              Atenção durante a aula
            </p>
            <ul className="flex flex-col gap-1">
              {plano.avisos_para_sessao.map((a) => (
                <li key={a} className="flex items-start gap-1.5 text-sm text-foreground/90">
                  <WarningIcon className="mt-0.5 size-3.5 shrink-0 text-warning-foreground" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Justificativa (raciocínio clínico, com citações da base) */}
        {plano.justificativa ? (
          <details className="group rounded-lg border bg-muted/30 p-3" open>
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Por que este plano
            </summary>
            <div className="mt-2">
              <Markdown size="sm">{plano.justificativa}</Markdown>
            </div>
          </details>
        ) : null}

        {naoEncontrados.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Fora do catálogo (adicione manualmente):{" "}
            <span className="font-medium">{naoEncontrados.join(", ")}</span>.
          </p>
        ) : null}

        <p className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
          {plano.aviso}
        </p>
      </div>
    </div>
  );
}
