'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useDeleteVehicle, useVehicles, type VehicleRow } from '@/lib/vehicles/queries';
import {
  fleetIsActive,
  syncFleetQuantity,
  useFleetSubscription,
  useMyAccount,
  FLEET_PRICE_EUR,
} from '@/lib/fleet/queries';
import { VehicleAvatar } from '@/components/dashboard/customer-overview';
import { TransferInbox } from '@/components/vehicles/transfer-inbox';

const INDIVIDUAL_LIMIT = 3;

function vehicleName(v: VehicleRow): string {
  const make = v.vehicle_makes?.name ?? v.make_text;
  const model = v.vehicle_models?.name ?? v.model_text;
  return [v.year, make, model].filter(Boolean).join(' ') || 'Vehicle';
}

function VehicleCard({ vehicle, onDeleted }: { vehicle: VehicleRow; onDeleted: () => void }) {
  const del = useDeleteVehicle();
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="rounded-hex border border-ink-line bg-ink-soft p-6">
      <Link href={`/dashboard/vehicles/${vehicle.id}`} className="flex items-start gap-4">
        <VehicleAvatar photoPath={vehicle.photo_path} label={vehicleName(vehicle)} />
        <div>
          <h2 className="font-display text-lg font-semibold hover:text-volt-bright">
            {vehicleName(vehicle)}
          </h2>
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
      </Link>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href={`/dashboard/vehicles/${vehicle.id}`} className="btn-primary !px-4 !py-2">
          History &amp; reminders
        </Link>
        <Link href={`/dashboard/vehicles/${vehicle.id}/edit`} className="btn-ghost !px-4 !py-2">
          Edit
        </Link>
        {confirming ? (
          <>
            <button
              type="button"
              className="btn-ghost !border-signal !px-4 !py-2 text-danger"
              onClick={() => del.mutate(vehicle.id, { onSuccess: onDeleted })}
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
        <p role="alert" className="mt-3 text-sm text-danger">
          Could not delete this vehicle. It may be attached to a service request.
        </p>
      )}
    </li>
  );
}

export default function VehiclesPage() {
  const vehicles = useVehicles();
  const account = useMyAccount();
  const isFleet = account.data?.account_type === 'fleet';
  const fleetSub = useFleetSubscription(isFleet);

  const count = vehicles.data?.length ?? 0;
  const atIndividualLimit = !isFleet && count >= INDIVIDUAL_LIMIT;
  const fleetBillingReady = fleetIsActive(fleetSub.data);
  const canAdd = isFleet ? fleetBillingReady : count < INDIVIDUAL_LIMIT;

  function afterDelete() {
    if (isFleet) void syncFleetQuantity();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">My vehicles</h1>
          {isFleet ? (
            <p className="mt-1 text-sm text-paper/60">
              Fleet account · {count} vehicle{count === 1 ? '' : 's'} · €{FLEET_PRICE_EUR}/vehicle per month
            </p>
          ) : (
            <p className="mt-1 text-sm text-paper/60">
              {count} of {INDIVIDUAL_LIMIT} vehicles used
            </p>
          )}
        </div>
        {canAdd ? (
          <Link href="/dashboard/vehicles/new" className="btn-primary !px-4 !py-2 text-sm">
            Add a vehicle
          </Link>
        ) : (
          <span
            className="cursor-not-allowed rounded-lg border border-ink-line px-4 py-2 text-sm text-paper/40"
            title={isFleet ? 'Set up billing to add vehicles' : 'Vehicle limit reached'}
          >
            Add a vehicle
          </span>
        )}
      </div>

      {/* Individual cap reached → upsell to Fleet */}
      {atIndividualLimit && (
        <div className="mt-6 rounded-hex border border-volt/40 bg-volt/10 p-5">
          <p className="text-sm">
            <span className="font-semibold">You&rsquo;ve reached the 3-vehicle limit.</span> Managing a
            fleet? A Fleet account gives you unlimited vehicles for €{FLEET_PRICE_EUR}/vehicle per month.
          </p>
          <Link href="/for-business" className="btn-primary mt-3 inline-flex !px-4 !py-2 text-sm">
            Learn about Fleet
          </Link>
        </div>
      )}

      {/* Fleet without active billing → prompt setup */}
      {isFleet && fleetSub.isSuccess && !fleetBillingReady && (
        <div className="mt-6 rounded-hex border border-warning/40 bg-warning/10 p-5">
          <p className="text-sm">
            <span className="font-semibold">Set up billing to add vehicles.</span> Your fleet is billed
            €{FLEET_PRICE_EUR} per vehicle each month. Add a payment method to get started.
          </p>
          <Link href="/dashboard/billing" className="btn-primary mt-3 inline-flex !px-4 !py-2 text-sm">
            Go to billing
          </Link>
        </div>
      )}

      <div className="mt-6">
        <TransferInbox />
      </div>

      {vehicles.isPending && <p className="mt-8 text-paper/60">Loading your vehicles…</p>}
      {vehicles.isError && (
        <p role="alert" className="mt-8 text-danger">
          Could not load your vehicles. Refresh to try again.
        </p>
      )}
      {vehicles.data?.length === 0 && (
        <div className="mt-8 rounded-hex border border-ink-line bg-ink-soft p-8 text-center">
          <p className="text-paper/70">No vehicles yet.</p>
          <p className="mt-2 text-sm text-paper/50">
            Add your car to post repair requests and get quotes from local garages.
          </p>
          {canAdd && (
            <Link href="/dashboard/vehicles/new" className="btn-primary mt-6 inline-flex">
              Add your first vehicle
            </Link>
          )}
        </div>
      )}
      {!!vehicles.data?.length && (
        <ul className="mt-8 space-y-4">
          {vehicles.data.map((v) => (
            <VehicleCard key={v.id} vehicle={v} onDeleted={afterDelete} />
          ))}
        </ul>
      )}
    </main>
  );
}
