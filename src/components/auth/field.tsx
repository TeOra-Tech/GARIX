import { cn } from '@/lib/utils';

export const inputCls =
  'w-full rounded-lg border border-ink-line bg-ink-soft px-4 py-3 text-paper ' +
  'placeholder:text-paper/40 transition focus:border-volt';

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-paper/80">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className={cn('mt-1.5 text-sm text-signal')}>
          {error}
        </p>
      )}
    </div>
  );
}
