import { ArrowRightIcon, LockKeyIcon, SparkleIcon } from "@phosphor-icons/react/dist/ssr";
import { CabecalhoSecao, Secao } from "@/components/landing/secao";
import { Reveal } from "@/components/motion";
import { textos } from "@/lib/textos";

const t = textos.landing.dados;

/**
 * "Onde o dado dorme" — LGPD encenada, não descrita.
 *
 * O diferencial é que o nome do paciente nunca chega à IA. Em vez de afirmar
 * isso num parágrafo, a seção mostra a troca: o que fica no banco (o nome real,
 * protegido) e o que a IA recebe ("aluno 47"). Substitui a antiga strip de
 * selos cinzas escrita em jargão de servidor.
 */
export function Dados() {
  return (
    <Secao id="dados">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <CabecalhoSecao eyebrow={t.campo} titulo={t.h2} sub={t.corpo} />

        <Reveal delay={0.1}>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Cartao
              rotulo="Fica com você"
              icone={<LockKeyIcon weight="duotone" className="size-4" />}
              tom="seguro"
            >
              <span className="select-none blur-[5px]">Maria Aparecida Silva</span>
              <span className="mt-1 block select-none text-xs blur-[4px]">CPF 123.456.789-00</span>
            </Cartao>

            <ArrowRightIcon
              weight="bold"
              className="mx-auto size-5 shrink-0 rotate-90 text-muted-foreground sm:rotate-0"
            />

            <Cartao
              rotulo="A IA recebe"
              icone={<SparkleIcon weight="fill" className="size-4" />}
              tom="ia"
            >
              <span className="font-lp text-lg font-semibold">aluno 47</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                reformer · footwork · eva 6→3
              </span>
            </Cartao>
          </div>
        </Reveal>
      </div>
    </Secao>
  );
}

function Cartao({
  rotulo,
  icone,
  tom,
  children,
}: {
  rotulo: string;
  icone: React.ReactNode;
  tom: "seguro" | "ia";
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        tom === "ia"
          ? "flex-1 rounded-xl border border-primary/30 bg-primary/5 p-4"
          : "flex-1 rounded-xl border border-border/70 bg-card p-4 shadow-sm"
      }
    >
      <p
        className={
          tom === "ia"
            ? "flex items-center gap-1.5 text-xs font-semibold text-primary"
            : "flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
        }
      >
        {icone}
        {rotulo}
      </p>
      <div className="mt-3 text-sm text-foreground">{children}</div>
    </div>
  );
}
