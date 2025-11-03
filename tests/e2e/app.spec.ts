import { test, expect } from '@playwright/test';

test.describe('MED-AID SAARTHI E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/MED-AID SAARTHI/i);
  });

  test('complete user flow: signup → ABHA link → view records', async ({ page }) => {
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

    // Step 3: Link ABHA number
    await page.click('text=Link ABHA');
    
    // Fill Aadhaar number (test mode)
    await page.fill('input[name="aadhaar"]', '123456789012');
    
    // Consent checkbox
    await page.click('input[type="checkbox"]');
    
    // Submit
    await page.click('button:has-text("Continue")');

    // Wait for OTP screen or success
    await page.waitForSelector('text=OTP', { timeout: 5000 }).catch(() => {
      // In sandbox mode, might skip OTP
    });

    // Step 4: Navigate to health records
    await page.click('text=Health Records');
    await expect(page).toHaveURL(/.*health-records/);

    // Verify health records page loaded
    await expect(page.locator('h1')).toContainText(/health records/i);
  });

  test('should work offline (village mode)', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    // Navigate to village mode
    await page.goto('/village-mode');

    // Should show offline-capable features
    await expect(page.locator('text=Offline Mode')).toBeVisible();
    
    // Can queue patient visit
    await page.click('button:has-text("New Visit")');
    await page.fill('input[name="patientName"]', 'Village Patient');
    await page.fill('textarea[name="symptoms"]', 'Fever, Cough');
    await page.click('button:has-text("Save Offline")');

    // Should show success message
    await expect(page.locator('text=Visit queued')).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Should auto-sync
    await page.waitForSelector('text=Synced', { timeout: 10000 });
  });

  test('should handle unauthorized access', async ({ page }) => {
    // Try to access protected route without login
    await page.goto('/health-records');

    // Should redirect to auth
    await expect(page).toHaveURL(/.*auth/);
  });

  test('PWA should be installable', async ({ page }) => {
    // Check for manifest
    const manifest = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link ? link.getAttribute('href') : null;
    });

    expect(manifest).toBe('/manifest.json');

    // Check for service worker
    const swRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });

    expect(swRegistered).toBe(true);
  });

  test('should display appointment booking', async ({ page }) => {
    // Login first (assuming test user exists)
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to appointments
    await page.click('text=Book Appointment');

    // Select doctor
    await page.click('[data-testid="doctor-card"]:first-child');

    // Select date
    await page.click('button:has-text("Next Available")');

    // Confirm
    await page.click('button:has-text("Confirm Booking")');

    // Should show success
    await expect(page.locator('text=Appointment booked')).toBeVisible();
  });
});
