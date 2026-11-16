import { expect, test, type Page } from '@playwright/test';

const PW = process.env.DEMO_PASSWORD ?? 'Demo!Pass2026';
async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PW);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Police dashboard' })).toBeVisible();
}
async function signOut(page: Page) { await page.getByRole('button', { name: 'Sign out' }).click(); await expect(page).toHaveURL(/\/login/); }

test('Workflow A — register a detainee, then the station commander authorizes release', async ({ page }) => {
  const surname = `Etwoe${Date.now()}`;
  await signIn(page, 'police.records@nexcust.fourthit.com');

  // 1–3: search first, create an identity record only because none exists
  await page.locator('aside').getByRole('link', { name: 'People & Records', exact: true }).click();
  await page.getByLabel('Search', { exact: true }).fill(surname);
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('No records found')).toBeVisible();
  await page.getByRole('link', { name: 'Register new person' }).click();
  await page.getByLabel('Surname').fill(surname);
  await page.getByLabel('Other names').fill('Kwabena Demo');
  await page.getByRole('button', { name: /Check for existing records/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Identity record NX-NPI-' })).toBeVisible();

  // 4–5: arrest + custody episode
  await page.getByRole('link', { name: 'Register arrest' }).click();
  await page.getByLabel('Suspected offence').fill('Stealing');
  await page.getByLabel('Legal authority for the arrest').fill('Arrest on reasonable suspicion (browser test)');
  await page.getByLabel('Language used').fill('Twi');
  await page.getByLabel('Cell (if detained)').fill('Cell 1');
  await page.getByRole('button', { name: 'Register arrest' }).click();
  await expect(page.getByRole('heading', { name: /Custody episode NX-CUS-/ })).toBeVisible();
  await expect(page.getByText('IN CUSTODY')).toBeVisible();
  const custodyUrl = page.url().split('?')[0];

  // saved and searchable in the register
  await page.locator('aside').getByRole('link', { name: 'Arrests & Custody', exact: true }).click();
  await page.getByLabel('Search', { exact: true }).fill(surname);
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('cell', { name: new RegExp(surname) })).toBeVisible();

  // s.8: search and property held in safe custody
  await page.goto(custodyUrl);
  await page.getByLabel('Searching officer').fill('Cpl. Owusu');
  await page.getByLabel('Officer is').selectOption('MALE');
  await page.getByRole('button', { name: 'Record search' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Search recorded' })).toBeVisible();
  await page.getByLabel('Item').fill('Mobile phone');
  await page.getByLabel('Sealed bag').fill('BAG-E2E-1');
  await page.getByRole('button', { name: 'Add item' }).click();
  await expect(page.getByText('1 × Mobile phone · bag BAG-E2E-1')).toBeVisible();
  // property must be accounted for before release (records officer)
  await page.getByLabel('Received by').fill('Detainee in person');
  await page.getByRole('button', { name: 'Record', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Property item accounted for' })).toBeVisible();

  // 7: movement; the records officer has no closing authority
  await page.goto(custodyUrl);
  await page.getByLabel('Note').fill('Taken to court (browser test)');
  await page.getByRole('button', { name: 'Record movement' }).click();
  await expect(page.getByText('Taken to court (browser test)')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Authorize and close custody' })).toHaveCount(0);
  await signOut(page);

  // 6 + 8: supervisor reviews and closes with an authorized disposition
  await signIn(page, 'police.station@nexcust.fourthit.com');
  await page.goto(custodyUrl);
  await page.getByRole('button', { name: 'Mark record as reviewed' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Supervisor review recorded' })).toBeVisible();
  await page.getByLabel('Authority and particulars').fill('Police enquiry bail granted (browser test)');
  await page.getByLabel('Bond amount (GH₵)').fill('2000');
  await page.getByLabel('Date and time to report (GMT)').fill(new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 16));
  await page.getByLabel('Surety name').fill('Ama Surety');
  await page.getByLabel('Surety ID reference').fill('GHA-NXSURETY-01');
  await page.getByLabel('Surety address').fill('House 12, Nima, Accra');
  await page.getByRole('button', { name: 'Authorize and close custody' }).click();
  await expect(page.getByText('RELEASED ON BAIL', { exact: true })).toBeVisible();
  await expect(page.getByText(/GH₵2,000 · report to police station/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Authorize and close custody' })).toHaveCount(0);
});

test('Workflow B — officer posting: HR proposes, supervisor approves, receiving station confirms', async ({ page }) => {
  await signIn(page, 'police.hr@nexcust.fourthit.com');
  await page.locator('aside').getByRole('link', { name: 'Personnel & Postings', exact: true }).click();
  // find any officer still serving at a Tamale station (Northern command; each run moves one of them to Nima, Accra)
  let row = page.getByRole('row').filter({ hasText: /Lamashegu|Sakasaka|Tamale Police Station/ }).first();
  for (let n = 1; n <= 10; n++) {
    await page.goto(`/police/personnel?page=${n}`);
    await expect(page.getByRole('heading', { name: 'Personnel & postings' })).toBeVisible();
    row = page.getByRole('row').filter({ hasText: /Lamashegu|Sakasaka|Tamale Police Station/ }).first();
    if (await row.count()) break;
  }
  const serviceNo = (await row.getByRole('link').first().textContent())!;
  await row.getByRole('link').first().click();
  await expect(page.getByText(`Service no. ${serviceNo}`)).toBeVisible();
  await page.getByLabel('Destination unit').selectOption({ label: 'Nima Police Station — Station / Post' });
  await page.getByLabel('Reason').fill('Service requirement (browser test)');
  await page.getByRole('button', { name: 'Propose posting' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Posting proposed' })).toBeVisible();
  await signOut(page);

  await signIn(page, 'police.national@nexcust.fourthit.com');
  await page.goto('/police/postings');
  await page.getByRole('row').filter({ hasText: serviceNo }).getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Posting approved' })).toBeVisible();
  await signOut(page);

  await signIn(page, 'police.station@nexcust.fourthit.com');
  await page.goto('/police/postings');
  await page.getByRole('row').filter({ hasText: serviceNo }).getByRole('button', { name: 'Confirm arrival' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Posting confirmed' })).toBeVisible();
  await signOut(page);

  await signIn(page, 'police.hr@nexcust.fourthit.com');
  await page.goto(`/police/personnel?q=${serviceNo}`);
  await page.getByRole('link', { name: serviceNo }).click();
  await expect(page.getByRole('row').filter({ hasText: 'CURRENT' })).toContainText('Nima Police Station'); // current posting updated
  await expect(page.getByRole('row').filter({ hasText: 'ENDED' }).filter({ hasText: /Lamashegu|Sakasaka|Tamale Police Station/ }).first()).toBeVisible(); // history remains
});
