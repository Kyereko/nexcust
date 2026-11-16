import { expect, test, type Page } from '@playwright/test';

const PW = process.env.DEMO_PASSWORD ?? 'Demo!Pass2026';
async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PW);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Prisons dashboard' })).toBeVisible();
}
async function signOut(page: Page) { await page.getByRole('button', { name: 'Sign out' }).click(); await expect(page).toHaveURL(/\/login/); }

test('Workflows D and E — admit, transfer between establishments, then release with authorization', async ({ page }) => {
  const surname = `Edwee${Date.now()}`;
  // D: admission by the Ashanti records officer
  await signIn(page, 'prisons.records@nexcust.demo');
  await page.locator('aside').getByRole('link', { name: 'Admissions & Custody', exact: true }).click();
  await page.getByRole('link', { name: 'Register new person' }).click();
  await page.getByLabel('Surname').fill(surname);
  await page.getByLabel('Other names').fill('Kojo Demo');
  await page.getByRole('button', { name: /Check for existing records/ }).click();
  await expect(page.getByRole('heading', { name: 'Admit to custody' })).toBeVisible();
  await page.getByLabel('Issuing court').fill('DEMO Circuit Court A');
  await page.getByLabel('Warrant reference').fill(`DEMO-WRT-E2E-${Date.now()}`);
  await page.getByLabel('Next court date (remand)').fill(new Date(Date.now() + 10 * 86400_000).toISOString().slice(0, 10));
  await page.getByLabel('Received from (escorting officer)').fill('DEMO Sgt. Escort, Accra Station 1');
  await page.getByLabel('Condition at handover').fill('Sober, no visible injuries');
  await page.getByLabel('Screened by').selectOption('MEDICAL_OFFICER');
  await page.getByRole('button', { name: /admit/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Admitted as DEMO-PN-' })).toBeVisible();
  await expect(page.getByText('DEMO Ashanti Central Prison').first()).toBeVisible();
  await expect(page.getByText(/Form 14 — remand commitment for trial/)).toBeVisible();
  await expect(page.getByText('CURRENT', { exact: true })).toBeVisible(); // remand warrant status
  const prisonerUrl = page.url().split('?')[0];

  // registry is updated
  await page.locator('aside').getByRole('link', { name: 'Prisoner Registry', exact: true }).click();
  await page.getByLabel('Search', { exact: true }).fill(surname);
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('cell', { name: new RegExp(surname) })).toBeVisible();

  // E: transfer initiated by records, approved by the officer-in-charge, received by the Northern establishment
  await page.goto(prisonerUrl);
  await page.getByLabel('Receiving establishment').selectOption({ label: 'DEMO Northern Central Prison' });
  await page.getByLabel('Reason').fill('Decongestion (browser test)');
  await page.getByRole('button', { name: 'Initiate transfer' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Transfer DEMO-TRF-' })).toBeVisible();
  await signOut(page);

  await signIn(page, 'prisons.superintendent@nexcust.demo');
  await page.locator('aside').getByRole('link', { name: 'Transfers & Releases', exact: true }).click();
  await page.getByRole('row').filter({ hasText: surname }).getByRole('button', { name: 'Approve & dispatch' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'in transit' })).toBeVisible();
  await signOut(page);

  await signIn(page, 'prisons.records.north@nexcust.demo');
  await page.locator('aside').getByRole('link', { name: 'Transfers & Releases', exact: true }).click();
  await page.getByRole('row').filter({ hasText: surname }).getByRole('button', { name: 'Confirm arrival' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Arrival confirmed' })).toBeVisible();
  await page.goto(prisonerUrl);
  await expect(page.getByText(/DEMO Ashanti Central Prison → DEMO Northern Central Prison/)).toBeVisible(); // both facilities in the history
  await page.getByLabel('Legal authority').fill('Bail granted by DEMO Circuit Court A (browser test)');
  await page.getByRole('button', { name: 'Initiate release' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'awaits authorization' })).toBeVisible();
  await signOut(page);

  // the sending establishment no longer holds the prisoner
  await signIn(page, 'prisons.records@nexcust.demo');
  await page.goto(prisonerUrl);
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  await signOut(page);

  await signIn(page, 'prisons.national@nexcust.demo');
  await page.locator('aside').getByRole('link', { name: 'Transfers & Releases', exact: true }).click();
  await page.getByRole('row').filter({ hasText: surname }).filter({ hasText: 'BAIL' }).getByRole('button', { name: 'Authorize release' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Release authorized' })).toBeVisible();
  await page.goto(prisonerUrl);
  await expect(page.getByText('RELEASED', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Initiate release' })).toHaveCount(0);
  await signOut(page);
  // the receiving establishment's records officer returns the warrant to the issuing court
  await signIn(page, 'prisons.records.north@nexcust.demo');
  await page.goto('/prisons/transfers');
  await page.getByRole('row').filter({ hasText: surname }).filter({ hasText: 'bail' }).getByRole('button', { name: 'Warrant returned to court' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'returned to the issuing court' })).toBeVisible();
});
