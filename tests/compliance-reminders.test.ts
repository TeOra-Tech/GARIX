import { describe, expect, it } from 'vitest';
import {
  addMonthsIso,
  completeReminderDates,
  nctExpiryFromTest,
  nctFirstDue,
  vehicleAge,
  nctExempt,
  nctLastTwoYearDeadline,
  nctTenthAnniversary,
  nctNotDueYet,
  nctTermYears,
  noticeDaysBefore,
  noticeSummary,
  reminderSchema,
} from '@/lib/validation/vehicle-care';

const y = (year: number) => ({ year });
const reg = (firstRegistrationDate: string) => ({ year: Number(firstRegistrationDate.slice(0, 4)), firstRegistrationDate });

const base = { title: '', startDate: '', dueDate: '', durationMonths: '', dueMileageKm: '', intervalMonths: '', notes: '' };

describe('reminder dates', () => {
  it('adds calendar months and clamps to the month end', () => {
    expect(addMonthsIso('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsIso('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonthsIso('2026-11-15', -3)).toBe('2026-08-15');
    expect(addMonthsIso('2026-11-15', 24)).toBe('2028-11-15');
  });

  it('follows the official NCT test frequency', () => {
    expect(nctNotDueYet(y(2024), '2026-11-17')).toBe(true); // first test at 4
    expect(nctNotDueYet(y(2022), '2026-11-17')).toBe(false);
    expect(nctTermYears(y(2020), '2026-05-10')).toBe(2); // 4–9: every 2 years
    expect(nctTermYears(y(2016), '2026-05-10')).toBe(1); // 10th-anniversary test on: yearly
    expect(nctTermYears(y(1994), '2026-05-10')).toBe(2); // 30–39: every 2 years
    expect(nctTermYears(y(1985), '2026-05-10')).toBe(0); // 40+: not tested
    expect(nctExempt(y(1985), '2026-11-17')).toBe(true);
  });

  it('keeps due dates on schedule for on-time and late tests', () => {
    // Up to 90 days early: next due date runs on from the old expiry.
    expect(nctExpiryFromTest(y(2020), '2026-12-31', '2027-03-01')).toBe('2029-03-01');
    // Late: still the next due date after the old expiry (a shorter certificate).
    expect(nctExpiryFromTest(y(2020), '2027-04-01', '2027-03-01')).toBe('2029-03-01');
    // 10th-anniversary test on time: 1 year.
    expect(nctExpiryFromTest(y(2017), '2027-01-15', '2027-03-01')).toBe('2028-03-01');
  });

  it('gives a fresh certificate for voluntary early testing (more than 90 days early)', () => {
    expect(nctExpiryFromTest(y(2020), '2026-10-01', '2027-03-01')).toBe('2028-10-01');
    // Car turning 10 on 1 Mar 2027, passed in Nov 2026 aged 9: the last 2-year certificate.
    expect(nctExpiryFromTest(y(2017), '2026-11-01', '2027-03-01')).toBe('2028-11-01');
  });

  it('suggests an expiry from the pass date when there is no previous one', () => {
    expect(nctExpiryFromTest(y(2020), '2026-05-10')).toBe('2028-05-10');
    expect(nctExpiryFromTest(y(2010), '2026-05-10')).toBe('2027-05-10');
    expect(nctExpiryFromTest(y(1985), '2026-05-10')).toBe('');
  });

  it('uses the notice windows from the spec', () => {
    expect(noticeDaysBefore('nct')).toEqual([30, 7]);
    expect(noticeDaysBefore('road_tax')).toEqual([14, 7]);
    expect(noticeDaysBefore('insurance')).toEqual([30, 7]);
    expect(noticeDaysBefore('service')).toEqual([14, 7]);
    expect(noticeSummary('road_tax')).toContain('14 and 7 days before');
    expect(noticeSummary('nct')).toContain('90 days early');
  });

  it('adds a 120-day notice when the NCT runs out on the car’s 10th anniversary', () => {
    expect(nctTenthAnniversary(y(2018), '2028-03-01')).toBe(true);
    expect(nctTenthAnniversary(y(2018), '2027-03-01')).toBe(false);
    expect(nctTenthAnniversary(null, '2028-03-01')).toBe(false);
    expect(noticeDaysBefore('nct', y(2018), '2028-03-01')).toEqual([120, 30, 7]);
    expect(noticeDaysBefore('nct', y(2020), '2028-03-01')).toEqual([30, 7]);
    expect(noticeSummary('nct', y(2018), '2028-03-01')).toContain('2-year certificate for the last time');
    expect(nctLastTwoYearDeadline('2028-03-01')).toBe('2027-12-01'); // 91 days before
  });


  it('fills in the dates the user didn’t type', () => {
    expect(completeReminderDates({ ...base, reminderType: 'nct', startDate: '2026-05-10' }, y(2020)).dueDate).toBe('2028-05-10');
    expect(completeReminderDates({ ...base, reminderType: 'insurance', startDate: '2026-03-01', durationMonths: '12' }, null).dueDate).toBe('2027-03-01');
    expect(completeReminderDates({ ...base, reminderType: 'road_tax', dueDate: '2026-12-31', durationMonths: '6' }, null).startDate).toBe('2026-06-30');
  });
});

describe('reminder form rules', () => {
  it('accepts an NCT with just the due date (a car’s first test)', () => {
    expect(reminderSchema.safeParse({ ...base, reminderType: 'nct', dueDate: '2028-05-10' }).success).toBe(true);
  });

  it('no longer accepts consumable reminders', () => {
    expect(reminderSchema.safeParse({ ...base, reminderType: 'oil_service', dueDate: '2027-01-01' }).success).toBe(false);
  });

  it('only accepts 3, 6 or 12 months of motor tax', () => {
    expect(reminderSchema.safeParse({ ...base, reminderType: 'road_tax', dueDate: '2027-01-31', durationMonths: '4' }).success).toBe(false);
    const ok = reminderSchema.safeParse({ ...base, reminderType: 'road_tax', dueDate: '2027-01-31', durationMonths: '6' });
    expect(ok.success && ok.data.durationMonths).toBe(6);
  });

  it('needs insurance start, length and an end after the start', () => {
    expect(reminderSchema.safeParse({ ...base, reminderType: 'insurance', dueDate: '2027-03-01', durationMonths: '12' }).success).toBe(false);
    expect(reminderSchema.safeParse({ ...base, reminderType: 'insurance', startDate: '2027-03-01', dueDate: '2026-03-01', durationMonths: '12' }).success).toBe(false);
    expect(reminderSchema.safeParse({ ...base, reminderType: 'insurance', startDate: '2026-03-01', dueDate: '2027-03-01', durationMonths: '12' }).success).toBe(true);
  });

  it('never repeats (renewals replace the dates)', () => {
    const r = reminderSchema.safeParse({ ...base, reminderType: 'service', dueDate: '2027-01-01', intervalMonths: '12' });
    expect(r.success && r.data.intervalMonths).toBeNull();
  });
});

describe('NCT with the date of first registration', () => {
  it('counts age from the anniversary, not the calendar year', () => {
    const car = reg('2016-09-20');
    expect(vehicleAge(car, '2026-09-19')).toBe(9);
    expect(vehicleAge(car, '2026-09-20')).toBe(10);
    expect(vehicleAge({ year: 2016 }, '2026-01-01')).toBe(10);
    expect(vehicleAge(null, '2026-01-01')).toBeNull();
  });

  it('puts the first test on the 4th anniversary', () => {
    expect(nctFirstDue(reg('2023-06-14'))).toBe('2027-06-14');
    expect(nctFirstDue({ year: 2023 })).toBeNull();
    expect(completeReminderDates({ ...base, reminderType: 'nct' }, reg('2023-06-14')).dueDate).toBe('2027-06-14');
  });

  it('finds the next due anniversary after a test', () => {
    const car = reg('2018-05-10');
    // 8th-anniversary test (2026-05-10) taken a month early: next due on the 10th anniversary.
    expect(nctExpiryFromTest(car, '2026-04-10')).toBe('2028-05-10');
    // Same test taken late: still the 10th anniversary.
    expect(nctExpiryFromTest(car, '2026-07-01')).toBe('2028-05-10');
    // 10th-anniversary test: yearly from then on.
    expect(nctExpiryFromTest(car, '2028-04-20')).toBe('2029-05-10');
    // 30–39: every 2 years again.
    expect(nctExpiryFromTest(reg('1996-03-01'), '2026-02-15')).toBe('2028-03-01');
    // 38th-anniversary test: next would be 40, which isn't tested.
    expect(nctExpiryFromTest(reg('1988-03-01'), '2026-02-15')).toBe('');
  });

  it('spots the 10th-anniversary NCT exactly', () => {
    const car = reg('2018-05-10');
    expect(nctTenthAnniversary(car, '2028-05-10')).toBe(true);
    expect(nctTenthAnniversary(car, '2028-05-09')).toBe(false); // still 9 the day before
    expect(noticeDaysBefore('nct', car, '2028-05-10')).toEqual([120, 30, 7]);
  });
});
