import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { destroyPool, isConnected } from '$lib/server/drivers/pool';
import { errorResponse, ValidationError } from '$lib/server/errors';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const connectionId = body.connectionId as string | undefined;

		if (!connectionId) {
			throw new ValidationError('connectionId is required');
		}

		if (isConnected(connectionId)) {
			await destroyPool(connectionId);
		}

		return json({ data: { connectionId, connected: false } });
	} catch (err) {
		return errorResponse(err);
	}
};
