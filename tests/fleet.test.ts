import { describe, expect, it } from 'vitest';
import { isDuplicateReg, isFleetBillingError, isVehicleLimitError } from '@/lib/vehicles/queries';
import { fleetIsActive, FLEET_PRICE_EUR } from '@/lib/fleet/queries';

describe('vehicle limit error helpers', () => {
  it('detects the individual 3-vehicle cap error', () => {
    expect(isVehicleLimitError({ message: 'VEHICLE_LIMIT_REACHED: ...' })).toBe(true);
    expect(isVehicleLimitError({ message: 'something else' })).toBe(false);
    expect(isVehicleLimitError(null)).toBe(false);
  });

  it('detects the fleet-billing-required error', () => {
    expect(isFleetBillingError({ message: 'FLEET_BILLING_REQUIRED: set up billing' })).toBe(true);
    expect(isFleetBillingError({ message: 'nope' })).toBe(false);
  });

  it('keeps duplicate-reg detection separate from the limit errors', () => {
    expect(isDuplicateReg({ code: '23505' })).toBe(true);
    expect(isVehicleLimitError({ code: '23505' })).toBe(false);
  });
});

describe('fleetIsActive', () => {
  it('is true only for active/trialing subscriptions', () => {
    expect(fleetIsActive({ status: 'active' } as never)).toBe(true);
    expect(fleetIsActive({ status: 'trialing' } as never)).toBe(true);
    expect(fleetIsActive({ status: 'past_due' } as never)).toBe(false);
    expect(fleetIsActive({ status: 'incomplete' } as never)).toBe(false);
    expect(fleetIsActive(null)).toBe(false);
    expect(fleetIsActive(undefined)).toBe(false);
  });
});

describe('fleet pricing', () => {
  it('is €5 per vehicle per month', () => {
    expect(FLEET_PRICE_EUR).toBe(5);
  });
});
