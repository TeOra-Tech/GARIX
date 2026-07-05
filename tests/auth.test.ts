import { describe, it, expect } from 'vitest';
import { registerSchema, mobileSchema, eircodeSchema, otpSchema } from '@/lib/validation/auth';
import { roleHome, safeNext } from '@/lib/auth/roles';

const validInput = {
  fullName: 'Aoife Byrne',
  email: 'Aoife.Byrne@Example.IE',
  mobile: '087 123 4567',
  address: {
    line1: '12 Sycamore Road',
    line2: '',
    town: 'Naas',
    county: 'Kildare',
    eircode: 'w91 x2f3',
  },
  termsAccepted: true as const,
  marketingOptIn: false,
};

describe('registration schema', () => {
  it('accepts a valid Irish registration and normalises email + mobile', () => {
    const r = registerSchema.parse(validInput);
    expect(r.email).toBe('aoife.byrne@example.ie');
    expect(r.mobile).toBe('0871234567');
    expect(r.address.eircode).toBe('W91 X2F3');
  });

  it('rejects when terms are not accepted', () => {
    const r = registerSchema.safeParse({ ...validInput, termsAccepted: false });
    expect(r.success).toBe(false);
  });

  it('rejects a non-Irish county', () => {
    const r = registerSchema.safeParse({
      ...validInput,
      address: { ...validInput.address, county: 'Yorkshire' },
    });
    expect(r.success).toBe(false);
  });

  it('allows the eircode to be omitted', () => {
    const r = registerSchema.safeParse({
      ...validInput,
      address: { ...validInput.address, eircode: '' },
    });
    expect(r.success).toBe(true);
  });
});

describe('mobile number validation', () => {
  it.each(['0871234567', '086 123 4567', '+353 85 123 4567', '083-123-4567'])(
    'accepts %s',
    (v) => expect(mobileSchema.safeParse(v).success).toBe(true),
  );

  it.each(['0511234567', '12345', '08712345', '+44 7911 123456'])(
    'rejects %s',
    (v) => expect(mobileSchema.safeParse(v).success).toBe(false),
  );

  it('normalises +353 numbers by stripping separators', () => {
    expect(mobileSchema.parse('+353 87 123 4567')).toBe('+353871234567');
  });
});

describe('eircode validation', () => {
  it.each(['D02 X285', 'd02x285', 'W91 X2F3', 'D6W 1234'])(
    'accepts %s',
    (v) => expect(eircodeSchema.safeParse(v).success).toBe(true),
  );

  it.each(['XYZ', '123 4567', 'D02X28'])(
    'rejects %s',
    (v) => expect(eircodeSchema.safeParse(v).success).toBe(false),
  );
});

describe('otp code validation', () => {
  it('accepts exactly six digits', () => {
    expect(otpSchema.safeParse(' 123456 ').success).toBe(true);
    expect(otpSchema.safeParse('12345').success).toBe(false);
    expect(otpSchema.safeParse('12345a').success).toBe(false);
  });
});

describe('role routing', () => {
  it('sends admins to /admin and everyone else to /dashboard', () => {
    expect(roleHome('admin')).toBe('/admin');
    expect(roleHome('customer')).toBe('/dashboard');
    expect(roleHome('garage_owner')).toBe('/dashboard');
    expect(roleHome(null)).toBe('/dashboard');
    expect(roleHome(undefined)).toBe('/dashboard');
  });

  it('only allows same-origin relative next paths', () => {
    expect(safeNext('/dashboard/vehicles')).toBe('/dashboard/vehicles');
    expect(safeNext('https://evil.example')).toBeNull();
    expect(safeNext('//evil.example')).toBeNull();
    expect(safeNext(null)).toBeNull();
    expect(safeNext('')).toBeNull();
  });
});
