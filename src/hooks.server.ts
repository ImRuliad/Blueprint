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

	return resolve(event);
};
