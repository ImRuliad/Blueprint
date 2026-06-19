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

test('blueprint_session cookie is set on first request', async ({ request }) => {
	const response = await request.get('/');
	const cookies = response.headers()['set-cookie'];
	expect(cookies).toBeDefined();
	expect(cookies).toContain('blueprint_session=');
	expect(cookies).toContain('HttpOnly');
	expect(cookies).toContain('SameSite=Strict');
	expect(cookies).toContain('Max-Age=604800');
});
