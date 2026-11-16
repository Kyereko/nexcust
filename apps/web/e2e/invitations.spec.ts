import { expect, test } from '@playwright/test';

const PW = process.env.DEMO_PASSWORD ?? 'Demo!Pass2026';

test('the landing page shows the animated wordmark and signs in from its dialog', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Connected Institutions');
  await expect(page.getByTestId('particles')).toBeVisible();
  await page.getByRole('button', { name: 'Sign in to NEXCUST' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await dialog.getByLabel('Email').fill('police.national@nexcust.demo');
  await dialog.getByLabel('Password').fill(PW);
  await dialog.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/police$/);
});

test('an administrator invites a tester, who sets a password and works across Police and Prisons but not administration', async ({ browser, page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@nexcust.demo'); await page.getByLabel('Password').fill(PW);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const email = `e2e.tester.${Date.now()}@example.org`;
  await page.getByLabel('Full name').fill('Esi Tester'); await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send invitation' }).click();
  const link = (await page.locator('code').first().textContent())!;
  expect(link).toMatch(/\/accept#token=/);
  await expect(page.getByRole('cell', { name: email })).toBeVisible();

  const tester = await (await browser.newContext()).newPage();
  await tester.goto(link.replace(/^https?:\/\/[^/]+/, '')); // same deployment the test runs against
  await expect(tester.getByText('Welcome,')).toBeVisible();
  await expect(tester).toHaveURL(/\/accept$/); // the token is removed from the address bar once read
  await tester.getByLabel('New password').fill('a long tester passphrase');
  await tester.getByLabel('Repeat password').fill('a long tester passphrase');
  await tester.getByRole('button', { name: 'Save password and sign in' }).click();
  await expect(tester).toHaveURL(/\/police$/);
  await expect(tester.getByText('Tester · full access except administration')).toBeVisible();
  await tester.locator('aside').getByRole('link', { name: 'Prisons', exact: true }).click();
  await expect(tester).toHaveURL(/\/prisons$/);
  await expect(tester.getByRole('heading', { name: 'Prisons dashboard' })).toBeVisible();
  await tester.goto('/admin');
  await expect(tester.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  // The link works once.
  await tester.context().clearCookies();
  await tester.goto(link.replace(/^https?:\/\/[^/]+/, ''));
  await expect(tester.getByText(/expired, was already used or was withdrawn/)).toBeVisible();
});
