"use client";

import {
  CaretLeftIcon,
  ChartLineIcon,
  ClipboardTextIcon,
  MagnifyingGlassIcon,
  PaperclipIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { PinnedItem } from "@/lib/chat-pins";
import { cn } from "@/lib/utils";
import { type ContextoDoAluno, listarContextosDoAluno } from "@/server/actions/chat-pins";

type AlunoLite = { id: string; nome: string };

/** Já está fixado? (evita duplicar) */
function jaFixado(pinned: PinnedItem[], tipo: PinnedItem["tipo"], id: string) {
  return pinned.some((p) => p.tipo === tipo && p.id === id);
}

export function AnexarContexto({
  alunos,
  pinned,
  onAdd,
}: {
  alunos: AlunoLite[];
  pinned: PinnedItem[];
  onAdd: (item: PinnedItem) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [query, setQuery] = useState("");
  const [aluno, setAluno] = useState<AlunoLite | null>(null);
  const [ctx, setCtx] = useState<ContextoDoAluno | null>(null);
  const [carregando, setCarregando] = useState(false);

  const filtrados = alunos.filter((a) => a.nome.toLowerCase().includes(query.trim().toLowerCase()));

  async function escolherAluno(a: AlunoLite) {
    setAluno(a);
    setCtx(null);
    setCarregando(true);
    try {
      setCtx(await listarContextosDoAluno(a.id));
    } finally {
      setCarregando(false);
    }
  }

  function fixar(item: PinnedItem) {
    if (!jaFixado(pinned, item.tipo, item.id)) onAdd(item);
    setAberto(false);
    setAluno(null);
    setCtx(null);
    setQuery("");
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (!v) {
          setAluno(null);
          setCtx(null);
          setQuery("");
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Anexar contexto"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <PaperclipIcon className="size-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            {aluno ? (
              <button
                type="button"
                onClick={() => {
                  setAluno(null);
                  setCtx(null);
                }}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <CaretLeftIcon className="size-4" /> {aluno.nome}
              </button>
            ) : (
              "Anexar contexto"
            )}
          </DialogTitle>
        </DialogHeader>

        {!aluno ? (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar aluno"
                className="pl-9"
              />
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {filtrados.length === 0 ? (
                <li className="px-1 py-6 text-center text-sm text-muted-foreground">
                  Nenhum aluno encontrado.
                </li>
              ) : (
                filtrados.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => escolherAluno(a)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                    >
                      <UserIcon className="size-4 text-primary" /> {a.nome}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : (
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            <ItemFixar
              icon={<UserIcon className="size-4 text-primary" weight="fill" />}
              titulo="Ficha completa do aluno"
              descricao="Histórico, condições, aulas e medidas (pseudonimizado)"
              desabilitado={jaFixado(pinned, "aluno", aluno.id)}
              onClick={() => fixar({ tipo: "aluno", id: aluno.id, rotulo: aluno.nome })}
            />

            {carregando ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">Carregando…</p>
            ) : (
              <>
                {ctx?.planos.length ? (
                  <>
                    <p className="px-2 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Planos de aula
                    </p>
                    {ctx.planos.map((p) => (
                      <ItemFixar
                        key={p.id}
                        icon={<ClipboardTextIcon className="size-4 text-info" weight="fill" />}
                        titulo={p.rotulo}
                        desabilitado={jaFixado(pinned, "plano", p.id)}
                        onClick={() =>
                          fixar({ tipo: "plano", id: p.id, rotulo: `${aluno.nome} · ${p.rotulo}` })
                        }
                      />
                    ))}
                  </>
                ) : null}

                {ctx?.relatorios.length ? (
                  <>
                    <p className="px-2 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Relatórios de evolução
                    </p>
                    {ctx.relatorios.map((r) => (
                      <ItemFixar
                        key={r.id}
                        icon={<ChartLineIcon className="size-4 text-success" weight="fill" />}
                        titulo={r.rotulo}
                        desabilitado={jaFixado(pinned, "relatorio", r.id)}
                        onClick={() =>
                          fixar({
                            tipo: "relatorio",
                            id: r.id,
                            rotulo: `${aluno.nome} · ${r.rotulo}`,
                          })
                        }
                      />
                    ))}
                  </>
                ) : null}

                {ctx && !ctx.planos.length && !ctx.relatorios.length ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    Este aluno ainda não tem planos ou relatórios gerados.
                  </p>
                ) : null}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ItemFixar({
  icon,
  titulo,
  descricao,
  desabilitado,
  onClick,
}: {
  icon: React.ReactNode;
  titulo: string;
  descricao?: string;
  desabilitado?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      className={cn(
        "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
        desabilitado ? "cursor-not-allowed opacity-50" : "hover:bg-accent",
      )}
    >
      <span className="mt-0.5">{icon}</span>
      <span className="min-w-0">
        <span className="block font-medium">
          {titulo}
          {desabilitado ? " (fixado)" : ""}
        </span>
        {descricao ? (
          <span className="block text-xs text-muted-foreground">{descricao}</span>
        ) : null}
      </span>
    </button>
  );
}
