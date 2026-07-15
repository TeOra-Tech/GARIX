'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useVehicle, type VehicleRow } from '@/lib/vehicles/queries';
import { VehiclePhotoUploader } from '@/components/vehicles/photo-uploader';
import { ServiceHistory } from '@/components/vehicles/service-history';
import { Reminders } from '@/components/vehicles/reminders';
import { TransferPanel } from '@/components/vehicles/transfer-panel';

function vehicleName(v: VehicleRow): string {
  const make = v.vehicle_makes?.name ?? v.make_text;
  const model = v.vehicle_models?.name ?? v.model_text;
  return [v.year, make, model].filter(Boolean).join(' ') || 'Vehicle';
}

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const vehicle = useVehicle(id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/dashboard/vehicles" className="text-sm text-paper/60 hover:text-volt-bright">
        &larr; My vehicles
      </Link>

      {vehicle.isPending && <p className="mt-8 text-paper/60">Loading…</p>}
      {vehicle.isError && (
        <p role="alert" className="mt-8 text-danger">
          Could not load this vehicle — it may have been deleted or transferred.
        </p>
      )}

      {vehicle.data && (
        <>
          <header className="mt-6 flex flex-wrap items-center gap-6 rounded-hex border border-ink-line bg-ink-soft p-6">
            <VehiclePhotoUploader
              vehicleId={vehicle.data.id}
              photoPath={vehicle.data.photo_path}
              label={vehicleName(vehicle.data)}
            />
            <div>
              <h1 className="font-display text-2xl font-bold md:text-3xl">{vehicleName(vehicle.data)}</h1>
              <p className="mt-1 font-mono text-volt-bright">{vehicle.data.registration_number}</p>
              <p className="mt-2 text-sm text-paper/60">
                {[
                  vehicle.data.vehicle_engines?.label === 'custom'
                    ? vehicle.data.engine_size_custom
                    : vehicle.data.vehicle_engines?.label,
                  vehicle.data.fuel_type?.replace('_', ' '),
                  vehicle.data.mileage_km != null
                    ? `${vehicle.data.mileage_km.toLocaleString('en-IE')} km`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'No details yet'}
              </p>
              <Link
                href={`/dashboard/vehicles/${vehicle.data.id}/edit`}
                className="mt-3 inline-block text-sm font-semibold text-volt-bright hover:underline"
              >
                Edit details
              </Link>
            </div>
          </header>

          <div className="mt-10 space-y-12">
            <Reminders vehicleId={vehicle.data.id} />
            <ServiceHistory vehicleId={vehicle.data.id} />
            <TransferPanel vehicleId={vehicle.data.id} />
          </div>
        </>
      )}
    </main>
  );
}
