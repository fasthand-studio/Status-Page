'use client';

export function ReloadButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className={className ?? 'fh-btn border border-line bg-surface px-4 text-ink hover:bg-primary hover:text-white'}
    >
      Reload
    </button>
  );
}
