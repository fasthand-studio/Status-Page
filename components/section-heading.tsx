import Link from 'next/link';
import { ChevronRightIcon } from './icons';

export function SectionHeading({
  title,
  description,
  href,
  linkLabel,
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h2 className="text-[20px] font-medium leading-tight tracking-[-0.01em]">{title}</h2>
        {description && <p className="mt-0.5 max-w-2xl text-[14px] text-muted">{description}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-[15px] font-medium text-primary hover:underline"
        >
          {linkLabel ?? 'View all'}
          <ChevronRightIcon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
