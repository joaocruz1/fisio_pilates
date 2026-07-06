import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { requireOnboarding } from "@/server/auth";

export const metadata = { title: "Bem-vinda" };

export default async function OnboardingPage() {
  const { profile, tenant } = await requireOnboarding();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Bem-vinda! 👋</h1>
        <p className="text-sm text-muted-foreground">
          Complete seu perfil para começar a usar o{" "}
          <span className="font-medium">FisioPilates</span>.
        </p>
      </div>
      <OnboardingForm defaultFullName={profile.full_name} defaultStudioName={tenant.name} />
    </div>
  );
}
