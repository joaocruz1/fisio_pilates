import { Reveal, StaggerItem, StaggerList } from "@/components/motion";
import { textos } from "@/lib/textos";

export function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 lg:px-16">
        <Reveal>
          <div className="mb-12 flex flex-col items-center gap-3 text-center sm:mb-16">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
              {textos.landing.howItWorks.eyebrow}
            </span>
            <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              {textos.landing.howItWorks.titulo}
            </h2>
            <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
              {textos.landing.howItWorks.subtitulo}
            </p>
          </div>
        </Reveal>

        <StaggerList className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {textos.landing.howItWorks.passos.map((passo, i) => (
            <StaggerItem
              // biome-ignore lint/suspicious/noArrayIndexKey: lista estática
              key={i}
              className="relative h-full"
            >
              <div className="relative flex h-full flex-col gap-3 rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
                <div className="absolute -top-4 -left-2 flex size-10 items-center justify-center rounded-xl bg-brand-gradient font-heading text-base font-semibold text-primary-foreground shadow-md shadow-primary/20">
                  {i + 1}
                </div>
                <h3 className="mt-3 font-heading text-lg font-semibold tracking-tight">
                  {passo.titulo}
                </h3>
                <p className="text-sm text-muted-foreground">{passo.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>
    </section>
  );
}
