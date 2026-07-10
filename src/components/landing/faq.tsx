import { Reveal } from "@/components/motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { textos } from "@/lib/textos";

export function FAQ() {
  return (
    <section id="faq" className="bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <div className="mb-10 flex flex-col items-center gap-3 text-center sm:mb-14">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
              {textos.landing.faq.eyebrow}
            </span>
            <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              {textos.landing.faq.titulo}
            </h2>
          </div>
        </Reveal>

        <Reveal>
          <Accordion
            type="single"
            collapsible
            className="rounded-2xl border border-border/60 bg-card px-4 shadow-sm sm:px-6"
          >
            {textos.landing.faq.itens.map((item, i) => (
              <AccordionItem
                // biome-ignore lint/suspicious/noArrayIndexKey: lista estática
                key={i}
                value={`item-${i}`}
              >
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
