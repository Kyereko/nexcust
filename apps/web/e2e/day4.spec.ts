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

test('Workflow C — application, review, approval, sample certificate and public verification', async ({ page }) => {
  const doc = `DEMO-GHA-E2E-${Date.now()}`;
  await signIn(page, 'applicant@nexcust.demo');
  await expect(page.getByRole('heading', { name: 'My background-check applications' })).toBeVisible();
  await page.getByLabel('Full name (as on your identity document)').fill('Akua Demo Applicant');
  await page.getByLabel('Date of birth').fill('1994-05-17');
  await page.getByLabel('Document number').fill(doc);
  await page.getByLabel('Purpose').fill('Employment');
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'submitted' })).toBeVisible();
  const reference = (await page.getByRole('heading', { level: 1 }).textContent())!.replace('Application ', '');
  const applicantUrl = page.url().split('?')[0];
  await expect(page.getByText('IN PROGRESS', { exact: true })).toBeVisible();
  await signOut(page);

  await signIn(page, 'police.bgcheck@nexcust.demo');
  await page.getByRole('link', { name: 'Background Checks', exact: true }).click();
  await page.getByLabel('Search').fill(reference);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('link', { name: reference }).click();
  for (const [note, stage] of [['Application complete', 'validated'], ['Identity verified at appointment (demo)', 'identity verified'], ['Records searched', 'records searched'], ['Recommend issue', 'under review']]) {
    await page.getByLabel('Note').fill(note);
    await page.getByRole('button', { name: 'Record step' }).click();
    await expect(page.getByRole('status').filter({ hasText: `Recorded: ${stage}.` })).toBeVisible();
  }
  await expect(page.getByText('UNDER REVIEW').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve and issue certificate' })).toHaveCount(0); // reviewer cannot decide
  const appUrl = page.url().split('?')[0];
  await signOut(page);

  await signIn(page, 'police.national@nexcust.demo');
  await page.goto(appUrl);
  await page.getByRole('button', { name: 'Approve and issue certificate' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Certificate DEMO-PCC-\d+ issued/ })).toBeVisible();
  await signOut(page);

  await signIn(page, 'applicant@nexcust.demo');
  await page.goto(applicantUrl);
  await expect(page.getByText('CERTIFICATE ISSUED', { exact: true })).toBeVisible();
  await expect(page.getByText('DEMONSTRATION — NOT VALID')).toBeVisible();
  const code = (await page.locator('.font-mono').first().textContent())!.trim();
  expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  await signOut(page);

  // anyone can verify without signing in
  await page.goto('/verify');
  await page.getByLabel('Verification code').fill(code.toLowerCase());
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Authentic and valid' })).toBeVisible();
  await expect(page.getByText('Akua Demo Applicant')).toBeVisible();
  await page.goto('/verify/ZZZZZZZZZZZZ');
  await expect(page.getByRole('status').filter({ hasText: 'Not verified' })).toBeVisible();
});

test('authorized exchange — police see whether a person is in prison custody, with purpose recorded', async ({ page }) => {
  await signIn(page, 'police.records@nexcust.demo');
  await page.getByRole('link', { name: 'People & Records', exact: true }).click();
  await page.getByLabel('Search').fill('DEMO-NPI-000302');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('link', { name: 'Police record' }).click();
  await page.getByRole('button', { name: 'Request summary' }).click();
  await expect(page.getByText('Currently held in prison custody')).toBeVisible();
});

test('reports roll up by command and show the monthly trend', async ({ page }) => {
  await signIn(page, 'police.national@nexcust.demo');
  await page.getByRole('link', { name: 'Reports & Analytics', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Accra Regional Police Command' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Total' })).toBeVisible();
  await expect(page.getByText('Arrests per month (last six months)')).toBeVisible();
  await signOut(page);
  await signIn(page, 'prisons.national@nexcust.demo');
  await page.getByRole('link', { name: 'Reports & Analytics', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Ashanti Regional Prisons Command' })).toBeVisible();
  await expect(page.getByText('Admissions per month')).toBeVisible();
});
