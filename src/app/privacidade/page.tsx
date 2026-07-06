import Link from "next/link";
import { textos } from "@/lib/textos";

export const metadata = { title: "Política de Privacidade" };

export default function PrivacidadePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Política de Privacidade</h1>
      <p className="text-sm text-muted-foreground">
        Como o {textos.app.nome} trata dados pessoais e dados de saúde (LGPD — Lei 13.709/2018).
      </p>

      <section className="flex flex-col gap-3 text-sm leading-relaxed">
        <h2 className="font-semibold">Papéis</h2>
        <p>
          A fisioterapeuta usuária é a <strong>controladora</strong> dos dados dos seus alunos. O{" "}
          {textos.app.nome} atua como <strong>operador</strong>, tratando os dados sob instrução da
          profissional. Provedores de IA (OpenRouter/Anthropic), busca (Tavily) e infraestrutura
          (Supabase, Upstash) atuam como suboperadores.
        </p>

        <h2 className="font-semibold">Dados de saúde e minimização</h2>
        <p>
          Dados clínicos são sensíveis. Coletamos apenas o necessário para a gestão do atendimento.
          Ao enviar dados de um aluno para a IA, identificadores diretos (nome completo, CPF,
          telefone, e-mail) são removidos (pseudonimização).
        </p>

        <h2 className="font-semibold">Consentimento</h2>
        <p>
          O tratamento de dados de saúde do aluno depende do consentimento dele, registrado pela
          profissional. A geração de análises por IA respeita esse registro.
        </p>

        <h2 className="font-semibold">Residência dos dados</h2>
        <p>Os dados são armazenados na região de São Paulo (Brasil).</p>

        <h2 className="font-semibold">Direitos do titular</h2>
        <p>
          O titular pode solicitar acesso, correção e exclusão dos seus dados. A profissional pode
          exportar os dados de um aluno em formato aberto (JSON) e solicitar a exclusão. A exclusão
          ocorre em duas fases (arquivamento e, depois, remoção definitiva), respeitando eventual
          dever de guarda profissional.
        </p>

        <h2 className="font-semibold">Contato</h2>
        <p>Dúvidas sobre privacidade podem ser encaminhadas ao suporte do {textos.app.nome}.</p>
      </section>

      <Link href="/" className="text-sm font-medium hover:underline">
        Voltar
      </Link>
    </main>
  );
}
