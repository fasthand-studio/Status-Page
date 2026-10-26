'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    const interval = window.setInterval(refresh, seconds * 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [router, seconds]);

  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
      <span className="h-1.5 w-1.5 fh-round bg-primary" aria-hidden="true" />
      Auto-refresh · {seconds}s
    </span>
  );
}
