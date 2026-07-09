'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { isDuplicateReg, useUpdateVehicle, useVehicle } from '@/lib/vehicles/queries';
import { VehicleForm } from '@/components/vehicles/vehicle-form';

export default function EditVehiclePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const vehicle = useVehicle(id);
  const update = useUpdateVehicle(id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/dashboard/vehicles" className="text-sm text-paper/60 hover:text-volt-bright">
        &larr; My vehicles
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">Edit vehicle</h1>

      {vehicle.isPending && <p className="mt-8 text-paper/60">Loading…</p>}
      {vehicle.isError && (
        <p role="alert" className="mt-8 text-danger">
          Could not load this vehicle — it may have been deleted.
        </p>
      )}
      {vehicle.data && (
        <div className="mt-8">
          <VehicleForm
            initial={vehicle.data}
            submitLabel="Save changes"
            pending={update.isPending}
            serverError={
              update.isError
                ? isDuplicateReg(update.error)
                  ? 'You already have another vehicle with that registration.'
                  : 'Could not save your changes. Try again.'
                : null
            }
            onSubmit={(data) =>
              update.mutate(data, { onSuccess: () => router.push('/dashboard/vehicles') })
            }
          />
        </div>
      )}
    </main>
  );
}
