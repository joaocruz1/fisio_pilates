import Link from "next/link";

/**
 * Layout da ficha do aluno: cabeçalho + abas navegáveis por URL.
 * O cabeçalho com dados reais do aluno chega na Fase 2.
 */
export default async function AlunoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ alunoId: string }>;
}) {
  const { alunoId } = await params;
  const base = `/alunos/${alunoId}`;
  const abas = [
    { href: base, label: "Dados" },
    { href: `${base}/avaliacao`, label: "Avaliação" },
    { href: `${base}/sessoes`, label: "Sessões" },
    { href: `${base}/documentos`, label: "Documentos" },
    { href: `${base}/evolucao`, label: "Evolução" },
  ];

  return (
    <div className="flex flex-col">
      <nav className="flex gap-1 overflow-x-auto border-b p-2">
        {abas.map((aba) => (
          <Link
            key={aba.href}
            href={aba.href}
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {aba.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
