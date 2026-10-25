import { AlertIcon } from './icons';
import { ReloadButton } from './reload-button';

export function DataError({
  title = 'Status data could not be loaded',
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-4 fh-panel border border-bad/25 bg-bad-soft/60 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-bad" />
        <div>
          <p className="text-[18px] font-semibold tracking-[-0.02em]">{title}</p>
          <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-ink/70">
            {description ??
              'The monitoring database did not answer. Nothing is being assumed healthy while data is missing.'}
          </p>
        </div>
      </div>
      <ReloadButton />
    </div>
  );
}
