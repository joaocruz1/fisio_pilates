import { ComparativoPublic } from "@/components/landing/comparativo-public";
import { FAQ } from "@/components/landing/faq";
import { FeatureDetail } from "@/components/landing/feature-detail";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { FinalCTA } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { NavPublic } from "@/components/landing/nav-public";
import { SiteFooter } from "@/components/landing/site-footer";
import { SocialProof } from "@/components/landing/social-proof";
import { Testimonials } from "@/components/landing/testimonials";

/**
 * Landing pública do FisioPilates. Renderizada como RSC: tudo é server-rendered
 * exceto a cena 3D do hero, que é client-only via `dynamic({ ssr: false })`.
 *
 * Seções (em ordem):
 *   1. NavPublic (client)               — fixa, transparente → sólida
 *   2. Hero (client)                    — copy + cena 3D R3F
 *   3. SocialProof                      — strip de selos LGPD/Brasil
 *   4. FeaturesGrid                     — 9 features em 3×3
 *   5. FeatureDetail                    — 3 blocos detalhados
 *   6. HowItWorks                       — 4 passos numerados
 *   7. ComparativoPublic                — 5 planos (Free + 4 pagos)
 *   8. Testimonials                     — 3 personas ilustrativas
 *   9. FAQ                              — accordion com 8 perguntas
 *  10. FinalCTA                         — banner de fechamento
 *  11. SiteFooter                       — 4 colunas institucionais
 */
export default function Home() {
  return (
    <>
      <NavPublic />
      <main className="relative flex min-h-svh flex-col">
        <Hero />
        <SocialProof />
        <FeaturesGrid />
        <FeatureDetail />
        <HowItWorks />
        <ComparativoPublic />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <SiteFooter />
    </>
  );
}
