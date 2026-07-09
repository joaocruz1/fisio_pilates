"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PlanId } from "@/lib/billing/plans";
import { criarCheckout } from "@/server/actions/billing";

export function CheckoutButton({
  planId,
  label,
  variant = "default",
  className,
}: {
  planId: PlanId;
  label: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    const res = await criarCheckout(planId);
    if (!res.ok) {
      toast.error(res.erro);
      setLoading(false);
      return;
    }
    router.push(res.data.url);
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
