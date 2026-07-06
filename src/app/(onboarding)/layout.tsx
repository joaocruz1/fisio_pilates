import { textos } from "@/lib/textos";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <span className="text-lg font-semibold">{textos.app.nome}</span>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
