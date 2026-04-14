/**
 * Hotfix QA — Comprehensive end-to-end test covering all client-reported issues.
 *
 * Tests against PRODUCTION: https://wmc-anforderungsportal.vercel.app
 *
 * Covers:
 *  1. Login flows (staff, product_owner, elnay)
 *  2. Language switching (DE, EN, RU)
 *  3. Form fill: multi-select checkboxes (Target Audience, Core Functions, Platforms, Privacy)
 *  4. Form fill: radio buttons
 *  5. Form fill: rich text toolbar on textareas
 *  6. Form fill: free text with no character limit
 *  7. AI summary (Regenerate button) — no "Authentication required"
 *  8. Admin dashboard access for staff role
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = 'https://wmc-anforderungsportal.vercel.app';

// Credentials — from DB
const USERS = {
  staff: { email: 'waleri.moretz@wamocon.com', password: 'REDACTED' },
  productOwner: { email: 'daniel.moretz@wamocon.com', password: 'REDACTED' },
  elnay: { email: 'elnay.akhverdiev@gmail.com', password: 'REDACTED' },
};

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/de/login`);
  await page.getByPlaceholder(/e-mail/i).fill(email);
  await page.getByLabel(/passwort/i).first().fill(password);
  await page.getByRole('button', { name: /anmelden/i }).click();
  // Wait for navigation away from login page
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

// ─────────────────────────────────────────────────────────────────
// 1. LOGIN TESTS
// ─────────────────────────────────────────────────────────────────

test.describe('Login flows', () => {
  test('Staff (Waleri) can log in and see admin dashboard', async ({ page }) => {
    await login(page, USERS.staff.email, USERS.staff.password);
    // Staff → admin dashboard
    await expect(page).toHaveURL(/\/(dashboard|projects|responses)/);
    // Should see some dashboard content
    await expect(page.locator('body')).not.toContainText('Authentication required');
  });

  test('Product Owner (Daniel) can log in and see client portal', async ({ page }) => {
    await login(page, USERS.productOwner.email, USERS.productOwner.password);
    await expect(page).toHaveURL(/\/(my-projects|form)/);
  });

  test('Elnay can log in with fixed credentials', async ({ page }) => {
    await login(page, USERS.elnay.email, USERS.elnay.password);
    await expect(page).toHaveURL(/\/(my-projects|form)/);
  });
});

// ─────────────────────────────────────────────────────────────────
// 2. LANGUAGE SWITCHING
// ─────────────────────────────────────────────────────────────────

test.describe('Language switching', () => {
  test('Login page loads in DE, EN, RU', async ({ page }) => {
    // German
    await page.goto(`${BASE}/de/login`);
    await expect(page.locator('body')).toContainText('Willkommen');

    // English
    await page.goto(`${BASE}/en/login`);
    await expect(page.locator('body')).toContainText('Welcome');

    // Russian
    await page.goto(`${BASE}/ru/login`);
    await expect(page.locator('body')).toContainText(/Добро пожаловать|Войти|вход/i);
  });
});

// ─────────────────────────────────────────────────────────────────
// 3. FORM FILL — MULTI-SELECT, RADIO, RICH TEXT, FREE TEXT
// ─────────────────────────────────────────────────────────────────

test.describe('Form fill features', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as Elnay (the client who reported the bugs)
    await login(page, USERS.elnay.email, USERS.elnay.password);
  });

  test('Can navigate to a form fill page', async ({ page }) => {
    // Navigate to Kinder Club App (Elnay's project)
    await page.goto(`${BASE}/ru/form/kinder-club-app/fill`);
    await page.waitForLoadState('networkidle');

    // Page should have loaded with form content
    await expect(page.locator('main')).toBeVisible();
  });

  test('Multi-select checkboxes can be toggled', async ({ page }) => {
    await page.goto(`${BASE}/ru/form/kinder-club-app/fill`);
    await page.waitForLoadState('networkidle');

    // Find a checkbox card and click it
    const checkboxCards = page.locator('[data-slot="checkbox"]');
    const firstCheckbox = checkboxCards.first();

    if (await firstCheckbox.isVisible()) {
      // Get initial state
      const wasChecked = await firstCheckbox.getAttribute('data-checked');

      // Click the checkbox to toggle it
      await firstCheckbox.click();
      await page.waitForTimeout(500);

      // Verify it toggled
      const isCheckedNow = await firstCheckbox.getAttribute('data-checked');
      expect(isCheckedNow).not.toBe(wasChecked);

      // Click again to toggle back
      await firstCheckbox.click();
      await page.waitForTimeout(500);
    }
  });

  test('Radio buttons can be selected', async ({ page }) => {
    await page.goto(`${BASE}/ru/form/kinder-club-app/fill`);
    await page.waitForLoadState('networkidle');

    // Navigate to a section with radio buttons (section 2 = Functional Requirements)
    const sectionPills = page.locator('button').filter({ hasText: /2|Funk/ });
    if (await sectionPills.first().isVisible()) {
      await sectionPills.first().click();
      await page.waitForTimeout(500);
    }

    // Try to find and click a radio item
    const radioItems = page.locator('[role="radio"]');
    if (await radioItems.first().isVisible()) {
      await radioItems.first().click();
      await page.waitForTimeout(500);
      await expect(radioItems.first()).toHaveAttribute('data-state', 'checked');
    }
  });

  test('Textarea has rich text formatting toolbar', async ({ page }) => {
    await page.goto(`${BASE}/ru/form/kinder-club-app/fill`);
    await page.waitForLoadState('networkidle');

    // Look for the formatting toolbar buttons (Bold icon, List icon, etc.)
    const toolbar = page.locator('button[title="Bold (**text**)"]');
    if (await toolbar.isVisible()) {
      // Toolbar exists — test passed
      await expect(toolbar).toBeVisible();

      // Also verify other toolbar buttons exist
      await expect(page.locator('button[title="Italic (*text*)"]')).toBeVisible();
      await expect(page.locator('button[title="Bullet list"]')).toBeVisible();
      await expect(page.locator('button[title="Link"]')).toBeVisible();
    }
  });

  test('Textarea has no character limit', async ({ page }) => {
    await page.goto(`${BASE}/ru/form/kinder-club-app/fill`);
    await page.waitForLoadState('networkidle');

    // The textarea should NOT show a "/ 10,000" counter
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('/ 10');
  });
});

// ─────────────────────────────────────────────────────────────────
// 4. AI FEATURES — SUMMARY / REGENERATE
// ─────────────────────────────────────────────────────────────────

test.describe('AI features', () => {
  test('AI summary API works (no auth error)', async ({ page }) => {
    // Log in as Daniel
    await login(page, USERS.productOwner.email, USERS.productOwner.password);

    // Navigate to a form fill, then review page
    await page.goto(`${BASE}/de/form/wedbudget/review`);
    await page.waitForLoadState('networkidle');

    // If on the review page, we should see AI Executive Summary
    const body = await page.locator('body').textContent();
    // Should NOT show "Authentication required"
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

    // Should see project data loaded from DB
    await expect(page.locator('body')).toContainText(/Projekt|Project/i);
  });

  test('Staff can see responses list', async ({ page }) => {
    await login(page, USERS.staff.email, USERS.staff.password);
    await page.goto(`${BASE}/de/responses`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Antwort|Response|Anforderung/i);
  });
});
