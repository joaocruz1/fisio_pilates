import { Archivo } from "next/font/google";

/**
 * Escopo da voz da landing.
 *
 * A Archivo existe aqui e só aqui: um route group não muda a URL, mas dá um
 * ponto de montagem onde a variável CSS da fonte cobre a landing e nada mais.
 * Os headings da área logada continuam em Sora, sem uma linha de override.
 *
 * `axes: ["wdth"]` e NENHUM `weight`: pedir weight numa fonte variável faz o
 * next/font baixar instâncias estáticas, que não carregam o eixo de largura —
 * e aí `font-stretch` vira no-op silencioso. O eixo wght vem por default na
 * variável. Confirme no primeiro build: tem que sair UM único woff2 da Archivo
 * em .next/static/media/.
 */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-lp-display",
  display: "swap",
});

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={archivo.variable} data-landing>
      {children}
    </div>
  );
}
