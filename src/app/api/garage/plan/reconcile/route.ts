import { NextResponse } from 'next/server';
import { reconcileGarage, requireGarageOwner } from '@/lib/garage-plan/server';

/** Pull the garage Pro subscription state from Stripe into the DB and return it. */
export async function POST(request: Request) {
  const { garageId } = await request.json().catch(() => ({ garageId: '' }));
  let ctx;
  try {
    ctx = await requireGarageOwner(garageId);
  } catch (e) {
    const err = e as { status: number; code: string };
    return NextResponse.json({ error: err.code }, { status: err.status });
  }
  try {
    const row = await reconcileGarage(ctx.admin, garageId);
    return NextResponse.json({ subscription: row ?? null });
  } catch {
    return NextResponse.json({ error: 'RECONCILE_FAILED' }, { status: 500 });
  }
}
