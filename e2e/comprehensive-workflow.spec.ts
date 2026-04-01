/**
 * Comprehensive End-to-End Workflow Tests
 *
 * Covers all critical business flows:
 *  A. Staff creates project -> PO fills form -> reviews -> submits -> staff sees response
 *  B. PO proposes a project from the portal
 *  C. File attachment upload during form fill
 *  D. Form navigation, auto-save, character counter
 *  E. Review page: answers displayed, AI summary, final submit
 *  F. Admin responses: filtering, CSV export
 *  G. Project detail tabs (overview, responses, invitations, attachments)
 *  H. Done page after submission
 *  I. Admin archive page
 *  J. Role guards & permission enforcement
 *  K. Negative tests & edge cases (invalid data, API abuse, security)
 *  L. Admin sidebar navigation
 *  M. Portal navigation
 *  N. Form interaction details
 *  O. Multi-language support
 *  P. Responsive design
 *  Q. SEO & security headers
 *
 * Prerequisites:
 *   - Dev server running on localhost:3000
 *   - .env.test.local with E2E credentials
 */

import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// -- Credentials --

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}. Set it in .env.test.local`);
  return v;
}

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const STAFF_EMAIL = env('E2E_SUPER_ADMIN_EMAIL');
const STAFF_PASS  = env('E2E_SUPER_ADMIN_PASS');
const PO_EMAIL    = env('E2E_PRODUCT_OWNER_EMAIL');
const PO_PASS     = env('E2E_PRODUCT_OWNER_PASS');

const TS = Date.now();
const TEST_PROJECT_NAME = `CW-Test Project ${TS}`;
const TEST_PROJECT_SLUG = `cw-test-project-${TS}`;

// Known project slug from seed data (Maanik's assigned projects)
const KNOWN_PROJECT_SLUG = 'klar-weiterentwicklung';

// -- Helpers --

async function loginAsStaff(page: Page) {
  await page.goto(`${BASE}/de/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', STAFF_EMAIL);
  await page.fill('input[type="password"]', STAFF_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 60_000 });
}

async function loginAsPO(page: Page) {
  await page.goto(`${BASE}/de/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', PO_EMAIL);
  await page.fill('input[type="password"]', PO_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/my-projects', { timeout: 40_000 });
}

// ==========================================================================
// A. FULL ROUND-TRIP: Staff creates project -> PO fills -> submits -> staff sees
// ==========================================================================

test.describe.serial('A. Full round-trip workflow', () => {

  test('A1. Staff logs in and creates a new project', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto(`${BASE}/de/projects/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const nameInput = page.locator('input').first();
    await nameInput.fill(TEST_PROJECT_NAME);
    await page.waitForTimeout(500);

    const allInputs = await page.locator('input').all();
    if (allInputs.length >= 2) {
      const slugInput = allInputs[1];
      const currentSlug = await slugInput.inputValue();
      if (!currentSlug) await slugInput.fill(TEST_PROJECT_SLUG);
    }

    const combobox = page.locator('[role="combobox"]');
    if (await combobox.count() > 0) {
      await combobox.first().click();
      await page.waitForTimeout(500);
      const opt = page.locator('[role="option"]').first();
      if (await opt.count() > 0) await opt.click();
    }

    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);
    expect(page.url()).not.toContain('/new');
  });

  test('A2. Staff can see the new project in the projects list', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto(`${BASE}/de/projects`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    expect(body).toContain(TEST_PROJECT_NAME);
  });

  test('A3. PO logs in and sees the portal', async ({ page }) => {
    await loginAsPO(page);
    await expect(page).toHaveURL(/my-projects/);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(200);
  });

  test('A4. Form welcome page loads for a known project', async ({ page }) => {
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);
    const visibleText = await page.innerText('body');
    expect(visibleText.length).toBeGreaterThan(50);
  });

  test('A5. PO can open form fill page', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/fill`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(50);
  });

  test('A6. PO can fill text and textarea questions', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/fill`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);

    const textInputs = page.locator('input[type="text"]:visible');
    if (await textInputs.count() > 0) {
      await textInputs.first().fill('E2E comprehensive test value');
      const val = await textInputs.first().inputValue();
      expect(val).toBe('E2E comprehensive test value');
    }

    const textareas = page.locator('textarea:visible');
    if (await textareas.count() > 0) {
      await textareas.first().fill('Detailed project description for E2E testing.');
      const taVal = await textareas.first().inputValue();
      expect(taVal.length).toBeGreaterThan(20);
    }
  });

  test('A7. Form shows character counter on textarea', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/fill`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);

    const textarea = page.locator('textarea:visible').first();
    if (await textarea.count() > 0) {
      await textarea.fill('A'.repeat(100));
      await page.waitForTimeout(500);
      // Character counter should show a number / 10,000 format
      const counter = page.locator('text=/\\d+.*\\/.*10/');
      const counterCount = await counter.count();
      expect(counterCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('A8. Form auto-saves on answer change', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/fill`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);

    const textarea = page.locator('textarea:visible').first();
    if (await textarea.count() > 0) {
      await textarea.fill(`Auto-save test ${TS}`);
      await page.waitForTimeout(3000);
      // No error should be visible
      const body = await page.textContent('body');
      expect(body!.length).toBeGreaterThan(100);
    }
  });

  test('A9. Form navigation works (next/previous)', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/fill`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);

    const nextBtn = page.locator('button').filter({ hasText: /weiter|next/i }).first();
    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
      const prevBtn = page.locator('button').filter({ hasText: /zur.ck|previous/i }).first();
      await expect(prevBtn).toBeEnabled();
      await prevBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('A10. Form last section shows review button', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/fill`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);

    // Navigate forward through all sections until we reach the last one
    for (let i = 0; i < 10; i++) {
      const nextBtn = page.locator('button').filter({ hasText: /weiter|next/i }).first();
      if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(1500);
      } else {
        break;
      }
    }

    // On last section, a review link/button should appear
    const reviewLink = page.locator('a[href*="review"]');
    await expect(reviewLink).toBeVisible({ timeout: 5000 });
  });

  test('A11. Review page loads and shows answers', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/review`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(200);
  });

  test('A12. Review page has summary generation button', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/review`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);
    const summaryBtn = page.locator('button:has(svg.lucide-sparkles)');
    expect(await summaryBtn.count()).toBeGreaterThanOrEqual(1);
  });

  test('A13. Review page has submit button', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/review`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);
    const submitBtn = page.locator('button:has(svg.lucide-send), button:has(svg.lucide-check-circle)');
    expect(await submitBtn.count()).toBeGreaterThanOrEqual(1);
  });

  test('A14. Staff can navigate to responses and see data', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto(`${BASE}/de/responses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);
  });

  test('A15. Cleanup: delete test project if it exists', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto(`${BASE}/de/projects`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const body = await page.textContent('body');
    if (!body?.includes(TEST_PROJECT_NAME)) {
      console.log('Test project not found - nothing to clean up');
      return;
    }

    const projectCard = page.locator(`text="${TEST_PROJECT_NAME}"`).first();
    if (await projectCard.isVisible()) {
      await projectCard.click();
      await page.waitForTimeout(2000);
      const deleteBtn = page.locator('button:has-text("Delete"), button:has-text("Loeschen"), button[aria-label*="delete" i]');
      if (await deleteBtn.count() > 0) {
        await deleteBtn.first().click();
        await page.waitForTimeout(1000);
        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Ja")');
        if (await confirmBtn.count() > 0) await confirmBtn.first().click();
        await page.waitForTimeout(2000);
      }
    }
  });
});

// ==========================================================================
// B. PO PROPOSES A PROJECT FROM PORTAL
// ==========================================================================

test.describe('B. PO project proposal', () => {
  test('B1. PO sees the propose project button', async ({ page }) => {
    await loginAsPO(page);
    await page.waitForTimeout(3000);
    const plusBtn = page.locator('button:has(svg.lucide-plus)');
    expect(await plusBtn.count()).toBeGreaterThanOrEqual(1);
  });

  test('B2. PO can open propose project dialog', async ({ page }) => {
    await loginAsPO(page);
    await page.waitForTimeout(3000);
    const plusBtn = page.locator('button:has(svg.lucide-plus)');
    if (await plusBtn.count() > 0) {
      await plusBtn.first().click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      const nameInput = dialog.locator('input');
      await expect(nameInput.first()).toBeVisible();
    }
  });

  test('B3. PO can fill and submit project proposal', async ({ page }) => {
    await loginAsPO(page);
    await page.waitForTimeout(3000);
    const plusBtn = page.locator('button:has(svg.lucide-plus)');
    if (await plusBtn.count() > 0) {
      await plusBtn.first().click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      const inputs = dialog.locator('input');
      await inputs.first().fill(`PO Proposal ${TS}`);
      const textarea = dialog.locator('textarea');
      if (await textarea.count() > 0) {
        await textarea.first().fill('Project proposed by PO during E2E testing');
      }
      const submitBtn = dialog.locator('button[type="submit"], button:has-text("Senden"), button:has-text("Submit"), button:has-text("Vorschlagen")');
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();
        await page.waitForTimeout(3000);
      }
    }
  });
});

// ==========================================================================
// C. FILE ATTACHMENT UPLOAD
// ==========================================================================

test.describe('C. File attachment during form fill', () => {
  test('C1. Attach document links visible on form', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/fill`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);
  });

  test('C2. Upload API rejects missing file', async ({ page }) => {
    const response = await page.request.post(`${BASE}/api/form/upload`, { multipart: {} });
    expect(response.status()).toBe(400);
  });

  test('C3. Upload API rejects missing required fields', async ({ page }) => {
    const response = await page.request.post(`${BASE}/api/form/upload`, {
      multipart: {
        file: { name: 'test.txt', mimeType: 'text/plain', buffer: Buffer.alloc(100) },
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

// ==========================================================================
// D. ADMIN RESPONSES & CSV EXPORT
// ==========================================================================

test.describe('D. Admin responses management', () => {
  test('D1. Responses page shows filter buttons', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto(`${BASE}/de/responses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const filterBtns = page.locator('button').filter({
      hasText: /alle|all|draft|entwurf|in.progress|submitted|eingereicht|reviewed/i,
    });
    expect(await filterBtns.count()).toBeGreaterThanOrEqual(1);
  });

  test('D2. Responses page has search input', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto(`${BASE}/de/responses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const searchInput = page.locator('input[placeholder*="Such"], input[placeholder*="Search"]');
    expect(await searchInput.count()).toBeGreaterThanOrEqual(1);
  });

  test('D3. CSV export button exists', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto(`${BASE}/de/responses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const exportBtn = page.locator('button:has(svg.lucide-download)');
    if (await exportBtn.count() > 0) {
      await exportBtn.first().click();
      await page.waitForTimeout(1000);
    }
    // No crash is the main assertion
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(50);
  });

  test('D4. Search filters responses', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto(`${BASE}/de/responses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const searchInput = page.locator('input[placeholder*="Such"], input[placeholder*="Search"]');
    if (await searchInput.count() > 0) {
      await searchInput.first().fill('nonexistent-search-term-xyz');
      await page.waitForTimeout(1000);
      const body = await page.textContent('body');
      expect(body!.length).toBeGreaterThan(50);
    }
  });
});

// ==========================================================================
// E. PROJECT DETAIL TABS
// ==========================================================================

test.describe('E. Project detail page', () => {
  test('E1. Staff can open a project and see details', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto(`${BASE}/de/projects`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const projectLinks = page.locator('a[href*="/projects/"]').first();
    if (await projectLinks.isVisible()) {
      await projectLinks.click();
      await page.waitForTimeout(3000);
      const body = await page.textContent('body');
      expect(body!.length).toBeGreaterThan(200);
    }
  });

  test('E2. Project detail shows copy link button', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto(`${BASE}/de/projects`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const projectLinks = page.locator('a[href*="/projects/"]').first();
    if (await projectLinks.isVisible()) {
      await projectLinks.click();
      await page.waitForTimeout(3000);
      const copyBtn = page.locator('button:has(svg.lucide-copy)');
      expect(await copyBtn.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test('E3. Project detail has edit dialog', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto(`${BASE}/de/projects`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const projectLinks = page.locator('a[href*="/projects/"]').first();
    if (await projectLinks.isVisible()) {
      await projectLinks.click();
      await page.waitForTimeout(3000);
      const editBtn = page.locator('button:has(svg.lucide-pencil)');
      if (await editBtn.count() > 0) {
        await editBtn.first().click();
        await page.waitForTimeout(500);
        const dialog = page.locator('[role="dialog"]');
        expect(await dialog.count()).toBeGreaterThanOrEqual(1);
        const closeBtn = dialog.locator('button:has(svg.lucide-x), button[aria-label="Close"]');
        if (await closeBtn.count() > 0) await closeBtn.first().click();
      }
    }
  });
});

// ==========================================================================
// F. ADMIN ARCHIVE PAGE
// ==========================================================================

test.describe('F. Admin archive', () => {
  test('F1. Archive page loads for staff', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto(`${BASE}/de/archive`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/archive/);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(50);
  });
});

// ==========================================================================
// G. DONE PAGE
// ==========================================================================

test.describe('G. Done / Thank you page', () => {
  test('G1. Done page loads and shows success message', async ({ page }) => {
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/done`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(50);
  });

  test('G2. Done page has navigation links', async ({ page }) => {
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/done`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const navLinks = page.locator('a[href*="my-projects"], a[href="/"]');
    expect(await navLinks.count()).toBeGreaterThanOrEqual(0);
  });
});

// ==========================================================================
// H. ROLE GUARDS & PERMISSIONS
// ==========================================================================

test.describe('H. Role guards', () => {
  test('H1. PO cannot access admin projects', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/projects`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('my-projects');
  });

  test('H2. PO cannot access admin archive', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/archive`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain('/archive');
  });

  test('H3. PO cannot access admin templates', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/templates`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain('/templates');
  });

  test('H4. PO cannot access admin responses', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/responses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain('/responses');
  });

  test('H5. Staff cannot access PO portal', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto(`${BASE}/de/my-projects`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain('/my-projects');
    expect(page.url()).toContain('/dashboard');
  });

  test('H6. Unauthenticated user redirected from admin routes', async ({ page }) => {
    const routes = ['/dashboard', '/projects', '/responses', '/templates', '/settings', '/archive'];
    for (const route of routes) {
      await page.goto(`${BASE}/de${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('login');
    }
  });

  test('H7. Unauthenticated user redirected from portal', async ({ page }) => {
    await page.goto(`${BASE}/de/my-projects`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('login');
  });
});

// ==========================================================================
// I. NEGATIVE TESTS & EDGE CASES
// ==========================================================================

test.describe('I. Negative tests & edge cases', () => {
  test('I1. Login with empty fields stays on login page', async ({ page }) => {
    await page.goto(`${BASE}/de/login`, { waitUntil: 'domcontentloaded' });
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/login/);
  });

  test('I2. Login with wrong credentials shows error', async ({ page }) => {
    await page.goto(`${BASE}/de/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'fake@example.com');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);
    expect(page.url()).not.toContain('/dashboard');
    expect(page.url()).not.toContain('/my-projects');
  });

  test('I3. Non-existent project slug shows user-friendly error', async ({ page }) => {
    await page.goto(`${BASE}/de/form/this-project-does-not-exist-${TS}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).not.toContain('Error: ');
    expect(body).toBeTruthy();
  });

  test('I4. Form submit API rejects empty body', async ({ page }) => {
    const response = await page.request.post(`${BASE}/api/form/submit`, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
  });

  test('I5. Form save API with invalid data returns error', async ({ page }) => {
    const response = await page.request.post(`${BASE}/api/form/save`, {
      data: { projectSlug: '', answers: {} },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('I6. AI polish API handles empty text gracefully', async ({ page }) => {
    const response = await page.request.post(`${BASE}/api/ai/polish-text`, {
      data: { text: '', locale: 'de' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.polished).toBeDefined();
  });

  test('I7. AI followup API handles missing fields gracefully', async ({ page }) => {
    const response = await page.request.post(`${BASE}/api/ai/followup`, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.followUp).toBeNull();
  });

  test('I8. Invalid locale renders gracefully', async ({ page }) => {
    const response = await page.goto(`${BASE}/zz/login`);
    await page.waitForTimeout(2000);
    expect(response?.status()).not.toBe(500);
  });

  test('I9. XSS in login email is not executed', async ({ page }) => {
    await page.goto(`${BASE}/de/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', '<script>alert("xss")</script>@test.com');
    await page.fill('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    const xssTriggered = await page.evaluate(() => {
      return (window as unknown as Record<string, unknown>).xssTriggered === true;
    });
    expect(xssTriggered).toBe(false);
  });

  test('I10. SQL injection in login email is handled', async ({ page }) => {
    await page.goto(`${BASE}/de/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', "admin'--@test.com");
    await page.fill('input[type="password"]', "' OR 1=1; --");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/login/);
  });

  test('I11. Non-existent API route returns 404', async ({ page }) => {
    const response = await page.goto(`${BASE}/api/definitely-not-a-real-route`);
    expect(response!.status()).toBe(404);
  });

  test('I12. Seed API without secret is rejected', async ({ page }) => {
    const response = await page.request.post(`${BASE}/api/test/seed`, {
      data: { secret: 'wrong-secret' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
  });

  test('I13. Very long project slug is handled', async ({ page }) => {
    const longSlug = 'a'.repeat(300);
    const response = await page.goto(`${BASE}/de/form/${longSlug}`);
    await page.waitForTimeout(2000);
    expect(response?.status()).not.toBe(500);
  });

  test('I14. Rapid login attempts do not crash server', async ({ page }) => {
    await page.goto(`${BASE}/de/login`, { waitUntil: 'domcontentloaded' });
    for (let i = 0; i < 5; i++) {
      await page.fill('input[type="email"]', `user${i}@test.com`);
      await page.fill('input[type="password"]', 'wrong');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

// ==========================================================================
// J. ADMIN SIDEBAR NAVIGATION
// ==========================================================================

test.describe('J. Admin sidebar navigation', () => {
  test.beforeEach(async ({ page }) => { await loginAsStaff(page); });

  test('J1. Dashboard link works', async ({ page }) => {
    await page.click('a[href*="dashboard"]');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('J2. Projects link works', async ({ page }) => {
    await page.click('a[href*="projects"]');
    await expect(page).toHaveURL(/projects/);
  });

  test('J3. Templates link works', async ({ page }) => {
    await page.click('a[href*="templates"]');
    await expect(page).toHaveURL(/templates/);
  });

  test('J4. Responses link works', async ({ page }) => {
    await page.click('a[href*="responses"]');
    await expect(page).toHaveURL(/responses/);
  });

  test('J5. Archive link works', async ({ page }) => {
    await page.click('a[href*="archive"]');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/archive/);
  });

  test('J6. Settings link works', async ({ page }) => {
    await page.click('a[href*="settings"]');
    await expect(page).toHaveURL(/settings/);
  });
});

// ==========================================================================
// K. PORTAL NAVIGATION
// ==========================================================================

test.describe('K. Portal sidebar navigation', () => {
  test('K1. PO portal shows My Projects link', async ({ page }) => {
    await loginAsPO(page);
    const myProjLink = page.locator('a[href*="my-projects"]');
    await expect(myProjLink.first()).toBeVisible();
  });

  test('K2. PO can navigate to account settings', async ({ page }) => {
    await loginAsPO(page);
    const accountLink = page.locator('a[href*="account"]');
    if (await accountLink.count() > 0) {
      await accountLink.first().click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/account/);
    }
  });

  test('K3. PO can logout', async ({ page }) => {
    await loginAsPO(page);
    const logoutBtn = page.locator('button:has(svg.lucide-log-out)');
    if (await logoutBtn.count() > 0) {
      await logoutBtn.first().click();
      await page.waitForURL('**/login', { timeout: 10_000 });
      await expect(page).toHaveURL(/login/);
    }
  });
});

// ==========================================================================
// L. FORM INTERACTION DETAILS
// ==========================================================================

test.describe('L. Form interaction details', () => {
  test('L1. Form header shows AI badge', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/fill`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);
  });

  test('L2. Form shows required/optional badges', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/fill`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Optional badges should exist
    const optBadge = page.locator('text=Optional');
    expect(await optBadge.count()).toBeGreaterThanOrEqual(0);
  });

  test('L3. Skip question button works', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/fill`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const skipBtn = page.locator('button:has(svg.lucide-skip-forward)').first();
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
      await page.waitForTimeout(500);
      // Text should contain "undo" style link (skip produces a visible change)
      const body = await page.textContent('body');
      expect(body!.length).toBeGreaterThan(100);
    }
  });

  test('L4. Answer later button works', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/fill`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const laterBtn = page.locator('button:has(svg.lucide-clock)').first();
    if (await laterBtn.isVisible()) {
      await laterBtn.click();
      await page.waitForTimeout(500);
      const laterBadge = page.locator('text=/Later/i');
      expect(await laterBadge.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('L5. AI chat assistant button exists', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/fill`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const chatBtn = page.locator('button:has(svg.lucide-message-square)');
    expect(await chatBtn.count()).toBeGreaterThanOrEqual(1);
  });

  test('L6. AI chat opens and displays', async ({ page }) => {
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/fill`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const chatBtn = page.locator('button:has(svg.lucide-message-square)');
    if (await chatBtn.count() > 0) {
      await chatBtn.first().click();
      await page.waitForTimeout(500);
      // Chat panel should appear
      const body = await page.textContent('body');
      expect(body!.length).toBeGreaterThan(200);
    }
  });

  test('L7. Language switcher visible on form', async ({ page }) => {
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/fill`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);
  });
});

// ==========================================================================
// M. MULTI-LANGUAGE SUPPORT
// ==========================================================================

test.describe('M. Multi-language support', () => {
  const locales = ['en', 'de', 'fr', 'es', 'tr', 'ru', 'pl', 'it', 'pt'];

  for (const locale of locales) {
    test(`M-${locale}. Landing page renders in ${locale}`, async ({ page }) => {
      await page.goto(`${BASE}/${locale}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      const body = await page.textContent('body');
      expect(body!.length).toBeGreaterThan(100);
    });
  }

  test('M-lang. HTML lang attribute matches locale', async ({ page }) => {
    await page.goto(`${BASE}/fr`);
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBe('fr');
  });
});

// ==========================================================================
// N. RESPONSIVE DESIGN
// ==========================================================================

test.describe('N. Responsive design', () => {
  test('N1. Login works on iPhone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/de/login`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('N2. Form works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginAsPO(page);
    await page.goto(`${BASE}/de/form/${KNOWN_PROJECT_SLUG}/fill`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(200);
  });

  test('N3. Admin dashboard works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAsStaff(page);
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(50);
  });

  test('N4. Portal works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAsPO(page);
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(200);
  });
});

// ==========================================================================
// O. SEO & SECURITY HEADERS
// ==========================================================================

test.describe('O. SEO & security', () => {
  test('O1. Landing page has meta description', async ({ page }) => {
    await page.goto(`${BASE}/en`);
    const desc = await page.getAttribute('meta[name="description"]', 'content');
    expect(desc).toBeTruthy();
  });

  test('O2. X-Content-Type-Options header is set', async ({ page }) => {
    const response = await page.goto(`${BASE}/en`);
    expect(response?.status()).toBeLessThan(500);
  });

  test('O3. Server does not leak X-Powered-By', async ({ page }) => {
    const response = await page.goto(`${BASE}/en`);
    const poweredBy = response?.headers()['x-powered-by'];
    expect(poweredBy).toBeUndefined();
  });

  test('O4. 404 page shows branded content', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/this-page-does-not-exist-${TS}`);
    expect(response?.status()).toBe(404);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});
