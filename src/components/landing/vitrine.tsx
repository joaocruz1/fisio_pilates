import { CheckIcon } from "@phosphor-icons/react/dist/ssr";
import { MockupAssistente, MockupBase } from "@/components/landing/mockups";
import { CabecalhoSecao, Secao } from "@/components/landing/secao";
import { Reveal } from "@/components/motion";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";

const t = textos.landing.vitrine;

/**
 * "Por dentro" — o produto mostrado, não descrito.
 *
 * Dois blocos alternados: o assistente que cita a fonte e a base de conhecimento
 * que vira memória da IA. Cada bloco é texto de um lado, uma janela real do
 * produto do outro. Substitui o antigo grid 3×3 de nove features de peso igual:
 * dois casos concretos provam o diferencial e escolhem o que importa.
 */
export function Vitrine() {
  return (
    <Secao id="produto">
      <CabecalhoSecao eyebrow={t.eyebrow} titulo={t.titulo} sub={t.sub} centrado />

      <div className="mt-16 space-y-20 lg:mt-20 lg:space-y-28">
        <Bloco bloco={t.assistente} visual={<MockupAssistente />} />
        <Bloco bloco={t.base} visual={<MockupBase />} inverso />
      </div>
    </Secao>
  );
}

function Bloco({
  bloco,
  visual,
  inverso = false,
}: {
  bloco: { eyebrow: string; titulo: string; desc: string; bullets: readonly string[] };
  visual: React.ReactNode;
  inverso?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <Reveal className={cn(inverso && "lg:order-2")}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          {bloco.eyebrow}
        </p>
        <h3 className="mt-3 font-lp text-2xl font-semibold leading-tight tracking-[-0.015em] sm:text-3xl">
          {bloco.titulo}
        </h3>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-muted-foreground">{bloco.desc}</p>
        <ul className="mt-6 space-y-3">
          {bloco.bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm text-foreground">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckIcon weight="bold" className="size-3" />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal delay={0.1} className={cn(inverso && "lg:order-1")}>
        {visual}
      </Reveal>
    </div>
  );
}
