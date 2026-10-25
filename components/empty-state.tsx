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
        'flex flex-col items-center justify-center fh-panel border border-dashed border-line bg-surface/50 px-6 py-12 text-center',
        className,
      )}
    >
      <InboxIcon className="h-7 w-7 text-muted" />
      <p className="mt-3 text-[18px] font-semibold tracking-[-0.02em]">{title}</p>
      <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-muted">{description}</p>
    </div>
  );
}
