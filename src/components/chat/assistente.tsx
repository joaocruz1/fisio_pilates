"use client";

import { useChat } from "@ai-sdk/react";
import {
  ArrowClockwiseIcon,
  PaperPlaneRightIcon,
  PlusIcon,
  SparkleIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AnexarContexto } from "@/components/chat/anexar-contexto";
import { AiThinking } from "@/components/shared/ai-thinking";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Markdown } from "@/components/shared/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type PinnedItem, ROTULO_TIPO } from "@/lib/chat-pins";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";
import { excluirConversa } from "@/server/actions/chat";
import type { Conversation } from "@/server/chat";

const SUGESTOES = [
  "Exercícios indicados para hérnia de disco lombar?",
  "Contraindicações de flexão de tronco carregada",
  "Como progredir o core no reformer?",
];

function textoMensagem(m: UIMessage): string {
  return (m.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function Assistente({
  conversations,
  initialMessages,
  conversationId,
  alunos,
  initialPinned,
}: {
  conversations: Conversation[];
  initialMessages: UIMessage[];
  conversationId?: string;
  alunos: { id: string; nome: string }[];
  initialPinned: PinnedItem[];
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [pinned, setPinned] = useState<PinnedItem[]>(initialPinned);
  const fimRef = useRef<HTMLDivElement>(null);
  // Mantém o valor atual dos pins acessível dentro do callback do transport.
  const pinnedRef = useRef(pinned);
  pinnedRef.current = pinned;

  const { messages, sendMessage, status, setMessages, error, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      prepareSendMessagesRequest: ({ messages, body }) => ({
        body: { ...body, messages, conversationId, pinned: pinnedRef.current },
      }),
    }),
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: hidrata uma vez por conversa
  useEffect(() => {
    setMessages(initialMessages);
    setPinned(initialPinned);
  }, [conversationId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rola ao chegar nova mensagem
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ocupado = status === "submitted" || status === "streaming";

  function enviar(texto: string) {
    if (!texto.trim() || ocupado) return;
    sendMessage({ text: texto });
    setInput("");
  }

  function adicionarPin(item: PinnedItem) {
    setPinned((atual) =>
      atual.some((p) => p.tipo === item.tipo && p.id === item.id) ? atual : [...atual, item],
    );
  }
  function removerPin(item: PinnedItem) {
    setPinned((atual) => atual.filter((p) => !(p.tipo === item.tipo && p.id === item.id)));
  }

  async function apagar(id: string) {
    const res = await excluirConversa(id);
    if (res.ok) {
      toast.success("Conversa apagada.");
      if (id === conversationId) router.push("/assistente");
      else router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem)]">
      {/* Histórico */}
      <aside className="hidden w-64 shrink-0 flex-col border-r md:flex">
        <div className="p-3">
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link href="/assistente">
              <PlusIcon className="size-4" /> Nova conversa
            </Link>
          </Button>
        </div>
        <ul className="flex-1 overflow-y-auto px-2">
          {conversations.map((c) => (
            <li key={c.id} className="group flex items-center gap-1">
              <Link
                href={`/assistente?c=${c.id}`}
                className={cn(
                  "flex-1 truncate rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                  c.id === conversationId && "bg-accent font-medium",
                )}
              >
                {c.title ?? "Conversa"}
              </Link>
              <ConfirmDialog
                title="Apagar esta conversa?"
                description="O histórico desta conversa será removido permanentemente."
                confirmLabel="Apagar"
                destructive
                onConfirm={() => apagar(c.id)}
                trigger={
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 opacity-0 group-hover:opacity-100"
                    aria-label="Apagar conversa"
                  >
                    <TrashIcon className="size-3.5" />
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      </aside>

      {/* Conversa */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-16 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-gradient text-primary-foreground shadow-lg shadow-primary/30">
                <SparkleIcon className="size-7" weight="fill" />
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="font-heading text-lg font-semibold">Assistente técnico</h2>
                <p className="text-sm text-muted-foreground">
                  Tire dúvidas de Pilates e fisioterapia. As respostas usam a sua base de
                  conhecimento e citam as fontes.
                </p>
              </div>
              <div className="mt-2 flex flex-col gap-2 self-stretch">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => enviar(s)}
                    className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-left text-sm text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <SparkleIcon className="size-4 shrink-0 text-primary" weight="fill" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-2xl flex-col gap-5">
              {messages.map((m) => {
                const texto = textoMensagem(m);
                if (m.role === "user") {
                  return (
                    <div
                      key={m.id}
                      className="max-w-[85%] self-end whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm shadow-primary/20"
                    >
                      {texto}
                    </div>
                  );
                }
                return (
                  <div key={m.id} className="flex max-w-full items-start gap-3 self-start">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-primary-foreground shadow-sm shadow-primary/30">
                      <SparkleIcon className="size-4" weight="fill" />
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
                  <AiThinking
                    mensagens={[
                      "Consultando a base de conhecimento…",
                      "Pensando na melhor resposta…",
                    ]}
                  />
                </div>
              ) : null}
              {error ? (
                <div className="flex max-w-[85%] flex-col gap-2 self-start rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-destructive">
                    <WarningCircleIcon className="size-4 shrink-0" weight="fill" />
                    Não foi possível obter a resposta. Verifique sua conexão e tente novamente.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="self-start"
                    onClick={() => regenerate()}
                    disabled={ocupado}
                  >
                    <ArrowClockwiseIcon className="size-4" /> Tentar novamente
                  </Button>
                </div>
              ) : null}
              <div ref={fimRef} />
            </div>
          )}
        </div>

        <div className="border-t p-3">
          {/* Chips de contexto fixado */}
          {pinned.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {pinned.map((p) => (
                <span
                  key={`${p.tipo}-${p.id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1 text-xs font-medium text-primary"
                >
                  <span className="text-[0.65rem] uppercase tracking-wide opacity-70">
                    {ROTULO_TIPO[p.tipo]}
                  </span>
                  <span className="max-w-[16ch] truncate">{p.rotulo}</span>
                  <button
                    type="button"
                    aria-label={`Remover ${p.rotulo}`}
                    onClick={() => removerPin(p)}
                    className="flex size-4 items-center justify-center rounded-full hover:bg-primary/20"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(input);
            }}
            className="flex items-center gap-2"
          >
            <span data-tour="assistente-anexar">
              <AnexarContexto alunos={alunos} pinned={pinned} onAdd={adicionarPin} />
            </span>
            <Input
              data-tour="assistente-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte algo técnico…"
              disabled={ocupado}
            />
            <Button
              type="submit"
              size="icon"
              disabled={ocupado || !input.trim()}
              aria-label="Enviar"
            >
              <PaperPlaneRightIcon className="size-4" />
            </Button>
          </form>
        </div>
        <p className="border-t px-3 py-1.5 text-center text-xs text-muted-foreground">
          {textos.ia.disclaimer}
        </p>
      </div>
    </div>
  );
}
