import { test, expect } from '@playwright/test';

test('dev server starts and page loads', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle(/./);
});

test('page contains Blueprint heading', async ({ page }) => {
	await page.goto('/');
	const heading = page.locator('h1');
	await expect(heading).toContainText('Blueprint');
});
