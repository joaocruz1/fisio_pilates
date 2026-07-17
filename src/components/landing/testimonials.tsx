import { QuotesIcon } from "@phosphor-icons/react/dist/ssr";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal, StaggerItem, StaggerList } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";

/* Cores fixas, não tokens: o texto das iniciais é branco fixo, e os tokens
 * semânticos invertem de luminância entre os temas — com eles, o contraste que
 * passa no claro falha no escuro. Como o círculo tem cor própria, o contraste
 * é interno e independe do tema. Estes três ficam na família azul da marca e
 * passam AA (>= 4.5:1) em qualquer ponto do gradiente. */
const GRADIENTS = [
  "from-[oklch(0.55_0.15_245)] to-[oklch(0.42_0.13_251)]",
  "from-[oklch(0.55_0.11_212)] to-[oklch(0.45_0.14_245)]",
  "from-[oklch(0.52_0.13_165)] to-[oklch(0.47_0.11_205)]",
] as const;

function initials(nome: string) {
  return nome
    .replace(/Dra?\.\s*/i, "")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export function Testimonials() {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 lg:px-16">
        <Reveal>
          <SectionHeading
            eyebrow={textos.landing.testimonials.eyebrow}
            titulo={textos.landing.testimonials.titulo}
            subtitulo={textos.landing.testimonials.subtitulo}
            className="mb-12 sm:mb-16"
          />
        </Reveal>

        <StaggerList className="grid gap-4 md:grid-cols-3">
          {textos.landing.testimonials.items.map((t, i) => (
            <StaggerItem
              // biome-ignore lint/suspicious/noArrayIndexKey: lista estática
              key={i}
              className="h-full"
            >
              <Card className="relative h-full overflow-hidden border-border/60">
                <QuotesIcon
                  weight="fill"
                  className="pointer-events-none absolute -top-2 -right-2 size-20 text-primary/5"
                  aria-hidden
                />
                <CardContent className="flex h-full flex-col gap-5 p-6">
                  <p className="relative text-sm leading-relaxed text-foreground/85 sm:text-base">
                    “{t.quote}”
                  </p>
                  <div className="mt-auto flex items-center gap-3 border-t border-border/60 pt-4">
                    <div
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-heading text-sm font-semibold text-white shadow-sm",
                        GRADIENTS[i % GRADIENTS.length],
                      )}
                    >
                      {initials(t.nome)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{t.nome}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {t.especialidade} · {t.local}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerList>

        <p className="mt-8 text-center text-xs italic text-muted-foreground">
          {textos.landing.testimonials.aviso}
        </p>
      </div>
    </section>
  );
}
