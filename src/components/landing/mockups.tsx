import {
  ChatCircleDotsIcon,
  EyeSlashIcon,
  FileTextIcon,
  LinkSimpleIcon,
  SparkleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/**
 * Moldura de janela do produto, recriada em HTML — não é screenshot.
 *
 * Recriar em vez de printar dá nitidez, tema claro/escuro nativo, e a garantia
 * de que nenhum dado real de aluno aparece (a própria tese da landing). O header
 * traz o nome da tela e um ponto de status; sem os três "faróis" do macOS, que
 * são decoração e o clichê nº1 de mockup gerado.
 */
export function Janela({
  titulo,
  children,
  className,
}: {
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-card shadow-[0_24px_60px_-24px] shadow-primary/25 ring-1 ring-black/[0.02] dark:shadow-black/60",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
        <span className="size-2 rounded-full bg-success" />
        <span className="text-xs font-medium text-muted-foreground">{titulo}</span>
      </div>
      {children}
    </div>
  );
}

/** O assistente técnico: pergunta de Pilates, resposta com fontes citadas. */
export function MockupAssistente() {
  return (
    <Janela titulo="Assistente · FísioPilates">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex justify-end">
          <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
            Como progredir o core no reformer sem carregar a lombar?
          </p>
        </div>

        <div className="flex gap-2.5">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <SparkleIcon weight="fill" className="size-3.5" />
          </span>
          <div className="min-w-0 space-y-2.5">
            <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-background px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
              Comece reduzindo a mola e priorizando o footwork com báscula neutra. A progressão para
              leg circles só entra quando o controle de tronco se mantém sem dor referida
              <cite className="not-italic">
                {" "}
                <span className="rounded-[3px] border border-primary/30 bg-primary/5 px-1 text-[0.6875rem] font-medium text-primary">
                  KB-1
                </span>
              </cite>
              .
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-muted-foreground">
              <LinkSimpleIcon weight="bold" className="size-3" />
              <span className="font-medium text-foreground/70">KB-1</span>
              Kolyniak, Pilates: método e aplicação clínica · p. 112
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3.5 py-2">
          <ChatCircleDotsIcon weight="duotone" className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Pergunte algo técnico…</span>
        </div>
      </div>
    </Janela>
  );
}

/** A base de conhecimento: base do sistema + a base própria, indexadas. */
export function MockupBase() {
  const itens = [
    { nome: "Testes funcionais e amplitude de movimento (ADM)", trechos: 4, tipo: "sistema" },
    { nome: "Tendinopatias patelar e do tendão de Aquiles", trechos: 7, tipo: "sistema" },
    { nome: "Pilates — visão geral (seu material)", trechos: 3, tipo: "sua" },
  ];
  return (
    <Janela titulo="Base de conhecimento · FísioPilates">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/60 bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">Base do sistema</p>
            <p className="mt-1 font-lp text-lg font-semibold tabular-nums">574 trechos</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-full rounded-full bg-brand-gradient" />
            </div>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-medium text-primary">Sua base</p>
            <p className="mt-1 font-lp text-lg font-semibold tabular-nums">3 trechos</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/15">
              <div className="h-full w-1/5 rounded-full bg-primary" />
            </div>
          </div>
        </div>

        <ul className="space-y-2">
          {itens.map((item) => (
            <li
              key={item.nome}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-3 py-2.5"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md",
                  item.tipo === "sua"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {item.tipo === "sua" ? (
                  <LinkSimpleIcon weight="bold" className="size-3.5" />
                ) : (
                  <FileTextIcon weight="duotone" className="size-3.5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground">
                  {item.nome}
                </span>
                <span className="text-[0.6875rem] text-muted-foreground">
                  {item.trechos} trechos indexados
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[0.625rem] font-semibold text-success">
                Pronto
              </span>
            </li>
          ))}
        </ul>

        <p className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
          <EyeSlashIcon weight="duotone" className="size-3.5" />
          Nunca ficam visíveis para os alunos.
        </p>
      </div>
    </Janela>
  );
}
