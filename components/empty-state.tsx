import { cn } from '@/lib/cn';
import { InboxIcon } from './icons';

export function EmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center fh-card border border-dashed border-line bg-surface-soft px-6 py-10 text-center',
        className,
      )}
    >
      <InboxIcon className="h-6 w-6 text-muted" />
      <p className="mt-2.5 text-[17px] font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-[14px] leading-relaxed text-muted">{description}</p>
    </div>
  );
}
