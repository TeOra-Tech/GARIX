'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useDeleteVehicle, useVehicles, type VehicleRow } from '@/lib/vehicles/queries';

function vehicleName(v: VehicleRow): string {
  const make = v.vehicle_makes?.name ?? v.make_text;
  const model = v.vehicle_models?.name ?? v.model_text;
  return [v.year, make, model].filter(Boolean).join(' ') || 'Vehicle';
}

function VehicleCard({ vehicle }: { vehicle: VehicleRow }) {
  const del = useDeleteVehicle();
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="rounded-hex border border-ink-line bg-ink-soft p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{vehicleName(vehicle)}</h2>
          <p className="mt-1 font-mono text-sm text-volt-bright">{vehicle.registration_number}</p>
          <p className="mt-2 text-sm text-paper/60">
            {[
              vehicle.vehicle_engines?.label === 'custom'
                ? vehicle.engine_size_custom
                : vehicle.vehicle_engines?.label,
              vehicle.fuel_type?.replace('_', ' '),
              vehicle.mileage_km != null ? `${vehicle.mileage_km.toLocaleString('en-IE')} km` : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'No details yet'}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-3 text-sm">
        <Link href={`/dashboard/vehicles/${vehicle.id}/edit`} className="btn-ghost !px-4 !py-2">
          Edit
        </Link>
        {confirming ? (
          <>
            <button
              type="button"
              className="btn-ghost !border-signal !px-4 !py-2 text-signal"
              onClick={() => del.mutate(vehicle.id)}
              disabled={del.isPending}
            >
              {del.isPending ? 'Deleting…' : 'Confirm delete'}
            </button>
            <button type="button" className="btn-ghost !px-4 !py-2" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="btn-ghost !px-4 !py-2" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
      </div>
      {del.isError && (
        <p role="alert" className="mt-3 text-sm text-signal">
          Could not delete this vehicle. It may be attached to a service request.
        </p>
      )}
    </li>
  );
}

export default function VehiclesPage() {
  const vehicles = useVehicles();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">My vehicles</h1>
        <Link href="/dashboard/vehicles/new" className="btn-primary !px-4 !py-2 text-sm">
          Add a vehicle
        </Link>
      </div>

      {vehicles.isPending && <p className="mt-8 text-paper/60">Loading your vehicles…</p>}
      {vehicles.isError && (
        <p role="alert" className="mt-8 text-signal">
          Could not load your vehicles. Refresh to try again.
        </p>
      )}
      {vehicles.data?.length === 0 && (
        <div className="mt-8 rounded-hex border border-ink-line bg-ink-soft p-8 text-center">
          <p className="text-paper/70">No vehicles yet.</p>
          <p className="mt-2 text-sm text-paper/50">
            Add your car to post repair requests and get quotes from local garages.
          </p>
          <Link href="/dashboard/vehicles/new" className="btn-primary mt-6 inline-flex">
            Add your first vehicle
          </Link>
        </div>
      )}
      {!!vehicles.data?.length && (
        <ul className="mt-8 space-y-4">
          {vehicles.data.map((v) => (
            <VehicleCard key={v.id} vehicle={v} />
          ))}
        </ul>
      )}
    </main>
  );
}
