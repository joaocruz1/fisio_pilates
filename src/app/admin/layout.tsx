import { ArrowLeftIcon, SignOutIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { textos } from "@/lib/textos";
import { signOut } from "@/server/actions/auth";
import { requireAdmin } from "@/server/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdmin();
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <AdminSidebar role={ctx.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm">
          <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <Link href="/dashboard">
              <ArrowLeftIcon className="size-4" /> {textos.admin.voltar}
            </Link>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              <SignOutIcon className="size-4" /> {textos.admin.sair}
            </Button>
          </form>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
