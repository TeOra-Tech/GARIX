import { describe, it, expect } from 'vitest';
import { garageSchema, registerGarageSchema, openingHoursSchema } from '@/lib/validation/garage';
import { slugify, slugCandidates } from '@/lib/garages/slug';

const base = {
  name: 'Naas Road Motors',
  contactPerson: 'Pat Murphy',
  phone: '045 123 456',
  email: '',
  website: '',
  description: '',
  yearsInBusiness: '12',
  serviceRadiusKm: '25',
  isEvSpecialist: false,
  offersCollection: true,
  openingHours: { mon: { open: '09:00', close: '18:00' }, sat: { open: '09:00', close: '13:00' } },
  address: { line1: 'Unit 4, Naas Road Business Park', line2: '', town: 'Naas', county: 'Kildare', eircode: '' },
  lat: 53.2191,
  lng: -6.6598,
  serviceCategoryIds: ['4c8e2a4e-3f0b-4b58-9a4e-111111111111'],
};

describe('garage schema', () => {
  it('accepts a valid registration and normalises the phone', () => {
    const r = registerGarageSchema.parse(base);
    expect(r.phone).toBe('045123456');
    expect(r.email).toBeNull();
    expect(r.yearsInBusiness).toBe(12);
  });

  it('requires a pinned location at registration but not for edits', () => {
    const noPin = { ...base, lat: null, lng: null };
    expect(registerGarageSchema.safeParse(noPin).success).toBe(false);
    expect(garageSchema.safeParse(noPin).success).toBe(true);
  });

  it('requires at least one service and a sane radius', () => {
    expect(registerGarageSchema.safeParse({ ...base, serviceCategoryIds: [] }).success).toBe(false);
    expect(registerGarageSchema.safeParse({ ...base, serviceRadiusKm: '0' }).success).toBe(false);
    expect(registerGarageSchema.safeParse({ ...base, serviceRadiusKm: '900' }).success).toBe(false);
  });

  it('rejects UK-style phone numbers and bad URLs', () => {
    expect(registerGarageSchema.safeParse({ ...base, phone: '+44 20 7946 0958' }).success).toBe(false);
    expect(registerGarageSchema.safeParse({ ...base, website: 'not-a-url' }).success).toBe(false);
  });
});

describe('opening hours', () => {
  it('accepts HH:MM ranges and rejects inverted ones', () => {
    expect(openingHoursSchema.safeParse({ mon: { open: '08:30', close: '17:30' } }).success).toBe(true);
    expect(openingHoursSchema.safeParse({ mon: { open: '18:00', close: '09:00' } }).success).toBe(false);
    expect(openingHoursSchema.safeParse({ mon: { open: '8:30', close: '17:30' } }).success).toBe(false);
  });
});

describe('slug generation', () => {
  it('kebab-cases names and handles Irish characters', () => {
    expect(slugify('Naas Road Motors')).toBe('naas-road-motors');
    expect(slugify("O'Brien & Sons Garage")).toBe('o-brien-and-sons-garage');
    expect(slugify('Sí​ochána Motors!!')).toContain('ochana');
  });

  it('produces numbered fallbacks for collisions', () => {
    expect(slugCandidates('Joe Motors', 3)).toEqual(['joe-motors', 'joe-motors-2', 'joe-motors-3']);
  });
});
