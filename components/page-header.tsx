import { cn } from '@/lib/cn';

export function PageHeader({
  title,
  description,
  aside,
  className,
}: {
  title: string;
  description?: string;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6',
        className,
      )}
    >
      <div className="min-w-0 max-w-2xl">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.015em]">{title}</h1>
        {description && (
          <p className="mt-1 text-[15px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {aside && <div className="shrink-0 text-[14px] text-muted">{aside}</div>}
    </div>
  );
}
