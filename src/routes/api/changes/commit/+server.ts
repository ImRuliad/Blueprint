import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPool } from '$lib/server/drivers/pool';
import { generateSQL } from '$lib/server/mutations/generator';
import { analyzeQuery } from '$lib/server/safety/analyzer';
import { errorResponse, NotFoundError, ValidationError } from '$lib/server/errors';

interface CommitChange {
	operation: 'insert' | 'update' | 'delete';
	tableName: string;
	pk: Record<string, unknown>;
	column?: string;
	newValue?: unknown;
	row?: Record<string, unknown>;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const connectionId = body.connectionId as string | undefined;
		const changes = body.changes as CommitChange[] | undefined;

		if (!connectionId) {
			throw new ValidationError('connectionId is required');
		}
		if (!changes || !Array.isArray(changes) || changes.length === 0) {
			throw new ValidationError('changes must be a non-empty array');
		}

		const driver = getPool(connectionId);
		if (!driver) {
			throw new NotFoundError(`No active connection for "${connectionId}"`);
		}

		const engine = driver.engine;

		// Generate all SQL statements first
		const statements = changes.map((change) => generateSQL(change, engine));

		// Safety check each statement
		for (const stmt of statements) {
			const risk = analyzeQuery(stmt.sql);
			if (risk && risk.riskType === 'destructive') {
				throw new ValidationError(`Safety check blocked destructive statement: ${stmt.sql}`);
			}
		}

		// Execute all in a transaction
		await driver.beginTransaction();
		try {
			for (let i = 0; i < statements.length; i++) {
				const { sql, params } = statements[i];
				try {
					await driver.execute(sql, params);
				} catch (err) {
					// Include which statement failed
					const message = err instanceof Error ? err.message : String(err);
					throw new Error(`Statement ${i + 1} failed: ${message}\nSQL: ${sql}`);
				}
			}
			await driver.commitTransaction();
		} catch (err) {
			await driver.rollbackTransaction();
			throw err;
		}

		return json({
			data: {
				committed: statements.length,
			},
		});
	} catch (err) {
		return errorResponse(err);
	}
};
