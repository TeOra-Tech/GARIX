import { test, expect, type Browser } from '@playwright/test';
import { admin, cleanup, createTestUser, seedActiveGarage, signIn, type TestUser } from './helpers';

/**
 * The definition-of-done journey (roadmap flows 1–7) in one golden path:
 * auth gating → vehicle → request wizard → garage quote (credits spent) →
 * customer accepts → wallet ledger → search → public profile.
 */
const stamp = Date.now();
let customer: TestUser;
let owner: TestUser;
let garage: { id: string; slug: string; name: string };

test.beforeAll(async () => {
  customer = await createTestUser(`garix.pw.customer.${stamp}@example.com`, 'customer', 'Play Wright');
  owner = await createTestUser(`garix.pw.owner.${stamp}@example.com`, 'garage_owner', 'Gwen Owner');
  garage = await seedActiveGarage(owner.id, stamp);
});

test.afterAll(async () => {
  await cleanup([customer?.id, owner?.id].filter(Boolean), [garage?.id].filter(Boolean));
});

async function customerPage(browser: Browser) {
  const context = await browser.newContext();
  await signIn(context, customer);
  return context.newPage();
}
async function ownerPage(browser: Browser) {
  const context = await browser.newContext();
  await signIn(context, owner);
  return context.newPage();
}

test('flow 1: middleware protects the dashboard and login renders', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/auth\/login\?next=%2Fdashboard/);
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});

test('flow 1: an injected session reaches the dashboard', async ({ browser }) => {
  const page = await customerPage(browser);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /Hi Play/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Notifications/ })).toBeVisible();
});

test('flow 2: customer adds a vehicle', async ({ browser }) => {
  const page = await customerPage(browser);
  await page.goto('/dashboard/vehicles/new');
  await page.getByLabel('Registration number').fill(`161-KE-${String(stamp).slice(-4)}`);
  await page.getByRole('button', { name: 'Look up' }).click();
  await expect(page.getByText('No automatic match')).toBeVisible();
  await page.getByLabel('My make isn’t listed').check();
  await page.getByLabel('Make', { exact: true }).fill('Toyota');
  await page.getByLabel('Model', { exact: true }).fill('Corolla');
  await page.getByLabel('Year (optional)').fill('2016');
  await page.getByRole('button', { name: 'Add vehicle' }).click();
  await expect(page).toHaveURL(/\/dashboard\/vehicles$/);
  await expect(page.getByText('2016 Toyota Corolla')).toBeVisible();
});

test('flow 3: customer posts a request through the wizard', async ({ browser }) => {
  const page = await customerPage(browser);
  await page.goto('/requests/new');

  // step 1: vehicle
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Continue' }).click();
  // step 2: category
  await page.getByLabel('Category').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Continue' }).click();
  // step 3: details
  await page.getByLabel('Title').fill('Grinding noise when braking');
  await page.getByLabel('Description').fill('Started last week, grinding from the front when braking at low speed.');
  await page.getByRole('button', { name: 'Continue' }).click();
  // step 4: urgency (default flexible)
  await page.getByRole('button', { name: 'Continue' }).click();
  // step 5: location
  await page.getByLabel('Town or city').fill('Naas');
  await page.getByLabel('County').selectOption('Kildare');
  await page.getByRole('button', { name: 'Continue' }).click();
  // step 6: review & post
  await expect(page.getByText('Review and post')).toBeVisible();
  await page.getByRole('button', { name: 'Post request' }).click();

  await expect(page).toHaveURL(/\/dashboard\/requests\?posted=1/);
  await expect(page.getByText('Your request is live')).toBeVisible();
  await expect(page.getByText('Grinding noise when braking')).toBeVisible();
});

test('flow 6a: garage sees the request and submits a VAT-itemised quote', async ({ browser }) => {
  const page = await ownerPage(browser);
  await page.goto('/dashboard/garage/requests');
  await expect(page.getByText('Balance: 10 credits', { exact: false })).toBeVisible();
  await page
    .locator('li', { hasText: 'Grinding noise when braking' })
    .getByRole('link', { name: 'Write a quote' })
    .click();

  await page.getByLabel('Item 1 description').fill('Replace front pads and discs (1.5 hrs)');
  await page.getByLabel('Item 1 quantity').fill('1.5');
  await page.getByLabel('Item 1 unit price in euro').fill('80');
  await page.getByRole('button', { name: 'Add line item' }).click();
  await page.getByLabel('Item 2 description').fill('Front pads and discs kit');
  await page.getByLabel('Item 2 unit price in euro').fill('210');

  // live VAT preview: labour 120 @13.5% = 16.20, parts 210 @23% = 48.30 → 394.50
  await expect(page.getByText('€394.50')).toBeVisible();
  await page.getByRole('button', { name: 'Submit quote' }).click();

  await expect(page).toHaveURL(/\/dashboard\/garage\/requests\?quoted=1/);
  await expect(page.getByText('Quote submitted')).toBeVisible();
});

test('flow 7: wallet shows the spend in the ledger', async ({ browser }) => {
  const page = await ownerPage(browser);
  await page.goto('/dashboard/wallet');
  await expect(page.getByText('8', { exact: true })).toBeVisible();
  await expect(page.getByText('Quote submitted').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /20.*credits/s }).first()).toBeVisible();
});

test('flow 6b: customer compares and accepts the quote', async ({ browser }) => {
  const page = await customerPage(browser);
  await page.goto('/dashboard/requests');
  await page.getByRole('link', { name: /Grinding noise when braking/ }).click();

  await expect(page.getByText(garage.name)).toBeVisible();
  await expect(page.getByText('Labour VAT 13.5%')).toBeVisible();
  await expect(page.getByText('€394.50').first()).toBeVisible();

  await page.getByRole('button', { name: 'Accept quote' }).click();
  await page.getByRole('button', { name: 'Confirm — accept this quote' }).click();
  await expect(page.getByText('Quote accepted — the garage will be in touch.')).toBeVisible();
  await expect(page.getByText('Mark job complete')).toBeVisible();
});

test('flow 5: search finds the active garage near Dublin', async ({ page }) => {
  await page.goto('/search');
  await expect(page.getByText(garage.name)).toBeVisible();
  await expect(page.getByText(/garages? found/)).toBeVisible();
});

test('flow 4: public profile renders and registration prompts sign-in', async ({ page }) => {
  await page.goto(`/garages/${garage.slug}`);
  await expect(page.getByRole('heading', { name: garage.name })).toBeVisible();
  await expect(page.getByText('Opening hours')).toBeVisible();

  await page.goto('/garages/register');
  await expect(page.getByRole('link', { name: 'Create an account' })).toBeVisible();
});

test('legal pages and offline fallback exist', async ({ page }) => {
  await page.goto('/legal/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible();
  await page.goto('/legal/terms');
  await expect(page.getByRole('heading', { name: 'Terms of service' })).toBeVisible();
  await page.goto('/offline');
  await expect(page.getByRole('heading', { name: 'You’re offline' })).toBeVisible();
});

test('RLS sanity: the seeded data is invisible to a fresh visitor', async ({ page }) => {
  await page.goto('/dashboard/requests');
  await expect(page).toHaveURL(/\/auth\/login/);
  const { data } = await admin.from('service_requests').select('id, customer_id').eq('customer_id', customer.id);
  expect(data?.length).toBe(1); // exists for the owner…
  await page.goto(`/dashboard/requests/${data![0].id}`);
  await expect(page).toHaveURL(/\/auth\/login/); // …but gated for everyone else
});
