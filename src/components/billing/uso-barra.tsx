import { Progress } from "@/components/ui/progress";

export function UsageBar({
  label,
  usado,
  limite,
}: {
  label: string;
  usado: number;
  limite: number | null;
}) {
  if (limite === null) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground">{usado} / ilimitado</span>
        </div>
      </div>
    );
  }
  const pct = limite > 0 ? Math.min(100, Math.round((usado / limite) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {usado} / {limite}
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}
