import {
  BookOpenIcon,
  BrainIcon,
  CalendarIcon,
  ChatCircleDotsIcon,
  ClipboardTextIcon,
  EyeIcon,
  FileTextIcon,
  HeartbeatIcon,
  ListChecksIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Reveal, StaggerItem, StaggerList } from "@/components/motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { textos } from "@/lib/textos";

const FEATURES = [
  {
    key: "alunos",
    icon: HeartbeatIcon,
    titulo: textos.landing.features.itens.alunos.titulo,
    desc: textos.landing.features.itens.alunos.desc,
  },
  {
    key: "avaliacao",
    icon: ClipboardTextIcon,
    titulo: textos.landing.features.itens.avaliacao.titulo,
    desc: textos.landing.features.itens.avaliacao.desc,
  },
  {
    key: "sessoes",
    icon: ListChecksIcon,
    titulo: textos.landing.features.itens.sessoes.titulo,
    desc: textos.landing.features.itens.sessoes.desc,
  },
  {
    key: "agenda",
    icon: CalendarIcon,
    titulo: textos.landing.features.itens.agenda.titulo,
    desc: textos.landing.features.itens.agenda.desc,
  },
  {
    key: "documentos",
    icon: FileTextIcon,
    titulo: textos.landing.features.itens.documentos.titulo,
    desc: textos.landing.features.itens.documentos.desc,
  },
  {
    key: "kb",
    icon: BookOpenIcon,
    titulo: textos.landing.features.itens.kb.titulo,
    desc: textos.landing.features.itens.kb.desc,
  },
  {
    key: "relatorios",
    icon: BrainIcon,
    titulo: textos.landing.features.itens.relatorios.titulo,
    desc: textos.landing.features.itens.relatorios.desc,
  },
  {
    key: "chat",
    icon: ChatCircleDotsIcon,
    titulo: textos.landing.features.itens.chat.titulo,
    desc: textos.landing.features.itens.chat.desc,
  },
  {
    key: "vision",
    icon: EyeIcon,
    titulo: textos.landing.features.itens.vision.titulo,
    desc: textos.landing.features.itens.vision.desc,
  },
] as const;

export function FeaturesGrid() {
  return (
    <section id="recursos" className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 lg:px-16">
        <Reveal>
          <div className="mb-12 flex flex-col items-center gap-3 text-center sm:mb-16">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
              {textos.landing.features.eyebrow}
            </span>
            <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              {textos.landing.features.titulo}
            </h2>
            <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
              {textos.landing.features.subtitulo}
            </p>
          </div>
        </Reveal>

        <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ key, icon: Icon, titulo, desc }) => (
            <StaggerItem key={key} className="h-full">
              <Card className="group h-full border-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                <CardHeader>
                  <div className="mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-brand-gradient text-primary-foreground shadow-md shadow-primary/20 transition-transform duration-300 group-hover:scale-110">
                    <Icon weight="duotone" className="size-6" />
                  </div>
                  <CardTitle className="font-heading text-lg">{titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">{desc}</CardDescription>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>
    </section>
  );
}
