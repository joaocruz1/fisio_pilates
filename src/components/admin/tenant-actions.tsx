"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { textos } from "@/lib/textos";
import { ajustarCotaIA, reativarTenant, suspenderTenant } from "@/server/actions/admin";

export function SuspenderButton({ tenantId, nome }: { tenantId: string; nome: string }) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          {textos.admin.tenants.suspender}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {textos.admin.tenants.suspender} {nome}?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {textos.admin.tenants.suspenderConfirm(nome)}
        </p>
        <div>
          <Label htmlFor="motivo">Motivo</Label>
          <Input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              const res = await suspenderTenant({ tenantId, motivo });
              setLoading(false);
              if (!res.ok) {
                toast.error(res.erro);
                return;
              }
              toast.success("Tenant suspenso.");
              setOpen(false);
              router.refresh();
            }}
          >
            {loading ? "Suspendendo..." : textos.admin.tenants.suspender}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReativarButton({ tenantId, nome }: { tenantId: string; nome: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const res = await reativarTenant({ tenantId });
        setLoading(false);
        if (!res.ok) {
          toast.error(res.erro);
          return;
        }
        toast.success("Tenant reativado.");
        router.refresh();
      }}
    >
      {loading ? "Reativando..." : `${textos.admin.tenants.reativar} ${nome}`}
    </Button>
  );
}

export function AjustarCotaButton({ tenantId, atual }: { tenantId: string; atual: number }) {
  const [open, setOpen] = useState(false);
  const [limite, setLimite] = useState(String(atual));
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Ajustar cota IA
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar cota de IA (USD/mês)</DialogTitle>
        </DialogHeader>
        <div>
          <Label htmlFor="limite">Limite em USD</Label>
          <Input
            id="limite"
            type="number"
            step="0.01"
            value={limite}
            onChange={(e) => setLimite(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              const res = await ajustarCotaIA({ tenantId, limite: Number(limite) });
              setLoading(false);
              if (!res.ok) {
                toast.error(res.erro);
                return;
              }
              toast.success("Cota ajustada.");
              setOpen(false);
              router.refresh();
            }}
          >
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
