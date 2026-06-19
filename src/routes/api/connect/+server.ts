import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { connections, sshConfigs } from '$lib/server/db/schema';
import { createPool, isConnected } from '$lib/server/drivers/pool';
import { PostgresDriver } from '$lib/server/drivers/postgres';
import { MySQLDriver } from '$lib/server/drivers/mysql';
import { SQLiteDriver } from '$lib/server/drivers/sqlite';
import { MongoDriver } from '$lib/server/drivers/mongodb';
import { errorResponse, NotFoundError, ValidationError } from '$lib/server/errors';
import type { DatabaseDriver, EngineType } from '$lib/server/drivers/types';
import { createTunnel } from '$lib/server/ssh/tunnel';
import type { SSHTunnelConfig } from '$lib/server/ssh/tunnel';
import { readFileSync, existsSync } from 'fs';
import { eq } from 'drizzle-orm';

function createDriver(
	engine: EngineType,
	config: Record<string, unknown>,
	tunnelPort?: number
): DatabaseDriver {
	// When tunneled, connect to 127.0.0.1:localPort instead of the real host/port
	const host = tunnelPort != null ? '127.0.0.1' : (config.host as string);
	const port = tunnelPort != null ? tunnelPort : (config.port as number);

	switch (engine) {
		case 'postgresql':
			return new PostgresDriver({
				host,
				port,
				database: config.database as string,
				user: config.username as string,
			});
		case 'mysql':
			return new MySQLDriver({
				host,
				port,
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

async function buildSSHTunnelConfig(sshConfigRow: typeof sshConfigs.$inferSelect): Promise<SSHTunnelConfig> {
	const config: SSHTunnelConfig = {
		host: sshConfigRow.host,
		port: sshConfigRow.port ?? 22,
		username: sshConfigRow.username,
		authMethod: sshConfigRow.authMethod as SSHTunnelConfig['authMethod'],
		useAgent: sshConfigRow.useAgent ?? false,
	};

	if (sshConfigRow.authMethod === 'privateKey' && sshConfigRow.privateKeyPath) {
		if (!existsSync(sshConfigRow.privateKeyPath)) {
			throw new Error(`SSH private key not found: ${sshConfigRow.privateKeyPath}`);
		}
		config.privateKey = readFileSync(sshConfigRow.privateKeyPath, 'utf-8');
	}

	return config;
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

		const connConfig = {
			host: row.host,
			port: row.port,
			database: row.database,
			username: row.username,
			connectionString: row.connectionString,
			sqlitePath: row.sqlitePath,
		};

		let tunnel: { localPort: number; close(): Promise<void> } | undefined;

		// Establish SSH tunnel if configured
		if (row.sshConfigId) {
			const sshRow = db.select().from(sshConfigs).where(eq(sshConfigs.id, row.sshConfigId)).get();
			if (!sshRow) {
				throw new NotFoundError(`SSH config "${row.sshConfigId}" not found`);
			}

			const sshTunnelConfig = await buildSSHTunnelConfig(sshRow);
			const remoteHost = row.host ?? 'localhost';
			const remotePort = row.port ?? 5432;
			const tunnelKey = `conn:${connectionId}`;

			tunnel = await createTunnel(sshTunnelConfig, remoteHost, remotePort, tunnelKey);
		}

		const driver = createDriver(
			row.engine as EngineType,
			connConfig,
			tunnel?.localPort
		);

		if (testOnly) {
			const result = await driver.testConnection(password);
			if (tunnel) await tunnel.close();
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
