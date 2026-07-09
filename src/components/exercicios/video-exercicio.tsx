"use client";

import { PlayCircleIcon, YoutubeLogoIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { linksVideoExercicio } from "@/lib/exercicio-videos";
import { cn } from "@/lib/utils";
import { resolverVideoExercicio } from "@/server/actions/video";

/**
 * Botão "Ver vídeo" de um exercício. Ao abrir, tenta resolver o vídeo mais
 * relevante do YouTube (via YouTube Data API, se configurada) e o reproduz
 * DENTRO do app. Sem a chave, mostra links de busca (YouTube + TikTok).
 * Os links são determinísticos pelo nome (sem curadoria).
 */
export function VideoExercicio({
  nome,
  variant = "button",
  className,
}: {
  nome: string;
  variant?: "button" | "icon";
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const { youtubeSearch, tiktokSearch } = linksVideoExercicio(nome);

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    setCarregando(true);
    setVideoId(null);
    resolverVideoExercicio(nome)
      .then((r) => {
        if (vivo) setVideoId(r.videoId);
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, [aberto, nome]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <button
            type="button"
            aria-label={`Ver vídeo de ${nome}`}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary",
              className,
            )}
          >
            <PlayCircleIcon className="size-5" weight="fill" />
          </button>
        ) : (
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10",
              className,
            )}
          >
            <PlayCircleIcon className="size-4" weight="fill" /> Ver vídeo
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading">{nome}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-muted">
            {carregando ? (
              <span className="text-sm text-muted-foreground">Procurando vídeo…</span>
            ) : videoId ? (
              <iframe
                key={videoId}
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                title={`Vídeo de ${nome}`}
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 p-6 text-center">
                <PlayCircleIcon className="size-10 text-muted-foreground/50" weight="fill" />
                <p className="text-sm text-muted-foreground">
                  Abra a busca do exercício no YouTube ou TikTok abaixo.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={youtubeSearch}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <YoutubeLogoIcon className="size-4 text-[#ff0000]" weight="fill" /> Buscar no YouTube
            </a>
            <a
              href={tiktokSearch}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <PlayCircleIcon className="size-4" weight="fill" /> Buscar no TikTok
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
