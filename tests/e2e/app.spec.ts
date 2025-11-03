import { test, expect } from '@playwright/test';

test.describe('MED-AID SAARTHI E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set a longer timeout for page loads
    page.setDefaultTimeout(10000);
    await page.goto('/');
  });

  test('should load homepage and display title', async ({ page }) => {
    await expect(page).toHaveTitle(/MED-AID SAARTHI/i);
    
    // Check for main navigation elements
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display auth page', async ({ page }) => {
    // Navigate to auth page
    await page.goto('/auth');
    
    // Should show login/signup form
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('PWA should have manifest and service worker', async ({ page }) => {
    // Check for manifest
    const manifest = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link ? link.getAttribute('href') : null;
    });

    expect(manifest).toBe('/manifest.json');

    // Check for service worker support
    const swSupported = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });

    expect(swSupported).toBe(true);
  });

  test('should handle navigation to different routes', async ({ page }) => {
    // Test basic routing works
    await page.goto('/');
    await expect(page).toHaveURL('/');
    
    await page.goto('/auth');
    await expect(page).toHaveURL('/auth');
  });

  test.skip('complete user flow: signup → ABHA link → view records', async ({ page }) => {
    // Skipped in CI - requires full Supabase setup
    // Step 1: Navigate to signup
    await page.click('text=Sign Up');
    await expect(page).toHaveURL(/.*auth/);

    // Step 2: Fill signup form
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="fullName"]', 'Test User');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test.skip('should work offline (village mode)', async ({ page, context }) => {
    // Skipped in CI - requires specific offline setup
    // Go offline
    await context.setOffline(true);

    // Navigate to village mode
    await page.goto('/village-mode');

    // Should show offline-capable features
    await expect(page.locator('text=Offline Mode')).toBeVisible();
  });

  test.skip('should display appointment booking', async ({ page }) => {
    // Skipped in CI - requires authenticated user
    // Login first (assuming test user exists)
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
  });
});
