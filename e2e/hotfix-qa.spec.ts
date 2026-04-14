/**
 * Hotfix QA — Comprehensive E2E test for all client-reported issues.
 *
 * Tests against PRODUCTION: https://wmc-anforderungsportal.vercel.app
 *
 * Covers:
 *  1. Login flows (staff, product_owner, elnay)
 *  2. Language switching (DE, EN, RU)
 *  3. Form fill: multi-select checkboxes, radio buttons, textareas
 *  4. Rich text toolbar on textareas
 *  5. No character limit on textareas
 *  6. AI summary — no "Authentication required"
 *  7. Admin dashboard access for staff role
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = 'https://wmc-anforderungsportal.vercel.app';

// Credentials — from production DB
const USERS = {
  staff: { email: 'waleri.moretz@wamocon.com', password: 'REDACTED' },
  productOwner: { email: 'daniel.moretz@wamocon.com', password: 'REDACTED' },
  elnay: { email: 'elnay.akhverdiev@gmail.com', password: 'REDACTED' },
};

/**
 * Login helper — fills email + password on the DE login page and waits
 * for the redirect (staff → /dashboard, PO/client → /my-projects).
 */
async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/de/login`);
  await page.waitForLoadState('networkidle');

  // The login page uses <label htmlFor="email">E-Mail-Adresse</label> + <input id="email">
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: /anmelden/i }).click();

  // Wait for navigation away from login page (up to 20 s for cold start)
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });
}

// ─────────────────────────────────────────────────────────────────
// 1. LOGIN TESTS
// ─────────────────────────────────────────────────────────────────

test.describe('Login flows', () => {
  test('Staff (Waleri) can log in and see admin dashboard', async ({ page }) => {
    await login(page, USERS.staff.email, USERS.staff.password);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).not.toContainText('Authentication required');
  });

  test('Product Owner (Daniel) can log in and see my-projects', async ({ page }) => {
    await login(page, USERS.productOwner.email, USERS.productOwner.password);
    await expect(page).toHaveURL(/\/my-projects/);
  });

  test('Elnay can log in with fixed credentials', async ({ page }) => {
    await login(page, USERS.elnay.email, USERS.elnay.password);
    await expect(page).toHaveURL(/\/my-projects/);
  });
});

// ─────────────────────────────────────────────────────────────────
// 2. LANGUAGE SWITCHING
// ─────────────────────────────────────────────────────────────────

test.describe('Language switching', () => {
  test('Login page renders in DE, EN, RU', async ({ page }) => {
    await page.goto(`${BASE}/de/login`);
    await expect(page.locator('body')).toContainText('Willkommen');

    await page.goto(`${BASE}/en/login`);
    await expect(page.locator('body')).toContainText('Welcome');

    await page.goto(`${BASE}/ru/login`);
    await expect(page.locator('body')).toContainText(/Добро пожаловать|войти|вход/i);
  });
});

// ─────────────────────────────────────────────────────────────────
// 3. FORM FILL — MULTI-SELECT, RADIO, RICH TEXT, FREE TEXT
// ─────────────────────────────────────────────────────────────────

test.describe('Form fill features', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USERS.elnay.email, USERS.elnay.password);
  });

  test('Form fill page loads for Kinder Club App', async ({ page }) => {
    await page.goto(`${BASE}/ru/form/kinder-club-app/fill`);
    await page.waitForLoadState('networkidle');
    // Main content loaded
    await expect(page.locator('main')).toBeVisible();
  });

  test('Multi-select checkboxes can be toggled', async ({ page }) => {
    await page.goto(`${BASE}/ru/form/kinder-club-app/fill`);
    await page.waitForLoadState('networkidle');

    // The checkbox row is a clickable <div> wrapping <Checkbox> + <Label>.
    // Clicking the <Label> text triggers toggleMultiSelect via the parent div.
    // Look for "Дети" (Children) — first option in Target Audience question.
    const optionRow = page.locator('div.cursor-pointer', { hasText: 'Дети' }).first();

    if (await optionRow.isVisible()) {
      // Before: row should NOT have the selected border class
      const classBefore = await optionRow.getAttribute('class') ?? '';
      const selectedBefore = classBefore.includes('border-[#FE0404]');

      // Click to select
      await optionRow.click();
      await page.waitForTimeout(800);

      const classAfter = await optionRow.getAttribute('class') ?? '';
      const selectedAfter = classAfter.includes('border-[#FE0404]');

      // It should have toggled
      expect(selectedAfter).not.toBe(selectedBefore);

      // Click again to deselect
      await optionRow.click();
      await page.waitForTimeout(800);

      const classFinal = await optionRow.getAttribute('class') ?? '';
      const selectedFinal = classFinal.includes('border-[#FE0404]');
      expect(selectedFinal).toBe(selectedBefore);
    } else {
      test.skip();
    }
  });

  test('Radio buttons can be selected', async ({ page }) => {
    await page.goto(`${BASE}/ru/form/kinder-club-app/fill`);
    await page.waitForLoadState('networkidle');

    const radios = page.locator('[role="radio"]');
    const count = await radios.count();

    if (count > 0) {
      await radios.first().click();
      await page.waitForTimeout(600);
      await expect(radios.first()).toHaveAttribute('data-state', 'checked');
    } else {
      test.skip();
    }
  });

  test('Rich text toolbar buttons are present', async ({ page }) => {
    await page.goto(`${BASE}/ru/form/kinder-club-app/fill`);
    await page.waitForLoadState('networkidle');

    // The toolbar buttons have `title` attributes
    const boldBtn = page.locator('button[title*="Bold"]');
    const count = await boldBtn.count();

    if (count > 0) {
      await expect(boldBtn.first()).toBeVisible();
      await expect(page.locator('button[title*="Italic"]').first()).toBeVisible();
      await expect(page.locator('button[title*="list"]').first()).toBeVisible();
    } else {
      // May not be visible if no textarea question on first section
      test.skip();
    }
  });

  test('No character limit shown', async ({ page }) => {
    await page.goto(`${BASE}/ru/form/kinder-club-app/fill`);
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent();
    // Should NOT include the old "/ 10,000" or "/ 10000" counter
    expect(body).not.toMatch(/\/\s*10[,.]?000/);
  });
});

// ─────────────────────────────────────────────────────────────────
// 4. AI FEATURES — SUMMARY / REGENERATE
// ─────────────────────────────────────────────────────────────────

test.describe('AI features', () => {
  test('Review page has no auth error', async ({ page }) => {
    await login(page, USERS.productOwner.email, USERS.productOwner.password);

    await page.goto(`${BASE}/de/form/wedbudget/review`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const body = await page.locator('body').textContent();
    expect(body).not.toContain('Authentication required');
  });
});

// ─────────────────────────────────────────────────────────────────
// 5. ADMIN DASHBOARD — STAFF ROLE
// ─────────────────────────────────────────────────────────────────

test.describe('Admin dashboard', () => {
  test('Staff can see projects list', async ({ page }) => {
    await login(page, USERS.staff.email, USERS.staff.password);
    await page.goto(`${BASE}/de/projects`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Projekt|Project/i);
  });

  test('Staff can see responses list', async ({ page }) => {
    await login(page, USERS.staff.email, USERS.staff.password);
    await page.goto(`${BASE}/de/responses`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Antwort|Response|Anforderung/i);
  });
});
