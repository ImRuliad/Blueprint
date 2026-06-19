import { test, expect } from '@playwright/test';

test('tab bar renders with empty state', async ({ page }) => {
	await page.goto('/');
	const tabBar = page.locator('.tab-bar');
	await expect(tabBar).toBeVisible();
	const emptyText = page.locator('.tab-bar-empty');
	await expect(emptyText).toContainText('No tabs open');
});

test('new tab button creates a tab', async ({ page }) => {
	await page.goto('/');
	const newTabBtn = page.locator('.tab-new');
	await expect(newTabBtn).toBeVisible();
	await newTabBtn.click();
	const tab = page.locator('.tab');
	await expect(tab).toBeVisible();
	await expect(tab).toContainText('New Query');
});

test('close tab removes it and shows empty state', async ({ page }) => {
	await page.goto('/');
	// Create a tab
	await page.locator('.tab-new').click();
	const tab = page.locator('.tab');
	await expect(tab).toBeVisible();
	// Hover to reveal close button and click it
	await tab.hover();
	const closeBtn = page.locator('.tab-close');
	await closeBtn.click();
	// Tab should be gone, empty state should appear
	await expect(page.locator('.tab')).toHaveCount(0);
	await expect(page.locator('.tab-bar-empty')).toContainText('No tabs open');
});

test('clicking a tab makes it active', async ({ page }) => {
	await page.goto('/');
	// Create two tabs
	await page.locator('.tab-new').click();
	await page.locator('.tab-new').click();
	const tabs = page.locator('.tab');
	await expect(tabs).toHaveCount(2);
	// Click first tab
	await tabs.first().click();
	await expect(tabs.first()).toHaveClass(/tab--active/);
});
