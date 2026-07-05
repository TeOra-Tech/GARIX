'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isDuplicateReg, useCreateVehicle } from '@/lib/vehicles/queries';
import { VehicleForm } from '@/components/vehicles/vehicle-form';

export default function NewVehiclePage() {
  const router = useRouter();
  const create = useCreateVehicle();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/dashboard/vehicles" className="text-sm text-paper/60 hover:text-volt-bright">
        &larr; My vehicles
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">Add a vehicle</h1>
      <p className="mt-2 text-paper/60">
        Enter the reg and we&rsquo;ll try to fill in the rest — or add the details yourself.
      </p>

      <div className="mt-8">
        <VehicleForm
          submitLabel="Add vehicle"
          pending={create.isPending}
          serverError={
            create.isError
              ? isDuplicateReg(create.error)
                ? 'You already have a vehicle with that registration.'
                : 'Could not save the vehicle. Try again.'
              : null
          }
          onSubmit={(data) =>
            create.mutate(data, { onSuccess: () => router.push('/dashboard/vehicles') })
          }
        />
      </div>
    </main>
  );
}
