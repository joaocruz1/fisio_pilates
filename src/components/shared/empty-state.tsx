import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: IconCmp,
  title,
  description,
  action,
  className,
}: {
  icon?: Icon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center",
        className,
      )}
    >
      {IconCmp ? (
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <IconCmp className="size-7" weight="duotone" />
        </span>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
