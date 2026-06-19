import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { changeBufferSnapshots } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { errorResponse, ValidationError } from '$lib/server/errors';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const connectionId = url.searchParams.get('connectionId');
		if (!connectionId) {
			throw new ValidationError('connectionId query param is required');
		}

		const snapshots = db
			.select()
			.from(changeBufferSnapshots)
			.where(eq(changeBufferSnapshots.connectionId, connectionId))
			.all();

		return json({ data: snapshots });
	} catch (err) {
		return errorResponse(err);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const connectionId = body.connectionId as string | undefined;
		const sessionId = body.sessionId as string | undefined;
		const tableName = body.tableName as string | undefined;
		const changes = body.changes;

		if (!connectionId) {
			throw new ValidationError('connectionId is required');
		}
		if (!sessionId) {
			throw new ValidationError('sessionId is required');
		}
		if (!tableName) {
			throw new ValidationError('tableName is required');
		}

		// Upsert: delete existing snapshot for this connection+session+table, then insert
		db.delete(changeBufferSnapshots)
			.where(eq(changeBufferSnapshots.connectionId, connectionId))
			.run();

		db.insert(changeBufferSnapshots)
			.values({
				id: crypto.randomUUID(),
				connectionId,
				sessionId,
				tableName,
				changes: changes ?? [],
				savedAt: new Date().toISOString(),
			})
			.run();

		return json({ data: { saved: true } });
	} catch (err) {
		return errorResponse(err);
	}
};
