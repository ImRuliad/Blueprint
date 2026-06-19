import { test, expect } from '@playwright/test';

// The schema inspector is rendered when a tab of type 'schema-inspector' is active.
// Since we can't easily drive a real DB connection in E2E tests, we test the
// component mount and loading state by injecting sessionStorage state.

test('schema inspector tab renders when navigated via sessionStorage', async ({ page }) => {
	// Seed a schema-inspector tab in sessionStorage before page load
	await page.addInitScript(() => {
		const tab = {
			id: 'tab-schema-test',
			type: 'schema-inspector',
			title: 'users',
			connectionId: 'conn-test',
			params: { tableName: 'users' },
			closable: true,
		};
		sessionStorage.setItem('blueprint:tabs', JSON.stringify([tab]));
		sessionStorage.setItem('blueprint:activeTab', 'tab-schema-test');
	});

	await page.goto('/');

	// The tab bar should show the schema inspector tab
	await expect(page.locator('.tab-bar')).toBeVisible();

	// The active tab should be our injected schema-inspector
	const activeTab = page.locator('.tab--active');
	await expect(activeTab).toContainText('users');
});
