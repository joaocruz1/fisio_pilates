import {
  BrainIcon,
  CheckCircleIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react/dist/ssr";
import { textos } from "@/lib/textos";

const SELOS = [
  {
    icon: ShieldCheckIcon,
    text: textos.landing.socialProof.lgpd,
  },
  {
    icon: MapPinIcon,
    text: textos.landing.socialProof.brasil,
  },
  {
    icon: BrainIcon,
    text: textos.landing.socialProof.pseudo,
  },
  {
    icon: CheckCircleIcon,
    text: textos.landing.socialProof.crefito,
  },
] as const;

export function SocialProof() {
  return (
    <section
      aria-label="Selos de segurança e conformidade"
      className="border-y border-border/60 bg-muted/30 py-6"
    >
      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-4 px-6 sm:grid-cols-4 sm:px-10 lg:px-16">
        {SELOS.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center justify-center gap-2 text-center text-xs font-medium text-muted-foreground sm:text-sm"
          >
            <Icon weight="duotone" className="size-5 shrink-0 text-primary" />
            <span className="leading-tight">{text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
