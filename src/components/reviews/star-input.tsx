'use client';

import { cn } from '@/lib/utils';

/** Accessible 1–5 star picker: a radiogroup of five labelled radios. */
export function StarInput({
  name,
  label,
  value,
  onChange,
  error,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <div className="flex items-center justify-between gap-4">
        <legend className="text-sm text-paper/80">{label}</legend>
        <div className="flex" role="radiogroup" aria-label={label}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer p-0.5">
              <input
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  'text-2xl transition',
                  n <= value ? 'text-signal' : 'text-paper/20 hover:text-signal-soft',
                )}
              >
                ★
              </span>
              <span className="sr-only">{n} star{n > 1 ? 's' : ''}</span>
            </label>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="mt-1 text-sm text-signal">{error}</p>}
    </fieldset>
  );
}
