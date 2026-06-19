import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { queryHistory } from '$lib/server/db/schema';
import { getPool } from '$lib/server/drivers/pool';
import { errorResponse, NotFoundError, ValidationError } from '$lib/server/errors';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const connectionId = body.connectionId as string | undefined;
		const sql = body.sql as string | undefined;

		if (!connectionId) {
			throw new ValidationError('connectionId is required');
		}
		if (!sql || !sql.trim()) {
			throw new ValidationError('sql is required');
		}

		const driver = getPool(connectionId);
		if (!driver) {
			throw new NotFoundError(`No active connection for "${connectionId}"`);
		}

		const start = Date.now();
		let result;
		let errorMessage: string | null = null;

		try {
			result = await driver.execute(sql);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			const durationMs = Date.now() - start;

			db.insert(queryHistory)
				.values({
					id: crypto.randomUUID(),
					connectionId,
					sql,
					executedAt: new Date().toISOString(),
					durationMs,
					rowCount: null,
					error: errorMessage,
				})
				.run();

			throw err;
		}

		const durationMs = Date.now() - start;

		db.insert(queryHistory)
			.values({
				id: crypto.randomUUID(),
				connectionId,
				sql,
				executedAt: new Date().toISOString(),
				durationMs,
				rowCount: result.rows.length,
				error: null,
			})
			.run();

		return json({
			data: {
				columns: result.columns,
				rows: result.rows,
				rowsAffected: result.rowsAffected,
				durationMs,
			},
		});
	} catch (err) {
		return errorResponse(err);
	}
};
