import {
  MapPinIcon,
  PenNibIcon,
  ShieldCheckIcon,
  UserFocusIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/motion";
import { textos } from "@/lib/textos";

const t = textos.landing.confianca;

const ITENS = [
  { icon: ShieldCheckIcon, ...t.lgpd },
  { icon: MapPinIcon, ...t.brasil },
  { icon: UserFocusIcon, ...t.pseudo },
  { icon: PenNibIcon, ...t.humano },
] as const;

/**
 * Tira de confiança logo abaixo do hero. Quatro provas concretas em vez de
 * quatro selos cinzas — cada uma com um ícone da marca e uma frase que a
 * fisioterapeuta pode repetir para a aluna dela.
 */
export function FaixaConfianca() {
  return (
    <section className="border-b border-border/60 bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-px overflow-hidden px-6 py-2 sm:px-8 lg:grid-cols-4">
        {ITENS.map((item, i) => (
          <Reveal key={item.titulo} delay={i * 0.05} className="px-2 py-6 sm:px-4">
            <item.icon weight="duotone" className="size-6 text-primary" />
            <p className="mt-3 text-sm font-semibold text-foreground">{item.titulo}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
