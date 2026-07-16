'use client';

import Link from 'next/link';
import { useVehicles, type VehicleRow } from '@/lib/vehicles/queries';
import { useUpcomingReminders, useVehiclePhotoUrl } from '@/lib/vehicles/care';
import { reminderTypeLabel } from '@/lib/validation/vehicle-care';
import { TransferInbox } from '@/components/vehicles/transfer-inbox';
import { GarageTransferInbox } from '@/components/garages/transfer-inbox';
import { cn } from '@/lib/utils';

function vehicleName(v: VehicleRow): string {
  const make = v.vehicle_makes?.name ?? v.make_text;
  const model = v.vehicle_models?.name ?? v.model_text;
  return [v.year, make, model].filter(Boolean).join(' ') || 'Vehicle';
}

export function VehicleAvatar({
  photoPath,
  label,
  size = 'md',
}: {
  photoPath: string | null;
  label: string;
  size?: 'md' | 'lg';
}) {
  const photo = useVehiclePhotoUrl(photoPath);
  const cls = size === 'lg' ? 'h-24 w-24 text-3xl' : 'h-14 w-14 text-xl';
  return photo.data ? (
    // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived Supabase URL
    <img
      src={photo.data}
      alt={label}
      className={cn(cls, 'shrink-0 rounded-full border border-ink-line object-cover')}
    />
  ) : (
    <div
      aria-hidden
      className={cn(
        cls,
        'flex shrink-0 items-center justify-center rounded-full border border-ink-line bg-volt/10 font-display font-bold text-volt',
      )}
    >
      {label.replace(/[^A-Za-z]/g, '').slice(0, 1).toUpperCase() || 'G'}
    </div>
  );
}

function dueBadge(dueDate: string): { text: string; cls: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { text: 'Overdue', cls: 'bg-danger/10 text-danger border-danger/40' };
  if (days === 0) return { text: 'Due today', cls: 'bg-danger/10 text-danger border-danger/40' };
  if (days <= 14) return { text: `In ${days} day${days === 1 ? '' : 's'}`, cls: 'bg-warning/10 text-warning border-warning/40' };
  return {
    text: due.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' }),
    cls: 'bg-ink-soft text-paper/70 border-ink-line',
  };
}

function UpcomingReminders() {
  const reminders = useUpcomingReminders();
  return (
    <section className="rounded-hex border border-ink-line bg-ink-soft p-6">
      <h2 className="font-display text-lg font-semibold">Upcoming maintenance</h2>
      {reminders.isPending && <p className="mt-3 text-sm text-paper/60">Checking your reminders…</p>}
      {reminders.data?.length === 0 && (
        <p className="mt-3 text-sm text-paper/60">
          No reminders yet. Open a vehicle under My vehicles to set up NCT, oil service, insurance
          and road tax reminders.
        </p>
      )}
      {!!reminders.data?.length && (
        <ul className="mt-4 space-y-3">
          {reminders.data.map((r) => {
            const badge = dueBadge(r.due_date);
            return (
              <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium">{r.title || reminderTypeLabel(r.reminder_type)}</span>
                  <span className="text-paper/60"> · {r.vehicles?.registration_number}</span>
                </span>
                <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold', badge.cls)}>
                  {badge.text}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function VehiclesSnapshot() {
  const vehicles = useVehicles();
  return (
    <section className="rounded-hex border border-ink-line bg-ink-soft p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">My vehicles</h2>
        <Link href="/dashboard/vehicles/new" className="text-sm font-semibold text-volt-bright hover:underline">
          Add a vehicle
        </Link>
      </div>
      {vehicles.isPending && <p className="mt-3 text-sm text-paper/60">Loading your vehicles…</p>}
      {vehicles.data?.length === 0 && (
        <p className="mt-3 text-sm text-paper/60">
          Add your car to keep its service history and post repair requests.
        </p>
      )}
      {!!vehicles.data?.length && (
        <ul className="mt-4 space-y-3">
          {vehicles.data.map((v) => (
            <li key={v.id}>
              <Link
                href={`/dashboard/vehicles/${v.id}`}
                className="flex items-center gap-4 rounded-lg border border-transparent p-2 transition hover:border-volt/40 hover:bg-volt/5"
              >
                <VehicleAvatar photoPath={v.photo_path} label={vehicleName(v)} />
                <span>
                  <span className="block font-medium">{vehicleName(v)}</span>
                  <span className="block font-mono text-sm text-volt-bright">{v.registration_number}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CustomerOverview() {
  return (
    <div className="mt-8 space-y-6">
      <TransferInbox />
      <GarageTransferInbox />
      <div className="grid gap-6 md:grid-cols-2">
        <VehiclesSnapshot />
        <UpcomingReminders />
      </div>
    </div>
  );
}
