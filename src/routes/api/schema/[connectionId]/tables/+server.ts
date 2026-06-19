import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPool } from '$lib/server/drivers/pool';
import { errorResponse, NotFoundError } from '$lib/server/errors';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const driver = getPool(params.connectionId);
		if (!driver) {
			throw new NotFoundError(`No active connection for "${params.connectionId}"`);
		}

		const [tables, views] = await Promise.all([driver.getTables(), driver.getViews()]);

		return json({ data: { tables, views } });
	} catch (err) {
		return errorResponse(err);
	}
};
