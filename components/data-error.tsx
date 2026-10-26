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
    <div className="flex flex-col items-start gap-3 fh-card border border-bad/25 bg-bad-soft/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-bad" />
        <div>
          <p className="text-[17px] font-semibold">{title}</p>
          <p className="mt-0.5 max-w-xl text-[14px] leading-relaxed text-ink/70">
            {description ??
              'The monitoring database did not answer. Nothing is being assumed healthy while data is missing.'}
          </p>
        </div>
      </div>
      <ReloadButton />
    </div>
  );
}
