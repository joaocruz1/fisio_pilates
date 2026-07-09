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
import { criarAdmin, revogarAdmin } from "@/server/actions/admin";

export function NovoAdminButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"super_admin" | "support" | "finance">("support");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{textos.admin.admins.novo}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{textos.admin.admins.novo}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="email">{textos.admin.admins.email}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="role">{textos.admin.admins.role}</Label>
            <select
              id="role"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as "super_admin" | "support" | "finance")}
            >
              <option value="super_admin">super_admin</option>
              <option value="support">support</option>
              <option value="finance">finance</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={loading || !email}
            onClick={async () => {
              setLoading(true);
              const res = await criarAdmin({ email, role });
              setLoading(false);
              if (!res.ok) {
                toast.error(res.erro);
                return;
              }
              toast.success("Admin criado.");
              setOpen(false);
              setEmail("");
              router.refresh();
            }}
          >
            {loading ? "Criando..." : textos.admin.admins.criar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RevogarButton({ adminId }: { adminId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="destructive"
      disabled={loading}
      onClick={async () => {
        if (!confirm(textos.admin.admins.confirmar)) return;
        setLoading(true);
        const res = await revogarAdmin({ adminId });
        setLoading(false);
        if (!res.ok) {
          toast.error(res.erro);
          return;
        }
        toast.success("Admin revogado.");
        router.refresh();
      }}
    >
      {loading ? "Revogando..." : textos.admin.admins.revogar}
    </Button>
  );
}
