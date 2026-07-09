"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { abrirPortal, cancelarAssinatura, reativarAssinatura } from "@/server/actions/billing";

export function PortalButton({ label = "Gerenciar assinatura" }: { label?: string }) {
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    try {
      await abrirPortal("/configuracoes/assinatura");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao abrir portal";
      toast.error(message);
      setLoading(false);
    }
  }
  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={loading}
      variant="outline"
      className="gap-2"
    >
      <ArrowSquareOutIcon className="size-4" /> {loading ? "Abrindo..." : label}
    </Button>
  );
}

export function CancelarButton() {
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    const res = await cancelarAssinatura();
    setLoading(false);
    if (!res.ok) {
      toast.error(res.erro);
      return;
    }
    toast.success("Assinatura será cancelada no fim do período.");
  }
  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={loading}
      variant="ghost"
      className="text-destructive"
    >
      {loading ? "Cancelando..." : "Cancelar assinatura"}
    </Button>
  );
}

export function ReativarButton() {
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    const res = await reativarAssinatura();
    setLoading(false);
    if (!res.ok) {
      toast.error(res.erro);
      return;
    }
    toast.success("Assinatura reativada.");
  }
  return (
    <Button type="button" onClick={handleClick} disabled={loading} variant="outline">
      {loading ? "Reativando..." : "Reativar assinatura"}
    </Button>
  );
}
