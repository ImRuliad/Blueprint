import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { connections } from '$lib/server/db/schema';
import { createPool, isConnected } from '$lib/server/drivers/pool';
import { PostgresDriver } from '$lib/server/drivers/postgres';
import { MySQLDriver } from '$lib/server/drivers/mysql';
import { SQLiteDriver } from '$lib/server/drivers/sqlite';
import { MongoDriver } from '$lib/server/drivers/mongodb';
import { errorResponse, NotFoundError, ValidationError } from '$lib/server/errors';
import type { DatabaseDriver, EngineType } from '$lib/server/drivers/types';
import { eq } from 'drizzle-orm';

function createDriver(engine: EngineType, config: Record<string, unknown>): DatabaseDriver {
	switch (engine) {
		case 'postgresql':
			return new PostgresDriver({
				host: config.host as string,
				port: config.port as number,
				database: config.database as string,
				user: config.username as string,
			});
		case 'mysql':
			return new MySQLDriver({
				host: config.host as string,
				port: config.port as number,
				database: config.database as string,
				user: config.username as string,
			});
		case 'sqlite':
			return new SQLiteDriver({
				filePath: config.sqlitePath as string,
			});
		case 'mongodb':
			return new MongoDriver({
				uri: config.connectionString as string,
				database: (config.database as string) ?? 'test',
			});
	}
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const connectionId = body.connectionId as string | undefined;
		const password = body.password as string | undefined;
		const testOnly = body.testOnly === true;

		if (!connectionId) {
			throw new ValidationError('connectionId is required');
		}

		const row = db.select().from(connections).where(eq(connections.id, connectionId)).get();
		if (!row) {
			throw new NotFoundError(`Connection "${connectionId}" not found`);
		}

		const driver = createDriver(row.engine as EngineType, {
			host: row.host,
			port: row.port,
			database: row.database,
			username: row.username,
			connectionString: row.connectionString,
			sqlitePath: row.sqlitePath,
		});

		if (testOnly) {
			const result = await driver.testConnection(password);
			return json({ data: result });
		}

		// Establish live connection
		await driver.connect(password);
		await createPool(connectionId, driver);

		return json({ data: { connectionId, connected: true } });
	} catch (err) {
		return errorResponse(err);
	}
};
