'use client';

import { useGarageProAccess } from '@/lib/garage-pro/queries';
import { ProUpsell } from '@/components/garages/pro-upsell';

/** Wraps a Pro-only tab. Shows an upsell for Basic garages (when plans are on). */
export function ProGate({
  garageId,
  feature,
  body,
  children,
}: {
  garageId: string;
  feature: string;
  body?: string;
  children: React.ReactNode;
}) {
  const { gated } = useGarageProAccess(garageId);
  if (gated) return <ProUpsell garageId={garageId} feature={feature} body={body} />;
  return <>{children}</>;
}
