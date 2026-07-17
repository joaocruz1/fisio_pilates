/**
 * Layout de impressão: sem o shell do app (sidebar/nav), otimizado para gerar
 * PDF via "Salvar como PDF" do navegador. A autenticação/RLS é garantida pelas
 * queries da própria página (requireTenant).
 *
 * `data-force-light` mantém esta rota no tema claro mesmo com o dark ativo —
 * papel é branco. O seletor está em globals.css e redeclara os tokens claros
 * no escopo; não usar class="light", porque a variante `dark` casa por
 * ancestral (&:is(.dark *)) e continuaria valendo aqui dentro.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`@page { size: A4; margin: 16mm; } @media print { .no-print { display: none !important; } }`}</style>
      <div data-force-light className="min-h-svh bg-muted/30 print:bg-white">
        {children}
      </div>
    </>
  );
}
