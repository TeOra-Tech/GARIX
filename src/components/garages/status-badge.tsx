import { cn } from '@/lib/utils';

const STYLES: Record<string, string> = {
  active: 'border-success/50 bg-success/10 text-success',
  pending_verification: 'border-warning/50 bg-warning/10 text-warning',
  pending_approval: 'border-warning/50 bg-warning/10 text-warning',
  suspended: 'border-danger/50 bg-danger/10 text-danger',
  rejected: 'border-danger/50 bg-danger/10 text-danger',
};

export function STATUS_BADGE(status: string) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        STYLES[status] ?? 'border-ink-line text-paper/60',
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
