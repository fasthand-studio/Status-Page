import Link from 'next/link';

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
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[24px] font-semibold leading-tight tracking-[-0.02em]">{title}</h2>
        {description && <p className="mt-1 max-w-xl text-[15px] text-muted">{description}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="text-[17px] font-medium underline decoration-lime-deep decoration-2 underline-offset-4 hover:decoration-ink"
        >
          {linkLabel ?? 'View all'}
        </Link>
      )}
    </div>
  );
}
