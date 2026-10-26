import Link from 'next/link';
import { cn } from '@/lib/cn';

export function Brand({
  label = 'Status',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Link href="/" className={cn('flex items-baseline gap-1.5', className)}>
      <span className="text-[15px] font-semibold leading-none tracking-[-0.01em] text-ink">FastHand</span>
      <span className="text-[13px] leading-none text-muted">{label}</span>
    </Link>
  );
}
