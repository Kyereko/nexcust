import { expect, test, type Page } from '@playwright/test';

const PW = process.env.DEMO_PASSWORD ?? 'Demo!Pass2026';
async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PW);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('unauthenticated visitors are sent to sign-in', async ({ page }) => {
  await page.goto('/police');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('police login opens the police workspace with live dashboard figures', async ({ page }) => {
  await signIn(page, 'police.national@nexcust.demo');
  await expect(page).toHaveURL(/\/police$/);
  await expect(page.getByRole('heading', { name: 'Police dashboard' })).toBeVisible();
  await expect(page.getByText('In police custody')).toBeVisible();
  await page.locator('aside').getByRole('link', { name: 'Arrests & Custody', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Arrests & custody' })).toBeVisible();
  await page.getByRole('link', { name: /DEMO-CUS-/ }).first().click();
  await expect(page.getByText('Movement history (immutable)')).toBeVisible();
});

test('prison login opens the prisons workspace and the registry is searchable', async ({ page }) => {
  await signIn(page, 'prisons.records@nexcust.demo');
  await expect(page).toHaveURL(/\/prisons$/);
  await expect(page.getByRole('heading', { name: 'Prisons dashboard' })).toBeVisible();
  await page.locator('aside').getByRole('link', { name: 'Prisoner Registry', exact: true }).click();
  await page.getByLabel('Search', { exact: true }).fill('DEMO-PN');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('link', { name: /DEMO-PN-/ }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'DEMO Northern Central Prison' })).toHaveCount(0); // other establishments are out of scope
});

test('a station officer sees only their own station', async ({ page }) => {
  await signIn(page, 'police.records@nexcust.demo');
  await expect(page.getByRole('heading', { name: 'Police dashboard' })).toBeVisible();
  await page.locator('aside').getByRole('link', { name: 'Stations & Commands', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Stations & commands' })).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(2); // header + one station
});

test('cross-institution access is denied and appears in the audit trail', async ({ page }) => {
  await signIn(page, 'prisons.records@nexcust.demo');
  await expect(page).toHaveURL(/\/prisons$/);
  await page.goto('/police/custody');
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
  await signIn(page, 'auditor@nexcust.demo');
  await expect(page).toHaveURL(/\/audit$/);
  await page.getByLabel('Search', { exact: true }).fill('prisons.records@nexcust.demo');
  await page.getByLabel('Status').selectOption('DENIED');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('cell', { name: 'access.denied' }).first()).toBeVisible();
});

test('rank catalogue shows evidence status as reference data', async ({ page }) => {
  await signIn(page, 'police.hr@nexcust.demo');
  await expect(page.getByRole('heading', { name: 'Police dashboard' })).toBeVisible();
  await page.locator('aside').getByRole('link', { name: 'Administration', exact: true }).click();
  await expect(page).toHaveURL(/\/police\/administration$/);
  await expect(page.getByRole('cell', { name: 'Inspector-General of Police', exact: true })).toBeVisible();
  await expect(page.getByText('VERIFIED').first()).toBeVisible();
});
