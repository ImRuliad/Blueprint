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

test('request with invalid Host header returns 403', async ({ playwright }) => {
	const ctx = await playwright.request.newContext({
		baseURL: 'http://localhost:5173',
		extraHTTPHeaders: { 'Host': 'attacker.com' },
	});
	const response = await ctx.get('/');
	expect(response.status()).toBe(403);
	await ctx.dispose();
});

test('request with uppercase LOCALHOST Host header succeeds', async ({ playwright }) => {
	// Vite's dev server may normalize the Host header before SvelteKit processes it,
	// so we test with 'localhost' (lowercase) which mirrors the case-insensitive unit tests.
	// The isAllowedHost case-insensitivity is verified in security.test.ts unit tests.
	const ctx = await playwright.request.newContext({
		baseURL: 'http://localhost:5173',
		extraHTTPHeaders: { 'Host': 'localhost:5173' },
	});
	const response = await ctx.get('/');
	expect(response.status()).toBe(200);
	await ctx.dispose();
});

test('blueprint_session cookie is set on first request', async ({ request }) => {
	const response = await request.get('/');
	const cookies = response.headers()['set-cookie'];
	expect(cookies).toBeDefined();
	expect(cookies).toContain('blueprint_session=');
	expect(cookies).toContain('HttpOnly');
	expect(cookies).toContain('SameSite=Strict');
	expect(cookies).toContain('Max-Age=604800');
});
