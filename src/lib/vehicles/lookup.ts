/**
 * Vehicle lookup integration layer (docs/ARCHITECTURE.md).
 * Swap in Cartell/MotorCheck later; manual entry is the day-one source.
 */
export type RegLookupResult = {
  source: 'manual' | 'cartell' | 'motorcheck';
  /** null → no automatic match; the form falls back to manual entry. */
  data: {
    make: string;
    model: string;
    year: number | null;
    engineSize: string | null;
    fuelType: string | null;
    raw: unknown;
  } | null;
};

export async function lookupByReg(_reg: string): Promise<RegLookupResult> {
  return { source: 'manual', data: null };
}

/** Normalise an Irish registration for storage: uppercase, dash-separated. */
export function normaliseReg(reg: string): string {
  return reg.trim().toUpperCase().replace(/[\s-]+/g, '-');
}
