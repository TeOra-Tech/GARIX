'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useOwnedGarage } from '@/lib/garages/portal';
import { GarageNav } from '@/components/garages/garage-nav';
import { STATUS_BADGE } from '@/components/garages/status-badge';

export default function GarageDashLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const garage = useOwnedGarage(id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/dashboard/garages" className="text-sm text-paper/60 hover:text-volt-bright">
        &larr; My garages
      </Link>

      {garage.isPending && <p className="mt-6 text-paper/60">Loading garage…</p>}
      {garage.isError && (
        <p role="alert" className="mt-6 text-danger">
          Garage not found — it may have been transferred to a new owner.
        </p>
      )}

      {garage.data && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold md:text-3xl">{garage.data.name}</h1>
            {STATUS_BADGE(garage.data.status)}
            {garage.data.status === 'active' && (
              <Link href={`/garages/${garage.data.slug}`} className="text-sm text-volt-bright hover:underline">
                View public page →
              </Link>
            )}
          </div>
          <div className="mt-4">
            <GarageNav garageId={garage.data.id} />
          </div>
          {children}
        </>
      )}
    </div>
  );
}
