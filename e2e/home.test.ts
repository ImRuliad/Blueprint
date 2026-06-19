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

test('sidebar is visible with Blueprint logo', async ({ page }) => {
	await page.goto('/');
	const logo = page.locator('.text-logo');
	await expect(logo).toContainText('Blueprint');
});

test('sidebar shows Connections section label', async ({ page }) => {
	await page.goto('/');
	const label = page.locator('.text-section-label');
	await expect(label).toContainText('Connections');
});

test('welcome page shows New Connection card', async ({ page }) => {
	await page.goto('/');
	const card = page.locator('.new-connection-card');
	await expect(card).toBeVisible();
});

test('status bar shows Ready', async ({ page }) => {
	await page.goto('/');
	const statusBar = page.locator('.status-bar');
	await expect(statusBar).toContainText('Ready');
});
