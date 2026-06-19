import '$lib/server/db';
import { isAllowedHost } from '$lib/server/security';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const host = event.request.headers.get('host');
	if (!host || !isAllowedHost(host)) {
		return new Response('Forbidden: Invalid host header', {
			status: 403,
			headers: { 'Content-Type': 'text/plain' },
		});
	}

	const response = await resolve(event);

	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set(
		'Content-Security-Policy',
		"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'none';"
	);

	return response;
};
