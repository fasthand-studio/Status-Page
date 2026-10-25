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
    <Link href="/" className={cn('group flex items-baseline gap-2', className)}>
      <span className="text-[20px] font-semibold leading-none tracking-[-0.02em]">FastHand</span>
      <span className="text-[15px] leading-none text-muted">{label}</span>
    </Link>
  );
}
