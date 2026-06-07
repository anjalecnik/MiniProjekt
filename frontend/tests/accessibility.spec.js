import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Navigacija je zdaj v headerju — selektor posodobljen
const NAV_BTN = label => `.header-nav-btn[aria-label="${label}"]`;

// Na mobilnem je nav horizontalno scrollabilen — JS scroll v overflow containerju
const clickNav = async (page, label) => {
  await page.evaluate(lbl => {
    const btn = document.querySelector(`.header-nav-btn[aria-label="${lbl}"]`);
    btn?.scrollIntoView({ behavior: 'instant', inline: 'nearest', block: 'nearest' });
  }, label);
  await page.locator(NAV_BTN(label)).click({ force: true });
};

test.describe('Dostopnost — WCAG 2.2 AA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-header');
  });

  test('skip link je prisoten in viden ob fokusu', async ({ page }) => {
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeAttached();
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    expect(await skipLink.getAttribute('href')).toBe('#main-content');
  });

  test('glavna stran — ni WCAG kršitev (dnevnik simptomov)', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('navigacijski gumbi imajo aria-current in aria-label', async ({ page }) => {
    const navButtons = page.locator('.header-nav-btn');
    const count = await navButtons.count();
    expect(count).toBe(5);

    const activeBtn = page.locator('.header-nav-btn[aria-current="page"]');
    await expect(activeBtn).toHaveCount(1);

    for (let i = 0; i < count; i++) {
      const label = await navButtons.nth(i).getAttribute('aria-label');
      expect(label).toBeTruthy();
    }
  });

  test('stran zdravil — ni WCAG kršitev', async ({ page }) => {
    await clickNav(page, 'Zdravila');
    await page.waitForSelector('.medication-list');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('stran obiskov — ni WCAG kršitev', async ({ page }) => {
    await clickNav(page, 'Obiski');
    await page.waitForSelector('.health-visits');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('stran grafov — ni WCAG kršitev', async ({ page }) => {
    await clickNav(page, 'Grafi');
    await page.waitForSelector('.trend-graphs');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('nastavitve — ni WCAG kršitev', async ({ page }) => {
    await clickNav(page, 'Nastavitve');
    await page.waitForSelector('.settings');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('vse strani so dostopne s tipkovnico brez miške', async ({ page }) => {
    const diaryBtn = page.locator(NAV_BTN('Dnevnik'));
    await diaryBtn.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.symptom-diary')).toBeVisible();
  });

  test('obrazci imajo pravilno prirejene labele', async ({ page }) => {
    await expect(page.locator('label[for="symptom-input"]')).toBeVisible();
    await expect(page.locator('#symptom-input')).toBeVisible();
  });

  test('live region za objave navigacije je prisoten', async ({ page }) => {
    const liveRegion = page.locator('[role="status"][aria-live="polite"]').first();
    await expect(liveRegion).toBeAttached();
    await clickNav(page, 'Zdravila');
    await expect(liveRegion).toContainText('Seznam zdravil');
  });

  test('statusni indikator ima role=status in aria-live', async ({ page }) => {
    const statusEl = page.locator('.online-status[role="status"]');
    await expect(statusEl).toBeAttached();
    expect(await statusEl.getAttribute('aria-live')).toBe('polite');
  });

  test('canvas graf ima dostopen opis', async ({ page }) => {
    await clickNav(page, 'Grafi');
    await page.waitForSelector('canvas.trend-canvas');
    const canvas = page.locator('canvas.trend-canvas');
    expect(await canvas.getAttribute('role')).toBe('img');
    expect(await canvas.getAttribute('aria-label')).toBeTruthy();
  });

  test('visok kontrast ne pokvari dostopnosti', async ({ page }) => {
    await clickNav(page, 'Nastavitve');
    await page.waitForSelector('.settings');
    const contrastBtn = page.locator('[aria-labelledby="contrast-label"]');
    await contrastBtn.click({ force: true });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('mobilni prikaz — navigacija je vidna in dostopna', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const nav = page.locator('.header-nav');
    await expect(nav).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
