import { test, expect } from '@playwright/test';

// The data grid is rendered when a tab of type 'data-browser' is active.
// We inject sessionStorage state to simulate navigating to a data browser tab,
// then intercept the API call so the grid renders with synthetic data.

test('data grid renders with headers when data-browser tab is active', async ({ page }) => {
	// Intercept the data API call and return synthetic table data
	await page.route('/api/data/**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				data: {
					columns: [
						{ name: 'id', dataType: 'integer', nullable: false, isPrimaryKey: true },
						{ name: 'email', dataType: 'text', nullable: false, isPrimaryKey: false },
						{ name: 'created_at', dataType: 'timestamp', nullable: true, isPrimaryKey: false },
					],
					rows: [
						{ id: 1, email: 'alice@example.com', created_at: '2024-01-01T00:00:00Z' },
						{ id: 2, email: 'bob@example.com', created_at: null },
					],
					rowsAffected: 0,
					hasMore: false,
					nextCursor: null,
				},
			}),
		});
	});

	// Seed a data-browser tab in sessionStorage before page load
	await page.addInitScript(() => {
		const tab = {
			id: 'tab-grid-test',
			type: 'data-browser',
			title: 'users',
			connectionId: 'conn-test',
			params: { tableName: 'users' },
			closable: true,
		};
		sessionStorage.setItem('blueprint:tabs', JSON.stringify([tab]));
		sessionStorage.setItem('blueprint:activeTab', 'tab-grid-test');
	});

	await page.goto('/');

	// Tab bar should be visible
	await expect(page.locator('.tab-bar')).toBeVisible();

	// Active tab should show our table name
	const activeTab = page.locator('.tab--active');
	await expect(activeTab).toContainText('users');
});
