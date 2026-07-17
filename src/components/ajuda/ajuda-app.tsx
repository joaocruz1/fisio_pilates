"use client";

import { useChat } from "@ai-sdk/react";
import {
  BooksIcon,
  CalendarDotsIcon,
  ChartLineUpIcon,
  ChatCircleIcon,
  PaperPlaneRightIcon,
  PlayCircleIcon,
  QuestionIcon,
  SparkleIcon,
  UsersIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AiThinking } from "@/components/shared/ai-thinking";
import { Markdown } from "@/components/shared/markdown";
import { useTour } from "@/components/tour/tour-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Tópicos que iniciam o tour no passo relevante (guia "interagindo").
const TOPICOS: { label: string; stepId: string }[] = [
  { label: "Como cadastrar um aluno?", stepId: "alunos-novo" },
  { label: "Como registrar/gerar uma aula?", stepId: "aluno-aulas" },
  { label: "Como agendar uma aula?", stepId: "agenda-nova" },
  { label: "Como gerar um relatório?", stepId: "aluno-evolucao" },
  { label: "Como usar o assistente?", stepId: "assistente-input" },
  { label: "Como montar minha base?", stepId: "kb-add" },
];

// Atalhos de navegação. `passo` (opcional) inicia o tour naquela área; senão navega.
const GUIA = [
  {
    icon: UsersIcon,
    titulo: "Alunos",
    desc: "Cadastro, avaliação e ficha completa.",
    href: "/alunos",
  },
  {
    icon: CalendarDotsIcon,
    titulo: "Agenda",
    desc: "Agende e acompanhe as aulas do dia.",
    href: "/agenda",
  },
  {
    icon: ChartLineUpIcon,
    titulo: "Evolução",
    desc: "Relatórios de IA e PDF para a aluna.",
    href: "evolucao",
  },
  {
    icon: ChatCircleIcon,
    titulo: "Assistente",
    desc: "Dúvidas técnicas com a sua base.",
    href: "/assistente",
  },
  {
    icon: BooksIcon,
    titulo: "Conhecimento",
    desc: "Ensine a IA com seus materiais.",
    href: "/conhecimento",
  },
];

function textoMensagem(m: UIMessage): string {
  return (m.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function AjudaApp({ primeiroAlunoId = null }: { primeiroAlunoId?: string | null }) {
  const { start, startAt } = useTour();
  const evolucaoHref = primeiroAlunoId ? `/alunos/${primeiroAlunoId}/evolucao` : "/alunos";
  const [input, setInput] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/ajuda" }),
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: rola ao chegar mensagem
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ocupado = status === "submitted" || status === "streaming";

  function enviar(texto: string) {
    if (!texto.trim() || ocupado) return;
    sendMessage({ text: texto });
    setInput("");
  }

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6"
      data-tour="ajuda-conteudo"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-gradient text-primary-foreground shadow-lg shadow-primary/30">
          <QuestionIcon className="size-6" weight="fill" />
        </span>
        <h1 className="font-heading text-xl font-semibold">Central de Ajuda</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Pergunte qualquer coisa sobre como usar o FísioPilates, ou refaça o tour guiado.
        </p>
        <Button onClick={start} className="mt-1">
          <PlayCircleIcon className="size-4" weight="fill" /> Refazer o tour guiado
        </Button>
      </div>

      {/* Guia rápido */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ir direto para
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {GUIA.map(({ icon: Icon, titulo, desc, href }) => (
            <Link
              key={titulo}
              href={href === "evolucao" ? evolucaoHref : href}
              className="flex flex-col gap-1 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" weight="fill" />
              </span>
              <span className="text-sm font-semibold">{titulo}</span>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Perguntas frequentes → disparam o tour (mostra na tela) */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Aprenda fazendo — eu te mostro na tela
        </p>
        <div className="flex flex-wrap gap-2">
          {TOPICOS.map((t) => (
            <button
              key={t.stepId}
              type="button"
              onClick={() => startAt(t.stepId)}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <SparkleIcon className="size-3.5 text-primary" weight="fill" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat de dúvidas */}
      <div className="flex min-h-[280px] flex-col rounded-2xl border bg-muted/20">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Escreva sua dúvida abaixo — ex.: “como registro uma aula que já dei?”
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((m) => {
                const texto = textoMensagem(m);
                if (m.role === "user") {
                  return (
                    <div
                      key={m.id}
                      className="max-w-[85%] self-end whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm"
                    >
                      {texto}
                    </div>
                  );
                }
                return (
                  <div key={m.id} className="flex max-w-full items-start gap-3 self-start">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-primary-foreground">
                      <QuestionIcon className="size-4" weight="fill" />
                    </span>
                    <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border bg-card px-4 py-3 shadow-sm">
                      {texto ? (
                        <Markdown size="sm">{texto}</Markdown>
                      ) : (
                        <span className="inline-flex gap-1 py-1">
                          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {ocupado && messages[messages.length - 1]?.role === "user" ? (
                <div className="self-start rounded-2xl rounded-tl-md border bg-card px-4 py-3 shadow-sm">
                  <AiThinking mensagens={["Procurando a melhor forma de explicar…"]} />
                </div>
              ) : null}
              {error ? (
                <div className="flex items-center gap-2 self-start rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <WarningCircleIcon className="size-4 shrink-0" weight="fill" />
                  Não foi possível responder agora. Tente novamente.
                </div>
              ) : null}
              <div ref={fimRef} />
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(input);
          }}
          className="flex items-center gap-2 border-t p-3"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva sua dúvida sobre o app…"
            disabled={ocupado}
          />
          <Button type="submit" size="icon" disabled={ocupado || !input.trim()} aria-label="Enviar">
            <PaperPlaneRightIcon className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
