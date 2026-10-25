import Link from 'next/link';
import { cn } from '@/lib/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn('h-9 w-9', className)}>
      <rect width="64" height="64" rx="18" fill="#0A0E0C" />
      <path d="M20 17h28v9H29v8h14v9H29v16h-9V17Z" fill="#5200FE" />
      <circle cx="51" cy="49" r="5" fill="#5200FE" />
    </svg>
  );
}

export function Brand({
  label = 'Status',
  className,
  markClassName,
}: {
  label?: string;
  className?: string;
  markClassName?: string;
}) {
  return (
    <Link href="/" className={cn('group flex items-baseline gap-2', className)}>
      <LogoMark className={cn('h-8 w-8 translate-y-1', markClassName)} />
      <span className="text-[20px] font-semibold leading-none tracking-[-0.02em]">FastHand</span>
      <span className="text-[15px] leading-none text-muted">{label}</span>
    </Link>
  );
}
