import { expect, test, type Page } from '@playwright/test';

const PW = process.env.DEMO_PASSWORD ?? 'Demo!Pass2026';
async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PW);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}
async function signOut(page: Page) { await page.getByRole('button', { name: 'Sign out' }).click(); await expect(page).toHaveURL(/\/login/); }

test('Workflow C — clearance on the portal flow: apply, pay, fingerprints, criminal ident, signature, Ghana Post, verification', async ({ page }) => {
  const doc = `DEMO-GHA-E2E-${Date.now()}`;
  await signIn(page, 'applicant@nexcust.demo');
  await expect(page.getByRole('heading', { name: 'My background-check applications' })).toBeVisible();
  await page.getByLabel('Full name (as on your identity document)').fill('Akua Demo Applicant');
  await page.getByLabel('Date of birth').fill('1994-05-17');
  await page.getByLabel('Document number').fill(doc);
  await page.getByLabel('Service').selectOption('ORDINARY_RESIDENT');
  await page.getByLabel('Purpose').fill('Employment');
  await page.getByLabel('Ghana Post office for delivery').fill('Accra Central Post Office');
  await page.getByLabel(/foreign resident who has lived in Ghana/).check();
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'submitted' })).toBeVisible();
  const reference = (await page.getByRole('heading', { level: 1 }).textContent())!.replace('Application ', '');
  const applicantUrl = page.url().split('?')[0];
  await signOut(page);

  await signIn(page, 'police.bgcheck@nexcust.demo');
  await page.locator('aside').getByRole('link', { name: 'Background Checks', exact: true }).click();
  await page.getByLabel('Search', { exact: true }).fill(reference);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('link', { name: reference }).click();
  const record = async (label: string) => { await page.getByLabel('Note').fill(`${label} (browser test)`); await page.getByRole('button', { name: 'Record step' }).click(); await expect(page.getByRole('status').filter({ hasText: `Recorded: ${label}.` })).toBeVisible(); };
  await page.getByLabel('Payment reference (Ghana.gov)').fill('DEMO-PAY-E2E');
  await record('payment confirmed');
  await page.getByLabel('Appointment (GMT)').fill(new Date(Date.now() + 86400_000).toISOString().slice(0, 16));
  await page.getByLabel('Capture centre').fill('Nima Police Station, Accra (demo)');
  await record('appointment booked');
  await record('biometrics captured');
  await page.getByLabel('Criminal ident').selectOption('NOT_IDENT');
  await record('records searched');
  await record('under review');
  await expect(page.getByRole('button', { name: 'Approve and sign certificate' })).toHaveCount(0); // processor cannot sign
  const appUrl = page.url().split('?')[0];
  await signOut(page);

  await signIn(page, 'police.national@nexcust.demo');
  await page.goto(appUrl);
  await page.getByRole('button', { name: 'Approve and sign certificate' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Certificate DEMO-PCC-\d+ signed and issued/ })).toBeVisible();
  await expect(page.getByText('for: Director-General, CID').first()).toBeVisible();
  await signOut(page);

  await signIn(page, 'police.bgcheck@nexcust.demo');
  await page.goto(appUrl);
  await page.getByLabel('Parcel batch no.').fill('DEMO-BATCH-E2E');
  await page.getByRole('button', { name: 'Record dispatch' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Dispatch by Ghana Post recorded' })).toBeVisible();
  await signOut(page);

  await signIn(page, 'applicant@nexcust.demo');
  await page.goto(applicantUrl);
  await expect(page.getByText('DISPATCHED', { exact: true })).toBeVisible();
  await expect(page.getByText(/does not appear in the criminal records of the Ghana Police Service/)).toBeVisible();
  const code = (await page.locator('.font-mono').first().textContent())!.trim();
  await signOut(page);

  await page.goto('/verify');
  await page.getByLabel('Verification code').fill(code.toLowerCase());
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Authentic and valid' })).toBeVisible();
  await expect(page.getByText(/for: Director-General, CID/)).toBeVisible();
});

test('authorized exchange — police see whether a person is in prison custody, with purpose recorded', async ({ page }) => {
  await signIn(page, 'police.records@nexcust.demo');
  await page.locator('aside').getByRole('link', { name: 'People & Records', exact: true }).click();
  await page.getByLabel('Search', { exact: true }).fill('DEMO-NPI-000302');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('link', { name: 'Police record' }).click();
  await page.getByRole('button', { name: 'Request summary' }).click();
  await expect(page.getByText('Currently held in prison custody')).toBeVisible();
});

test('reports roll up by command and show the monthly trend', async ({ page }) => {
  await signIn(page, 'police.national@nexcust.demo');
  await page.locator('aside').getByRole('link', { name: 'Reports & Analytics', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Accra Regional Police Command' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Total' })).toBeVisible();
  await expect(page.getByText('Arrests per month (last six months)')).toBeVisible();
  await signOut(page);
  await signIn(page, 'prisons.national@nexcust.demo');
  await page.locator('aside').getByRole('link', { name: 'Reports & Analytics', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Ashanti Regional Prisons Command' })).toBeVisible();
  await expect(page.getByText('Admissions per month')).toBeVisible();
});
