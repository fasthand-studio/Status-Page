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
        'flex flex-col gap-5 border-b border-line pb-6 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="max-w-2xl">
        <h1 className="text-balance text-[clamp(1.85rem,3.4vw,2.6rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-xl text-[17px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}
