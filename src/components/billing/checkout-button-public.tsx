"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PlanId } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/client";
import { criarCheckout } from "@/server/actions/billing";

type Props = {
  planId: PlanId;
  label: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
};

/**
 * Variante do CheckoutButton para a landing pública. Verifica se o usuário
 * tem sessão antes de chamar `criarCheckout`:
 *
 *   - Sem sessão  → redireciona para `/cadastro?plan=<id>` (a sessão é criada
 *                   no cadastro, o trigger cria o tenant e, ao chegar em
 *                   `/onboarding`, o usuário finaliza. Após login, o server
 *                   action cria o checkout.)
 *   - Com sessão → chama `criarCheckout` e redireciona ao Stripe.
 *
 * Garante que o fluxo de Stripe não dispare `requireTenant()` antes do
 * visitante ter conta.
 */
export function CheckoutButtonPublic({ planId, label, variant = "default", className }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // Persistir a escolha do plano para o cadastro saber o que o visitante
        // queria assinar (e o dashboard poder oferecer o checkout depois).
        if (typeof window !== "undefined") {
          window.localStorage.setItem("fp:pending-plan", planId);
        }
        router.push(`/cadastro?plan=${planId}`);
        return;
      }
      const res = await criarCheckout(planId);
      if (!res.ok) {
        toast.error(res.erro);
        return;
      }
      router.push(res.data.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao iniciar checkout.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={loading}
      variant={variant}
      className={className}
    >
      {loading ? "Redirecionando..." : label}
    </Button>
  );
}
