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
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div>
        <h2 className="text-[15px] font-semibold leading-tight">{title}</h2>
        {description && <p className="mt-0.5 max-w-2xl text-[12px] text-muted">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="text-[12px] font-medium text-primary hover:underline">
          {linkLabel ?? 'View all'}
        </Link>
      )}
    </div>
  );
}
