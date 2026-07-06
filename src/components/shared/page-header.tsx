export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b px-4 py-4 md:px-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        {children ? <div className="flex items-center gap-2">{children}</div> : null}
      </div>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
