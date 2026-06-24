import '$lib/server/db';
import { isAllowedHost } from '$lib/server/security';
import { randomUUID } from 'crypto';
import type { Handle } from '@sveltejs/kit';

const SESSION_COOKIE_NAME = 'blueprint_session';

export const handle: Handle = async ({ event, resolve }) => {
	const host = event.request.headers.get('host');
	if (!host || !isAllowedHost(host)) {
		return new Response('Forbidden: Invalid host header', {
			status: 403,
			headers: { 'Content-Type': 'text/plain' },
		});
	}

	let sessionId = event.cookies.get(SESSION_COOKIE_NAME);
	if (!sessionId) {
		sessionId = randomUUID();
		event.cookies.set(SESSION_COOKIE_NAME, sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: false,
			maxAge: 60 * 60 * 24 * 7, // 7 days
		});
	}
	event.locals.sessionId = sessionId;

	const response = await resolve(event);

	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'no-referrer');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	return response;
};
