import { test, expect } from '@playwright/test';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env variable: ${name}`);
  return value;
}

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const CLIENT_EMAIL = requireEnv('E2E_CLIENT_EMAIL');
const CLIENT_PASS = requireEnv('E2E_CLIENT_PASS');

const DEMO_PROJECT_NAME = 'Waleri Product Discovery Workshop';
const DEMO_PROJECT_SLUG = 'waleri-product-discovery-workshop';

const breakpoints = [
  { name: 'mobile-320', width: 320, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 960 },
];

async function collectOverflow(page: Parameters<typeof test>[0]['page']) {
  return page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const offenders: Array<{ tag: string; classes: string; text: string; right: number; left: number; width: number }> = [];

    const ignored = ['orb', 'ticker-track', 'ticker-item'];

    for (const element of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const cls = element.getAttribute('class') ?? '';
      if (ignored.some((token) => cls.includes(token))) continue;
      if (element.closest('[aria-hidden="true"]')) continue;

      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;

      const rightOverflow = rect.right - viewportWidth;
      const leftOverflow = 0 - rect.left;
      if (rightOverflow > 1 || leftOverflow > 1) {
        offenders.push({
          tag: element.tagName.toLowerCase(),
          classes: element.getAttribute('class') || '',
          text: (element.textContent || '').trim().slice(0, 120),
          right: Number(rect.right.toFixed(2)),
          left: Number(rect.left.toFixed(2)),
          width: Number(rect.width.toFixed(2)),
        });
      }

      if (offenders.length >= 8) break;
    }

    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      offenders,
    };
  });
}

test.describe('Landing page QA', () => {
  for (const breakpoint of breakpoints) {
    test(`landing renders without horizontal overflow at ${breakpoint.name}`, async ({ page }) => {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      await page.goto(`${BASE}/landing`, { waitUntil: 'networkidle' });

      await expect(page.locator('h1')).toContainText(/requirements|anforderungen/i);
      await expect(page.locator('text=Anforderungs Manager').first()).toBeVisible();

      const overflow = await collectOverflow(page);
      // bodyScrollWidth is intentionally excluded: the ticker-track marquee makes body wider
      // by design; overflow-x:clip on html/body hides it visually. We only check the
      // documentElement (scrollable container) doesn't overflow.
      expect.soft(overflow.scrollWidth, JSON.stringify(overflow, null, 2)).toBeLessThanOrEqual(overflow.clientWidth + 1);
      expect(overflow.offenders, JSON.stringify(overflow, null, 2)).toEqual([]);
    });
  }

  test('landing language switch and primary CTA work', async ({ page }) => {
    await page.goto(`${BASE}/landing`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'EN' }).first().click();
    await expect(page.locator('h1')).toContainText('Collect requirements');

    const cta = page.getByRole('link', { name: /View demo|Demo ansehen/i }).first();
    await cta.click();
    await expect(page.locator('#demo')).toBeVisible();
    // Wait for smooth scroll to settle (up to 2 s)
    await page.waitForFunction(() => window.scrollY > 300, { timeout: 2000 });
  });
});

test.describe('Client project visibility', () => {
  test('Maanik can see the assigned Waleri project and continue the form', async ({ page }) => {
    await page.goto(`${BASE}/de/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', CLIENT_EMAIL);
    await page.fill('input[type="password"]', CLIENT_PASS);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/my-projects', { timeout: 20000 });
    await expect(page.locator(`text=${DEMO_PROJECT_NAME}`)).toBeVisible();
    await expect(page.locator('text=18%').first()).toBeVisible();

    await page.locator(`a[href="/de/form/${DEMO_PROJECT_SLUG}/fill"]`).click();
    await expect(page).toHaveURL(new RegExp(`/de/form/${DEMO_PROJECT_SLUG}/fill`));
  });
});