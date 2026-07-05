/**
 * Garix VAT calculation engine — Republic of Ireland.
 *
 * Parts VAT   = 23%   (standard rate)
 * Labour VAT  = 13.5% (reduced rate, repair services)
 *
 * Grand Total = Parts + Parts VAT + Labour + Labour VAT
 *
 * All money handled in integer cents to avoid float drift;
 * rates are injectable so admin-updated rates from `vat_rates`
 * flow through without a code change.
 */

export interface VatRates {
  parts: number;   // e.g. 0.23
  labour: number;  // e.g. 0.135
}

export const IRELAND_VAT: VatRates = { parts: 0.23, labour: 0.135 };

export interface VatBreakdown {
  partsNet: number;
  labourNet: number;
  partsVat: number;
  labourVat: number;
  totalVat: number;
  grandTotal: number;
  rates: VatRates;
}

const toCents = (eur: number): number => Math.round(eur * 100);
const toEuros = (cents: number): number => cents / 100;

/** Round half-up at cent precision, matching the DB's numeric rounding. */
function vatCents(netCents: number, rate: number): number {
  return Math.round(netCents * rate);
}

export function calculateVat(
  partsNet: number,
  labourNet: number,
  rates: VatRates = IRELAND_VAT,
): VatBreakdown {
  if (partsNet < 0 || labourNet < 0) {
    throw new Error('Costs cannot be negative');
  }
  const p = toCents(partsNet);
  const l = toCents(labourNet);
  const pv = vatCents(p, rates.parts);
  const lv = vatCents(l, rates.labour);

  return {
    partsNet: toEuros(p),
    labourNet: toEuros(l),
    partsVat: toEuros(pv),
    labourVat: toEuros(lv),
    totalVat: toEuros(pv + lv),
    grandTotal: toEuros(p + l + pv + lv),
    rates,
  };
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(amount);
}
