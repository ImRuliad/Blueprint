import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { queryHistory } from '$lib/server/db/schema';
import { errorResponse, ValidationError } from '$lib/server/errors';
import { eq, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const connectionId = url.searchParams.get('connectionId');

		if (!connectionId) {
			throw new ValidationError('connectionId query parameter is required');
		}

		const rows = db
			.select()
			.from(queryHistory)
			.where(eq(queryHistory.connectionId, connectionId))
			.orderBy(desc(queryHistory.executedAt))
			.limit(100)
			.all();

		return json({ data: rows });
	} catch (err) {
		return errorResponse(err);
	}
};
