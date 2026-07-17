import { SectionHeading } from "@/components/landing/section-heading";
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
          <SectionHeading
            eyebrow={textos.landing.faq.eyebrow}
            titulo={textos.landing.faq.titulo}
            className="mb-10 sm:mb-14"
          />
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
