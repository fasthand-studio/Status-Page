import { formatDateTime, formatRelativeTime } from '@/lib/format';

export function TimeAgo({
  iso,
  now,
  className,
  fallback = 'never',
}: {
  iso: string | null;
  now?: Date;
  className?: string;
  fallback?: string;
}) {
  if (!iso) return <span className={className}>{fallback}</span>;
  return (
    <time dateTime={iso} title={formatDateTime(iso)} className={className}>
      {formatRelativeTime(iso, now)}
    </time>
  );
}
