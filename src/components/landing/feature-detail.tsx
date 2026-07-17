import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";
import { textos } from "@/lib/textos";

export function FeatureDetail() {
  return (
    <section className="bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] space-y-20 px-6 sm:px-10 lg:space-y-28 lg:px-16">
        <Bloco
          eyebrow={textos.landing.featureDetail.bloco1.eyebrow}
          titulo={textos.landing.featureDetail.bloco1.titulo}
          desc={textos.landing.featureDetail.bloco1.desc}
          bullets={textos.landing.featureDetail.bloco1.bullets}
          mockup={<MockupSessao />}
          reverse={false}
        />
        <Bloco
          eyebrow={textos.landing.featureDetail.bloco2.eyebrow}
          titulo={textos.landing.featureDetail.bloco2.titulo}
          desc={textos.landing.featureDetail.bloco2.desc}
          bullets={textos.landing.featureDetail.bloco2.bullets}
          mockup={<MockupRelatorio />}
          reverse
        />
        <Bloco
          eyebrow={textos.landing.featureDetail.bloco3.eyebrow}
          titulo={textos.landing.featureDetail.bloco3.titulo}
          desc={textos.landing.featureDetail.bloco3.desc}
          bullets={textos.landing.featureDetail.bloco3.bullets}
          mockup={<MockupVision />}
          reverse={false}
        />
      </div>
    </section>
  );
}

function Bloco({
  eyebrow,
  titulo,
  desc,
  bullets,
  mockup,
  reverse,
}: {
  eyebrow: string;
  titulo: string;
  desc: string;
  bullets: readonly string[];
  mockup: React.ReactNode;
  reverse: boolean;
}) {
  return (
    <div
      className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${reverse ? "lg:grid-flow-dense" : ""}`}
    >
      <Reveal className="flex flex-col gap-5">
        <span className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
          {eyebrow}
        </span>
        <h3 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h3>
        <p className="text-base text-muted-foreground sm:text-lg">{desc}</p>
        <ul className="mt-2 grid gap-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-foreground/80">
              <CheckCircleIcon weight="fill" className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal className={reverse ? "lg:col-start-1" : ""}>{mockup}</Reveal>
    </div>
  );
}

/* ---------- Mockups ---------- */

function MockupSessao() {
  return (
    <Card className="overflow-hidden border-border/60 shadow-xl shadow-primary/5">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-destructive/70" />
            <span className="size-2.5 rounded-full bg-warning/70" />
            <span className="size-2.5 rounded-full bg-success/70" />
          </div>
          <span className="text-xs text-muted-foreground">Sessão · Aluna M.S.</span>
          <span className="text-xs text-primary">Reformer</span>
        </div>
        <div className="space-y-2 p-4">
          {[
            { ex: "Footwork · 1ª série", molas: "2 vermelhas", reps: "10 reps", dor: "3 → 1" },
            { ex: "Hundred", molas: "1 vermelha", reps: "100 reps", dor: "2 → 0" },
            { ex: "Spine Stretch Forward", molas: "sem molas", reps: "6 reps", dor: "0 → 0" },
            { ex: "Swimming", molas: "1 vermelha", reps: "10 reps", dor: "0 → 0" },
          ].map((row) => (
            <div
              key={row.ex}
              className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs"
            >
              <div>
                <div className="font-medium text-foreground">{row.ex}</div>
                <div className="text-muted-foreground">
                  {row.molas} · {row.reps}
                </div>
              </div>
              <div className="rounded-md bg-success/10 px-2 py-1 font-mono text-[10px] font-medium text-success">
                EVA {row.dor}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
            <span>Duração: 50 min</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
              Repetir última sessão →
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MockupRelatorio() {
  return (
    <Card className="overflow-hidden border-border/60 shadow-xl shadow-primary/5">
      <CardContent className="p-0">
        <div className="border-b border-border/60 bg-muted/40 px-4 py-3">
          <span className="text-xs text-muted-foreground">Relatório de evolução · rascunho</span>
        </div>
        <div className="space-y-3 p-4 text-xs">
          <div>
            <div className="mb-1 font-semibold text-foreground">Resumo executivo</div>
            <p className="text-muted-foreground">
              Aluna M.S., 42 anos, em Pilates clínico há 14 semanas. Redução consistente da EVA
              lombar de 6/10 para 2/10 ao longo do período
              <span className="ml-1 inline-flex h-4 items-center rounded-md bg-primary/15 px-1.5 text-[10px] font-medium text-primary">
                [KB-3]
              </span>
              .
            </p>
          </div>
          <div>
            <div className="mb-1 font-semibold text-foreground">Evolução no Pilates</div>
            <p className="text-muted-foreground">
              Aumento de carga no Footwork (1 → 2 molas vermelhas) e no Hundred
              <span className="ml-1 inline-flex h-4 items-center rounded-md bg-primary/15 px-1.5 text-[10px] font-medium text-primary">
                [KB-1]
              </span>{" "}
              com manutenção da dor pré-sessão.
            </p>
          </div>
          <div>
            <div className="mb-1 font-semibold text-foreground">Pontos de atenção</div>
            <p className="text-muted-foreground">
              Sem sessões registradas nos últimos 10 dias. Sugerir retorno gradual
              <span className="ml-1 inline-flex h-4 items-center rounded-md bg-primary/15 px-1.5 text-[10px] font-medium text-primary">
                [KB-2]
              </span>
              .
            </p>
          </div>
          <div className="flex items-center gap-2 border-t border-border/60 pt-2">
            <span className="rounded-md bg-warning/15 px-2 py-1 text-[10px] font-medium text-warning">
              Rascunho
            </span>
            <span className="text-muted-foreground">Aguardando revisão da profissional</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* Mockup Vision: usa 3 fotos reais (Pexels) de avaliação postural em vistas
 * anterior / posterior / lateral, com prumo sobreposto e label. */
const POSTURA_IMAGES = [
  {
    key: "anterior",
    label: "Vista anterior",
    src: "/landing/postura-anterior.jpeg",
    alt: "Avaliação postural em vista anterior — mulher em pé analisada de frente",
  },
  {
    key: "posterior",
    label: "Vista posterior",
    src: "/landing/postura-posterior.jpeg",
    alt: "Avaliação postural em vista posterior — costas da aluna sendo analisadas",
  },
  {
    key: "lateral",
    label: "Vista lateral",
    src: "/landing/postura-lateral.jpeg",
    alt: "Avaliação postural em vista lateral — perfil da aluna sendo avaliada",
  },
] as const;

function MockupVision() {
  return (
    <Card className="overflow-hidden border-border/60 shadow-xl shadow-primary/5">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3">
          <span className="text-xs text-muted-foreground">Análise postural · Vision</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            IA · esboço
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 p-3">
          {POSTURA_IMAGES.map(({ key, label, src, alt }) => (
            <div
              key={key}
              className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-border/60 bg-muted"
            >
              {/* biome-ignore lint/performance/noImgElement: imagens estáticas de marketing, hotlink direto */}
              <img
                src={src}
                alt={alt}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Linha de prumo (referência postural) sobreposta à foto */}
              <div
                className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-primary/60 mix-blend-difference"
                aria-hidden
              />
              {/* Pontos posturais. Cor fixa (não token): o fundo é a foto, que não
                  muda com o tema — mas fica na família azul da marca. */}
              <span
                className="absolute left-[58%] top-[20%] size-2 rounded-full bg-[oklch(0.78_0.13_235)] shadow-[0_0_0_3px_oklch(0.61_0.155_245.5_/_0.35)]"
                aria-hidden
              />
              <span
                className="absolute left-[55%] top-[55%] size-2 rounded-full bg-[oklch(0.78_0.13_235)] shadow-[0_0_0_3px_oklch(0.61_0.155_245.5_/_0.35)]"
                aria-hidden
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2">
                <span className="text-[11px] font-semibold text-white drop-shadow">{label}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-border/60 p-4 text-xs">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <span className="inline-block size-1.5 rounded-full bg-info" />
            Achados
          </div>
          <p className="text-muted-foreground">
            Leve anteriorização de ombros e assimetria pélvica discreta à direita. Sugerida inclusão
            de exercício de abertura de cadeia anterior.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
