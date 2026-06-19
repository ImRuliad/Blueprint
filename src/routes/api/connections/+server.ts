import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { connections } from '$lib/server/db/schema';
import { isConnected } from '$lib/server/drivers/pool';
import { errorResponse, ValidationError } from '$lib/server/errors';
import type { EngineType } from '$lib/server/drivers/types';

const VALID_ENGINES: EngineType[] = ['postgresql', 'mysql', 'sqlite', 'mongodb'];

export const GET: RequestHandler = async () => {
	try {
		const rows = db.select().from(connections).all();
		const data = rows.map((row) => ({
			...row,
			connected: isConnected(row.id),
		}));
		return json({ data });
	} catch (err) {
		return errorResponse(err);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		if (!body.name || typeof body.name !== 'string') {
			throw new ValidationError('Connection name is required');
		}
		if (!body.engine || !VALID_ENGINES.includes(body.engine)) {
			throw new ValidationError(`Engine must be one of: ${VALID_ENGINES.join(', ')}`);
		}

		const engine = body.engine as EngineType;

		// Validate engine-specific required fields
		if (engine === 'postgresql' || engine === 'mysql') {
			if (!body.host) throw new ValidationError('Host is required for this engine');
			if (!body.port) throw new ValidationError('Port is required for this engine');
			if (!body.database) throw new ValidationError('Database name is required for this engine');
		} else if (engine === 'sqlite') {
			if (!body.sqlitePath) throw new ValidationError('File path is required for SQLite');
		} else if (engine === 'mongodb') {
			if (!body.connectionString) throw new ValidationError('Connection string is required for MongoDB');
		}

		const now = new Date().toISOString();
		const id = crypto.randomUUID();

		const row = {
			id,
			name: body.name as string,
			engine,
			host: (body.host as string) ?? null,
			port: body.port != null ? Number(body.port) : null,
			database: (body.database as string) ?? null,
			username: (body.username as string) ?? null,
			connectionString: (body.connectionString as string) ?? null,
			sqlitePath: (body.sqlitePath as string) ?? null,
			sshConfigId: null,
			tlsConfigId: null,
			groupName: (body.groupName as string) ?? null,
			color: (body.color as string) ?? null,
			sortOrder: body.sortOrder != null ? Number(body.sortOrder) : 0,
			createdAt: now,
			updatedAt: now,
		};

		db.insert(connections).values(row).run();

		return json({ data: { ...row, connected: false } }, { status: 201 });
	} catch (err) {
		return errorResponse(err);
	}
};
