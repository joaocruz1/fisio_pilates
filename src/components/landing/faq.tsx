import { CabecalhoSecao, Secao } from "@/components/landing/secao";
import { Reveal } from "@/components/motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { textos } from "@/lib/textos";

const t = textos.landing.faq;

/**
 * As cinco objeções que decidem a confiança: onde o dado mora, se a IA lê o
 * nome do paciente, se ela decide por você, de onde vem o que ela escreve, e se
 * dá para sair. As três que saíram (preço de token, limite de fotos, plano de
 * time) são dúvidas de depois de criar a conta.
 */
export function FAQ() {
  return (
    <Secao id="faq">
      <CabecalhoSecao eyebrow={t.campo} titulo={t.titulo} centrado />

      <Reveal className="mx-auto mt-12 max-w-3xl">
        <Accordion type="single" collapsible className="w-full">
          {t.itens.map((item) => (
            <AccordionItem key={item.q} value={item.q} className="border-border/60">
              <AccordionTrigger className="text-left text-base font-medium">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-[0.9375rem] leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </Secao>
  );
}
