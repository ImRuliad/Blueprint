import { test, expect } from '@playwright/test';

test('response includes X-Frame-Options: DENY', async ({ request }) => {
	const response = await request.get('/');
	expect(response.headers()['x-frame-options']).toBe('DENY');
});

test('response includes X-Content-Type-Options: nosniff', async ({ request }) => {
	const response = await request.get('/');
	expect(response.headers()['x-content-type-options']).toBe('nosniff');
});

test('response includes Content-Security-Policy', async ({ request }) => {
	const response = await request.get('/');
	const csp = response.headers()['content-security-policy'];
	expect(csp).toBeDefined();
	expect(csp).toContain("frame-ancestors 'none'");
});

test('request with localhost Host header succeeds', async ({ request }) => {
	const response = await request.get('/');
	expect(response.status()).toBe(200);
});
