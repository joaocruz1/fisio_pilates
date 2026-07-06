"use client";

import { useChat } from "@ai-sdk/react";
import { PaperPlaneRightIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
}: {
  conversations: Conversation[];
  initialMessages: UIMessage[];
  conversationId?: string;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat", body: { conversationId } }),
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: hidrata uma vez por conversa
  useEffect(() => {
    setMessages(initialMessages);
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
              <Button
                size="icon"
                variant="ghost"
                className="size-7 opacity-0 group-hover:opacity-100"
                aria-label="Apagar conversa"
                onClick={() => apagar(c.id)}
              >
                <TrashIcon className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Conversa */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-12 text-center">
              <p className="text-muted-foreground">
                Tire dúvidas técnicas de Pilates e fisioterapia. As respostas usam a sua base de
                conhecimento.
              </p>
              <div className="flex flex-col gap-2">
                {SUGESTOES.map((s) => (
                  <Button key={s} variant="outline" size="sm" onClick={() => enviar(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-2xl flex-col gap-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                    m.role === "user"
                      ? "self-end bg-primary text-primary-foreground"
                      : "self-start border bg-card",
                  )}
                >
                  {textoMensagem(m) || (ocupado ? "…" : "")}
                </div>
              ))}
              {ocupado && messages[messages.length - 1]?.role === "user" ? (
                <div className="self-start rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
                  Consultando a base…
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
            placeholder="Pergunte algo técnico…"
            disabled={ocupado}
          />
          <Button type="submit" size="icon" disabled={ocupado || !input.trim()} aria-label="Enviar">
            <PaperPlaneRightIcon className="size-4" />
          </Button>
        </form>
        <p className="border-t px-3 py-1.5 text-center text-xs text-muted-foreground">
          {textos.ia.disclaimer}
        </p>
      </div>
    </div>
  );
}
