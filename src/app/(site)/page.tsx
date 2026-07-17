import { ComparativoPublic } from "@/components/landing/comparativo-public";
import { Dados } from "@/components/landing/dados";
import { FaixaConfianca } from "@/components/landing/faixa-confianca";
import { FAQ } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { NavPublic } from "@/components/landing/nav-public";
import { Prontuario } from "@/components/landing/prontuario";
import { SiteFooter } from "@/components/landing/site-footer";
import { Superficie } from "@/components/landing/superficie";
import { Vitrine } from "@/components/landing/vitrine";

/**
 * Landing pública do FísioPilates.
 *
 * Server Component. Os únicos client são <NavPublic> (scroll state), a <Folha>
 * dentro do <Hero> (a assinatura interativa) e as primitivas de <Reveal> que
 * animam as seções na entrada. <Superficie> planta um MotionConfig
 * reducedMotion="user" sobre tudo, então quem pediu menos movimento no sistema
 * recebe a página parada, sem cada componente perguntar.
 *
 * Personalidade sem cara de IA: a tipografia Archivo, a folha que se assina
 * (interativa, não um screenshot), o produto real recriado em mockups fiéis com
 * dados fictícios, o azul clínico da marca e um copy honesto e específico.
 */
export default function Home() {
  return (
    <Superficie>
      <NavPublic />
      <main className="flex flex-col">
        <Hero />
        <FaixaConfianca />
        <Vitrine />
        <Prontuario />
        <Dados />
        <ComparativoPublic />
        <FAQ />
      </main>
      <SiteFooter />
    </Superficie>
  );
}
