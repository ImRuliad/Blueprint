import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { connections, sshConfigs, tlsConfigs } from '$lib/server/db/schema';
import { createPool, isConnected } from '$lib/server/drivers/pool';
import { SQLiteDriver } from '$lib/server/drivers/sqlite';
import { errorResponse, NotFoundError, ValidationError } from '$lib/server/errors';
import type { DatabaseDriver, EngineType } from '$lib/server/drivers/types';
import { buildPostgresSSL, buildMySQLSSL, buildMongoTLS } from '$lib/server/tls/config';
import type { TLSConfig } from '$lib/server/tls/config';
import { createTunnel } from '$lib/server/ssh/tunnel';
import type { SSHTunnelConfig } from '$lib/server/ssh/tunnel';
import { readFileSync, existsSync } from 'fs';
import { eq } from 'drizzle-orm';

async function createDriver(
	engine: EngineType,
	config: Record<string, unknown>,
	tlsConfig: TLSConfig | null,
	tunnelPort?: number
): Promise<DatabaseDriver> {
	const host = tunnelPort != null ? '127.0.0.1' : (config.host as string);
	const port = tunnelPort != null ? tunnelPort : (config.port as number);

	switch (engine) {
		case 'postgresql': {
			const { PostgresDriver } = await import('$lib/server/drivers/postgres');
			return new PostgresDriver({
				host,
				port,
				database: config.database as string,
				user: config.username as string,
				ssl: tlsConfig ? buildPostgresSSL(tlsConfig) : undefined,
			});
		}
		case 'mysql': {
			const { MySQLDriver } = await import('$lib/server/drivers/mysql');
			return new MySQLDriver({
				host,
				port,
				database: config.database as string,
				user: config.username as string,
				ssl: tlsConfig ? buildMySQLSSL(tlsConfig) : undefined,
			});
		}
		case 'sqlite':
			return new SQLiteDriver({
				filePath: config.sqlitePath as string,
			});
		case 'mongodb': {
			const { MongoDriver } = await import('$lib/server/drivers/mongodb');
			const tlsOpts = tlsConfig ? buildMongoTLS(tlsConfig) : {};
			return new MongoDriver({
				uri: config.connectionString as string,
				database: (config.database as string) ?? 'test',
				...tlsOpts,
			});
		}
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

		// Load TLS config if referenced
		let tlsConfig: TLSConfig | null = null;
		if (row.tlsConfigId) {
			const tlsRow = db.select().from(tlsConfigs).where(eq(tlsConfigs.id, row.tlsConfigId)).get();
			if (tlsRow) {
				tlsConfig = {
					mode: tlsRow.mode as TLSConfig['mode'],
					caCertPath: tlsRow.caCertPath,
					clientCertPath: tlsRow.clientCertPath,
					clientKeyPath: tlsRow.clientKeyPath,
					serverName: tlsRow.serverName,
				};
			}
		}

		// Establish SSH tunnel if configured
		let tunnel: { localPort: number; close(): Promise<void> } | undefined;
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

		const driver = await createDriver(
			row.engine as EngineType,
			connConfig,
			tlsConfig,
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
