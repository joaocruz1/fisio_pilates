/**
 * Layout de impressão: sem o shell do app (sidebar/nav), otimizado para gerar
 * PDF via "Salvar como PDF" do navegador. A autenticação/RLS é garantida pelas
 * queries da própria página (requireTenant).
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`@page { size: A4; margin: 16mm; } @media print { .no-print { display: none !important; } }`}</style>
      <div className="min-h-svh bg-muted/30 print:bg-white">{children}</div>
    </>
  );
}
